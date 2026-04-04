package chat

import (
	"context"
	"fmt"
	"testing"
	"time"
)

func newTestStore(t *testing.T) *Store {
	t.Helper()
	s, err := NewStore(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

func TestSendAndGetMessages(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	msg := NewMessage("alice", TextBody("hello"), "")
	msg.Room = "general"
	if err := s.Send(ctx, "general", msg); err != nil {
		t.Fatalf("Send: %v", err)
	}

	msgs, err := s.GetMessages(ctx, "general")
	if err != nil {
		t.Fatalf("GetMessages: %v", err)
	}
	if len(msgs) != 1 {
		t.Fatalf("expected 1 message, got %d", len(msgs))
	}
	if msgs[0].ID != msg.ID {
		t.Errorf("expected id %s, got %s", msg.ID, msgs[0].ID)
	}
	if msgs[0].User != "alice" {
		t.Errorf("expected user alice, got %s", msgs[0].User)
	}
	if msgs[0].Body.Text() != "hello" {
		t.Errorf("expected body hello, got %s", msgs[0].Body.Text())
	}
}

func TestSendAndGetMessagesWithFolder(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	roomPath := "projects/2026-03-09"
	msg := NewMessage("alice", TextBody("hello"), "")
	msg.Room = roomPath
	if err := s.Send(ctx, roomPath, msg); err != nil {
		t.Fatalf("Send: %v", err)
	}

	msgs, err := s.GetMessages(ctx, roomPath)
	if err != nil {
		t.Fatalf("GetMessages: %v", err)
	}
	if len(msgs) != 1 {
		t.Fatalf("expected 1 message, got %d", len(msgs))
	}
	if msgs[0].Room != roomPath {
		t.Errorf("expected room %s, got %s", roomPath, msgs[0].Room)
	}

	// Verify the room was auto-created with correct folder/name split
	rooms, err := s.ListRooms(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(rooms) != 1 {
		t.Fatalf("expected 1 room, got %d", len(rooms))
	}
	if rooms[0].Folder != "projects" {
		t.Errorf("expected folder 'projects', got %q", rooms[0].Folder)
	}
	if rooms[0].Name != "2026-03-09" {
		t.Errorf("expected name '2026-03-09', got %q", rooms[0].Name)
	}
}

func TestDuplicateNamesInDifferentFolders(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	// Create two rooms with the same name in different folders
	_, err := s.CreateRoom(ctx, "2026-03-09", "logs", nil)
	if err != nil {
		t.Fatal(err)
	}
	_, err = s.CreateRoom(ctx, "2026-03-09", "alerts", nil)
	if err != nil {
		t.Fatal(err)
	}

	// Send messages to each
	m1 := NewMessage("bot", TextBody("log entry"), "api")
	m1.Room = "logs/2026-03-09"
	if err := s.Send(ctx, "logs/2026-03-09", m1); err != nil {
		t.Fatal(err)
	}
	m2 := NewMessage("bot", TextBody("alert!"), "api")
	m2.Room = "alerts/2026-03-09"
	if err := s.Send(ctx, "alerts/2026-03-09", m2); err != nil {
		t.Fatal(err)
	}

	// Messages are isolated by path
	logMsgs, _ := s.GetMessages(ctx, "logs/2026-03-09")
	alertMsgs, _ := s.GetMessages(ctx, "alerts/2026-03-09")
	if len(logMsgs) != 1 || logMsgs[0].Body.Text() != "log entry" {
		t.Errorf("unexpected log messages: %+v", logMsgs)
	}
	if len(alertMsgs) != 1 || alertMsgs[0].Body.Text() != "alert!" {
		t.Errorf("unexpected alert messages: %+v", alertMsgs)
	}
}

func TestGetMessagesEmpty(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	msgs, err := s.GetMessages(ctx, "empty-room")
	if err != nil {
		t.Fatalf("GetMessages: %v", err)
	}
	if len(msgs) != 0 {
		t.Fatalf("expected 0 messages, got %d", len(msgs))
	}
}

func TestGetMessage(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	msg := NewMessage("bob", TextBody("hi"), "")
	msg.Room = "dev"
	if err := s.Send(ctx, "dev", msg); err != nil {
		t.Fatal(err)
	}

	got, err := s.GetMessage(ctx, msg.ID)
	if err != nil {
		t.Fatalf("GetMessage: %v", err)
	}
	if got.ID != msg.ID {
		t.Errorf("expected id %s, got %s", msg.ID, got.ID)
	}
	if got.Room != "dev" {
		t.Errorf("expected room dev, got %s", got.Room)
	}
}

func TestGetMessageNotFound(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	_, err := s.GetMessage(ctx, "msg_nonexistent")
	if err == nil {
		t.Fatal("expected error for missing message")
	}
}

func TestMessageOrdering(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	base := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	for i, text := range []string{"first", "second", "third"} {
		msg := Message{
			ID:        "msg_order_" + text,
			Room:      "general",
			User:      "alice",
			Body:      TextBody(text),
			Timestamp: Timestamp{base.Add(time.Duration(i) * time.Second)},
		}
		if err := s.Send(ctx, "general", msg); err != nil {
			t.Fatal(err)
		}
	}

	msgs, err := s.GetMessages(ctx, "general")
	if err != nil {
		t.Fatal(err)
	}
	if len(msgs) != 3 {
		t.Fatalf("expected 3 messages, got %d", len(msgs))
	}
	expected := []string{"first", "second", "third"}
	for i, msg := range msgs {
		if msg.Body.Text() != expected[i] {
			t.Errorf("message %d: expected %s, got %s", i, expected[i], msg.Body.Text())
		}
	}
}

func TestMessagesIsolatedByRoom(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	m1 := NewMessage("alice", TextBody("in general"), "")
	m1.Room = "general"
	m2 := NewMessage("bob", TextBody("in dev"), "")
	m2.Room = "dev"

	if err := s.Send(ctx, "general", m1); err != nil {
		t.Fatal(err)
	}
	if err := s.Send(ctx, "dev", m2); err != nil {
		t.Fatal(err)
	}

	msgs, err := s.GetMessages(ctx, "general")
	if err != nil {
		t.Fatal(err)
	}
	if len(msgs) != 1 {
		t.Fatalf("expected 1 message in general, got %d", len(msgs))
	}
	if msgs[0].Body.Text() != "in general" {
		t.Errorf("wrong message in general: %s", msgs[0].Body.Text())
	}
}

func TestListRooms(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	// No rooms initially
	rooms, err := s.ListRooms(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(rooms) != 0 {
		t.Fatalf("expected 0 rooms, got %d", len(rooms))
	}

	// Add messages in two rooms — Send auto-creates them
	m1 := NewMessage("alice", TextBody("a"), "")
	m1.Room = "alpha"
	m2 := NewMessage("bob", TextBody("b"), "")
	m2.Room = "beta"
	m3 := NewMessage("alice", TextBody("c"), "")
	m3.Room = "alpha" // duplicate room

	for _, m := range []Message{m1, m2, m3} {
		if err := s.Send(ctx, m.Room, m); err != nil {
			t.Fatal(err)
		}
	}

	rooms, err = s.ListRooms(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(rooms) != 2 {
		t.Fatalf("expected 2 rooms, got %d", len(rooms))
	}
	// Ordered by position DESC (newest first), then name
	if rooms[0].Name != "beta" || rooms[1].Name != "alpha" {
		t.Errorf("expected [beta alpha], got [%s %s]", rooms[0].Name, rooms[1].Name)
	}
}

func TestCreateRoom(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	room, err := s.CreateRoom(ctx, "general", "", nil)
	if err != nil {
		t.Fatalf("CreateRoom: %v", err)
	}
	if room.Name != "general" {
		t.Errorf("expected name general, got %s", room.Name)
	}
	if room.Position != 0 {
		t.Errorf("expected position 0, got %d", room.Position)
	}

	// Second room gets position 1
	room2, err := s.CreateRoom(ctx, "random", "", nil)
	if err != nil {
		t.Fatalf("CreateRoom: %v", err)
	}
	if room2.Position != 1 {
		t.Errorf("expected position 1, got %d", room2.Position)
	}

	// Listed in position DESC order (newest first)
	rooms, err := s.ListRooms(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(rooms) != 2 {
		t.Fatalf("expected 2 rooms, got %d", len(rooms))
	}
	if rooms[0].Name != "random" || rooms[1].Name != "general" {
		t.Errorf("expected [random general], got [%s %s]", rooms[0].Name, rooms[1].Name)
	}
}

func TestCreateRoomDuplicate(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	first, err := s.CreateRoom(ctx, "general", "", nil)
	if err != nil {
		t.Fatal(err)
	}
	second, err := s.CreateRoom(ctx, "general", "", nil)
	if err != nil {
		t.Fatal("expected upsert to succeed:", err)
	}
	if second.Name != first.Name || second.CreatedAt != first.CreatedAt {
		t.Fatalf("expected same room back, got %+v vs %+v", first, second)
	}
}

func TestCreateRoomWithFolder(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	room, err := s.CreateRoom(ctx, "my project", "projects", nil)
	if err != nil {
		t.Fatalf("CreateRoom: %v", err)
	}
	if room.Name != "my project" {
		t.Errorf("expected name 'my project', got %s", room.Name)
	}
	if room.Folder != "projects" {
		t.Errorf("expected folder 'projects', got %q", room.Folder)
	}
	if room.Path() != "projects/my project" {
		t.Errorf("expected path 'projects/my project', got %q", room.Path())
	}

	rooms, err := s.ListRooms(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(rooms) != 1 {
		t.Fatalf("expected 1 room, got %d", len(rooms))
	}
	if rooms[0].Folder != "projects" {
		t.Errorf("expected folder 'projects', got %q", rooms[0].Folder)
	}
}

func TestCreateRoomSameNameDifferentFolders(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	_, err := s.CreateRoom(ctx, "2026-03-09", "logs", nil)
	if err != nil {
		t.Fatal(err)
	}
	_, err = s.CreateRoom(ctx, "2026-03-09", "alerts", nil)
	if err != nil {
		t.Fatal(err)
	}

	rooms, err := s.ListRooms(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(rooms) != 2 {
		t.Fatalf("expected 2 rooms, got %d", len(rooms))
	}
}

func TestCreateRoomWithSpacesInName(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	room, err := s.CreateRoom(ctx, "my cool room", "", nil)
	if err != nil {
		t.Fatalf("CreateRoom: %v", err)
	}
	if room.Name != "my cool room" {
		t.Errorf("expected name 'my cool room', got %s", room.Name)
	}
}

func TestSendAutoCreatesRoom(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	msg := NewMessage("alice", TextBody("hello"), "")
	msg.Room = "auto-created"
	if err := s.Send(ctx, "auto-created", msg); err != nil {
		t.Fatalf("Send: %v", err)
	}

	rooms, err := s.ListRooms(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(rooms) != 1 {
		t.Fatalf("expected 1 room, got %d", len(rooms))
	}
	if rooms[0].Name != "auto-created" {
		t.Errorf("expected auto-created, got %s", rooms[0].Name)
	}
}

func TestSendAutoCreatesRoomWithFolder(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	msg := NewMessage("bot", TextBody("hello"), "api")
	msg.Room = "logs/2026-03-09"
	if err := s.Send(ctx, "logs/2026-03-09", msg); err != nil {
		t.Fatalf("Send: %v", err)
	}

	rooms, err := s.ListRooms(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(rooms) != 1 {
		t.Fatalf("expected 1 room, got %d", len(rooms))
	}
	if rooms[0].Folder != "logs" || rooms[0].Name != "2026-03-09" {
		t.Errorf("expected logs/2026-03-09, got %s/%s", rooms[0].Folder, rooms[0].Name)
	}
}

func TestSendToExistingRoomNoDouble(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	// Explicitly create, then send — should not duplicate
	if _, err := s.CreateRoom(ctx, "general", "", nil); err != nil {
		t.Fatal(err)
	}

	msg := NewMessage("alice", TextBody("hello"), "")
	msg.Room = "general"
	if err := s.Send(ctx, "general", msg); err != nil {
		t.Fatalf("Send: %v", err)
	}

	rooms, err := s.ListRooms(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(rooms) != 1 {
		t.Fatalf("expected 1 room, got %d", len(rooms))
	}
}

func TestEditMessage(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	msg := NewMessage("alice", TextBody("original"), "")
	msg.Room = "general"
	if err := s.Send(ctx, "general", msg); err != nil {
		t.Fatal(err)
	}

	// Initial revision should be 1
	got, err := s.GetMessage(ctx, msg.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Revision != 1 {
		t.Errorf("expected initial revision 1, got %d", got.Revision)
	}

	// First edit bumps to revision 2
	if err := s.EditMessage(ctx, msg.ID, TextBody("edited"), nil); err != nil {
		t.Fatalf("EditMessage: %v", err)
	}

	got, err = s.GetMessage(ctx, msg.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Body.Text() != "edited" {
		t.Errorf("expected edited body, got %s", got.Body.Text())
	}
	if got.Revision != 2 {
		t.Errorf("expected revision 2 after first edit, got %d", got.Revision)
	}

	// Second edit bumps to revision 3
	if err := s.EditMessage(ctx, msg.ID, TextBody("edited again"), nil); err != nil {
		t.Fatalf("EditMessage: %v", err)
	}

	got, err = s.GetMessage(ctx, msg.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Body.Text() != "edited again" {
		t.Errorf("expected 'edited again', got %s", got.Body.Text())
	}
	if got.Revision != 3 {
		t.Errorf("expected revision 3 after second edit, got %d", got.Revision)
	}
}

func TestEditMessageNotFound(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	err := s.EditMessage(ctx, "msg_nonexistent", TextBody("nope"), nil)
	if err == nil {
		t.Fatal("expected error for missing message")
	}
}

func TestSendWithStreaming(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	now := Timestamp{time.Now().UTC()}
	msg := NewMessage("bot", TextBody("streaming..."), "bot")
	msg.Room = "general"
	msg.Streaming = &now

	if err := s.Send(ctx, "general", msg); err != nil {
		t.Fatalf("Send: %v", err)
	}

	got, err := s.GetMessage(ctx, msg.ID)
	if err != nil {
		t.Fatalf("GetMessage: %v", err)
	}
	if got.Streaming == nil {
		t.Fatal("expected streaming to be set, got nil")
	}
	if got.Streaming.UTC().Format(timestampFormat) != now.UTC().Format(timestampFormat) {
		t.Errorf("streaming mismatch: expected %s, got %s",
			now.UTC().Format(timestampFormat), got.Streaming.UTC().Format(timestampFormat))
	}
}

func TestEditMessageClearsStreaming(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	now := Timestamp{time.Now().UTC()}
	msg := NewMessage("bot", TextBody("streaming..."), "bot")
	msg.Room = "general"
	msg.Streaming = &now

	if err := s.Send(ctx, "general", msg); err != nil {
		t.Fatal(err)
	}

	// Edit without streaming clears it
	if err := s.EditMessage(ctx, msg.ID, TextBody("done"), nil); err != nil {
		t.Fatalf("EditMessage: %v", err)
	}

	got, err := s.GetMessage(ctx, msg.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Streaming != nil {
		t.Errorf("expected streaming to be nil after edit, got %v", got.Streaming)
	}
	if got.Body.Text() != "done" {
		t.Errorf("expected body 'done', got %s", got.Body.Text())
	}
}

func TestEditMessageSetsStreaming(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	msg := NewMessage("bot", TextBody("hello"), "bot")
	msg.Room = "general"

	if err := s.Send(ctx, "general", msg); err != nil {
		t.Fatal(err)
	}

	// Edit with streaming set
	now := Timestamp{time.Now().UTC()}
	if err := s.EditMessage(ctx, msg.ID, TextBody("streaming..."), &now); err != nil {
		t.Fatalf("EditMessage: %v", err)
	}

	got, err := s.GetMessage(ctx, msg.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Streaming == nil {
		t.Fatal("expected streaming to be set, got nil")
	}
}

func TestMarkReadAndUnreadCounts(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	base := time.Date(2025, 6, 1, 12, 0, 0, 0, time.UTC)
	var msgs []Message
	for i := 0; i < 3; i++ {
		m := Message{
			ID:        fmt.Sprintf("msg_unread_%d", i),
			Room:      "general",
			User:      "bot",
			Body:      TextBody(fmt.Sprintf("msg %d", i)),
			Timestamp: Timestamp{base.Add(time.Duration(i) * time.Second)},
		}
		if err := s.Send(ctx, "general", m); err != nil {
			t.Fatal(err)
		}
		msgs = append(msgs, m)
	}

	// Before marking anything read, alice has 3 unread
	counts, err := s.GetUnreadCounts(ctx, "alice")
	if err != nil {
		t.Fatal(err)
	}
	if len(counts) != 1 || counts[0].Room != "general" || counts[0].Count != 3 {
		t.Fatalf("expected [{general 3}], got %+v", counts)
	}

	// Mark first message as read — 2 remain unread
	if err := s.MarkRead(ctx, "general", "alice", msgs[0].ID); err != nil {
		t.Fatal(err)
	}
	counts, err = s.GetUnreadCounts(ctx, "alice")
	if err != nil {
		t.Fatal(err)
	}
	if len(counts) != 1 || counts[0].Count != 2 {
		t.Fatalf("expected 2 unread, got %+v", counts)
	}

	// Mark last message as read — 0 remain
	if err := s.MarkRead(ctx, "general", "alice", msgs[2].ID); err != nil {
		t.Fatal(err)
	}
	counts, err = s.GetUnreadCounts(ctx, "alice")
	if err != nil {
		t.Fatal(err)
	}
	if len(counts) != 0 {
		t.Fatalf("expected 0 unread rooms, got %+v", counts)
	}
}

func TestUnreadCountsMultipleRooms(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	m1 := NewMessage("bot", TextBody("a"), "")
	m1.Room = "alpha"
	m2 := NewMessage("bot", TextBody("b"), "")
	m2.Room = "beta"

	if err := s.Send(ctx, "alpha", m1); err != nil {
		t.Fatal(err)
	}
	if err := s.Send(ctx, "beta", m2); err != nil {
		t.Fatal(err)
	}

	counts, err := s.GetUnreadCounts(ctx, "alice")
	if err != nil {
		t.Fatal(err)
	}
	if len(counts) != 2 {
		t.Fatalf("expected 2 rooms with unread, got %d", len(counts))
	}

	// Mark alpha read
	if err := s.MarkRead(ctx, "alpha", "alice", m1.ID); err != nil {
		t.Fatal(err)
	}
	counts, err = s.GetUnreadCounts(ctx, "alice")
	if err != nil {
		t.Fatal(err)
	}
	if len(counts) != 1 || counts[0].Room != "beta" {
		t.Fatalf("expected only beta unread, got %+v", counts)
	}
}

func TestUnreadCountsPerUser(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	msg := NewMessage("bot", TextBody("hello"), "")
	msg.Room = "general"
	if err := s.Send(ctx, "general", msg); err != nil {
		t.Fatal(err)
	}

	// Mark read for alice only
	if err := s.MarkRead(ctx, "general", "alice", msg.ID); err != nil {
		t.Fatal(err)
	}

	// Alice: 0 unread
	counts, err := s.GetUnreadCounts(ctx, "alice")
	if err != nil {
		t.Fatal(err)
	}
	if len(counts) != 0 {
		t.Fatalf("alice: expected 0 unread, got %+v", counts)
	}

	// Bob: 1 unread
	counts, err = s.GetUnreadCounts(ctx, "bob")
	if err != nil {
		t.Fatal(err)
	}
	if len(counts) != 1 || counts[0].Count != 1 {
		t.Fatalf("bob: expected 1 unread, got %+v", counts)
	}
}

func TestUpdateRoomDescription(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	_, err := s.CreateRoom(ctx, "general", "", nil)
	if err != nil {
		t.Fatal(err)
	}

	desc := "main channel"
	room, err := s.UpdateRoom(ctx, "general", "", &desc)
	if err != nil {
		t.Fatalf("UpdateRoom: %v", err)
	}
	if room.Description == nil || *room.Description != "main channel" {
		t.Errorf("expected description 'main channel', got %v", room.Description)
	}

	// Clear description
	room, err = s.UpdateRoom(ctx, "general", "", nil)
	if err != nil {
		t.Fatalf("UpdateRoom: %v", err)
	}
	if room.Description != nil {
		t.Errorf("expected nil description, got %v", room.Description)
	}
}

func TestUpdateRoomNotFound(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	desc := "nope"
	_, err := s.UpdateRoom(ctx, "nonexistent", "", &desc)
	if err == nil {
		t.Fatal("expected error for missing room")
	}
}

func TestDeleteRoom(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	// Create room and send messages
	_, err := s.CreateRoom(ctx, "doomed", "", nil)
	if err != nil {
		t.Fatal(err)
	}
	m1 := NewMessage("alice", TextBody("hello"), "")
	m1.Room = "doomed"
	if err := s.Send(ctx, "doomed", m1); err != nil {
		t.Fatal(err)
	}
	if err := s.MarkRead(ctx, "doomed", "alice", m1.ID); err != nil {
		t.Fatal(err)
	}

	// Delete the room
	if err := s.DeleteRoom(ctx, "doomed", ""); err != nil {
		t.Fatalf("DeleteRoom: %v", err)
	}

	// Room should be gone
	rooms, err := s.ListRooms(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(rooms) != 0 {
		t.Fatalf("expected 0 rooms, got %d", len(rooms))
	}

	// Messages should be gone
	msgs, err := s.GetMessages(ctx, "doomed")
	if err != nil {
		t.Fatal(err)
	}
	if len(msgs) != 0 {
		t.Fatalf("expected 0 messages, got %d", len(msgs))
	}
}

func TestDeleteRoomWithFolder(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	_, err := s.CreateRoom(ctx, "2026-03-09", "logs", nil)
	if err != nil {
		t.Fatal(err)
	}
	m := NewMessage("bot", TextBody("log"), "api")
	m.Room = "logs/2026-03-09"
	if err := s.Send(ctx, "logs/2026-03-09", m); err != nil {
		t.Fatal(err)
	}

	if err := s.DeleteRoom(ctx, "2026-03-09", "logs"); err != nil {
		t.Fatalf("DeleteRoom: %v", err)
	}

	rooms, err := s.ListRooms(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(rooms) != 0 {
		t.Fatalf("expected 0 rooms, got %d", len(rooms))
	}
}

func TestDeleteRoomNotFound(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	err := s.DeleteRoom(ctx, "nonexistent", "")
	if err == nil {
		t.Fatal("expected error for missing room")
	}
}

func TestRoomPath(t *testing.T) {
	tests := []struct {
		folder, name string
		wantPath     string
	}{
		{"", "general", "general"},
		{"projects", "my project", "projects/my project"},
		{"logs", "2026-03-09", "logs/2026-03-09"},
	}
	for _, tt := range tests {
		got := RoomPath(tt.folder, tt.name)
		if got != tt.wantPath {
			t.Errorf("RoomPath(%q, %q) = %q, want %q", tt.folder, tt.name, got, tt.wantPath)
		}
		folder, name := ParseRoomPath(got)
		if folder != tt.folder || name != tt.name {
			t.Errorf("ParseRoomPath(%q) = (%q, %q), want (%q, %q)", got, folder, name, tt.folder, tt.name)
		}
	}
}

func TestValidateRoomPath(t *testing.T) {
	valid := []string{
		"general",
		"projects/my project",
		"logs/2026-03-09",
	}
	for _, p := range valid {
		if err := ValidateRoomPath(p); err != nil {
			t.Errorf("ValidateRoomPath(%q) = %v, want nil", p, err)
		}
	}
	invalid := []string{
		"",
		"/name",      // empty folder
		"folder/",    // empty name
		"a//b",       // double slash
		"a b/c d/ef", // nested slash
	}
	for _, p := range invalid {
		if err := ValidateRoomPath(p); err == nil {
			t.Errorf("ValidateRoomPath(%q) = nil, want error", p)
		}
	}
}
