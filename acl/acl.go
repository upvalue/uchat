package acl

import (
	"context"
	"fmt"
	"log/slog"

	"uchat/chat"
	"uchat/config"
	"uchat/graph"
	"uchat/identity"

	"github.com/99designs/gqlgen/graphql"
)

const allRooms = "*"

type Subject struct {
	Machine string
	Tags    []string
}

type Policy struct {
	FallbackRooms []string
	Rules         []Rule
}

type Rule struct {
	Machines []string
	Tags     []string
	Rooms    []string
}

func NewPolicy(cfg config.ACLConfig) Policy {
	rules := make([]Rule, len(cfg.Rules))
	for i, rule := range cfg.Rules {
		rules[i] = Rule{
			Machines: append([]string(nil), rule.Machines...),
			Tags:     append([]string(nil), rule.Tags...),
			Rooms:    append([]string(nil), rule.Rooms...),
		}
	}
	return Policy{
		FallbackRooms: append([]string(nil), cfg.FallbackRooms...),
		Rules:         rules,
	}
}

func SubjectFromContext(ctx context.Context) Subject {
	machine, _ := identity.FromContext(ctx)
	if machine == nil {
		return Subject{Machine: "local"}
	}
	return Subject{
		Machine: machine.Name,
		Tags:    append([]string(nil), machine.Tags...),
	}
}

func (p Policy) Enabled() bool {
	return len(p.Rules) > 0 || len(p.FallbackRooms) > 0
}

func (p Policy) CanAccessRoom(subject Subject, room string) bool {
	if !p.Enabled() {
		return true
	}
	for _, rule := range p.Rules {
		if !rule.matchesSubject(subject) {
			continue
		}
		if roomsContain(rule.Rooms, room) {
			return true
		}
	}
	return roomsContain(p.FallbackRooms, room)
}

func (p Policy) FilterRooms(subject Subject, rooms []*graph.Room) []*graph.Room {
	if !p.Enabled() {
		return rooms
	}
	filtered := make([]*graph.Room, 0, len(rooms))
	for _, room := range rooms {
		if room == nil {
			continue
		}
		folder := ""
		if room.Folder != nil {
			folder = *room.Folder
		}
		if p.CanAccessRoom(subject, chat.RoomPath(folder, room.Name)) {
			filtered = append(filtered, room)
		}
	}
	return filtered
}

func (p Policy) FilterUnreadCounts(subject Subject, counts []*chat.UnreadCount) []*chat.UnreadCount {
	if !p.Enabled() {
		return counts
	}
	filtered := make([]*chat.UnreadCount, 0, len(counts))
	for _, count := range counts {
		if count != nil && p.CanAccessRoom(subject, count.Room) {
			filtered = append(filtered, count)
		}
	}
	return filtered
}

func (p Policy) FilterMessages(ctx context.Context, subject Subject, messages <-chan *chat.Message) <-chan *chat.Message {
	if !p.Enabled() {
		return messages
	}
	filtered := make(chan *chat.Message, 64)
	go func() {
		defer close(filtered)
		for {
			select {
			case msg, ok := <-messages:
				if !ok {
					return
				}
				if msg != nil && p.CanAccessRoom(subject, msg.Room) {
					select {
					case filtered <- msg:
					case <-ctx.Done():
						return
					}
				}
			case <-ctx.Done():
				return
			}
		}
	}()
	return filtered
}

func Middleware(policy Policy, store *chat.Store) graphql.FieldMiddleware {
	return func(ctx context.Context, next graphql.Resolver) (any, error) {
		fc := graphql.GetFieldContext(ctx)
		if fc == nil {
			return next(ctx)
		}

		subject := SubjectFromContext(ctx)
		switch fc.Object + "." + fc.Field.Name {
		case "Query.rooms":
			res, err := next(ctx)
			if err != nil {
				return nil, err
			}
			rooms, ok := res.([]*graph.Room)
			if !ok {
				return res, nil
			}
			return policy.FilterRooms(subject, rooms), nil

		case "Query.messages", "Mutation.sendMessage", "Mutation.markRead":
			room, _ := fc.Args["room"].(string)
			if err := policy.requireRoom(subject, room); err != nil {
				logDenied(fc, subject, room)
				return nil, err
			}
			return next(ctx)

		case "Mutation.createRoom", "Mutation.updateRoom", "Mutation.deleteRoom":
			room := roomFromNameFolderArgs(fc.Args)
			if err := policy.requireRoom(subject, room); err != nil {
				logDenied(fc, subject, room)
				return nil, err
			}
			return next(ctx)

		case "Mutation.editMessage":
			if store == nil {
				return next(ctx)
			}
			id, _ := fc.Args["id"].(string)
			msg, err := store.GetMessage(ctx, id)
			if err != nil {
				return nil, err
			}
			if err := policy.requireRoom(subject, msg.Room); err != nil {
				logDenied(fc, subject, msg.Room)
				return nil, err
			}
			return next(ctx)

		case "Query.unreadCounts":
			res, err := next(ctx)
			if err != nil {
				return nil, err
			}
			counts, ok := res.([]*chat.UnreadCount)
			if !ok {
				return res, nil
			}
			return policy.FilterUnreadCounts(subject, counts), nil

		case "Subscription.messageAdded":
			if room, ok := fc.Args["room"].(*string); ok && room != nil {
				if err := policy.requireRoom(subject, *room); err != nil {
					logDenied(fc, subject, *room)
					return nil, err
				}
			}
			res, err := next(ctx)
			if err != nil {
				return nil, err
			}
			messages, ok := res.(<-chan *chat.Message)
			if !ok {
				return res, nil
			}
			return policy.FilterMessages(ctx, subject, messages), nil
		}

		return next(ctx)
	}
}

func (p Policy) requireRoom(subject Subject, room string) error {
	if room == "" || p.CanAccessRoom(subject, room) {
		return nil
	}
	return fmt.Errorf("access denied to room %q", room)
}

func (r Rule) matchesSubject(subject Subject) bool {
	if stringIn(r.Machines, subject.Machine) {
		return true
	}
	for _, tag := range subject.Tags {
		if stringIn(r.Tags, tag) {
			return true
		}
	}
	return false
}

func roomsContain(rooms []string, room string) bool {
	for _, allowed := range rooms {
		if allowed == allRooms || allowed == room {
			return true
		}
	}
	return false
}

func stringIn(items []string, target string) bool {
	for _, item := range items {
		if item == target {
			return true
		}
	}
	return false
}

func roomFromNameFolderArgs(args map[string]any) string {
	name, _ := args["name"].(string)
	folder := ""
	if folderArg, ok := args["folder"].(*string); ok && folderArg != nil {
		folder = *folderArg
	}
	return chat.RoomPath(folder, name)
}

func logDenied(fc *graphql.FieldContext, subject Subject, room string) {
	slog.Info("acl denied",
		"field", fc.Object+"."+fc.Field.Name,
		"room", room,
		"machine", subject.Machine,
		"tags", subject.Tags,
	)
}
