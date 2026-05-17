package acl

import (
	"testing"

	"uchat/chat"
	"uchat/config"
	"uchat/graph"
)

func TestPolicyAllowsAllWhenDisabled(t *testing.T) {
	policy := NewPolicy(config.ACLConfig{})
	if !policy.CanAccessRoom(Subject{Machine: "unknown"}, "secret") {
		t.Fatal("empty ACL config should preserve legacy allow-all behavior")
	}
}

func TestPolicyMachineWildcardGrant(t *testing.T) {
	policy := NewPolicy(config.ACLConfig{
		FallbackRooms: []string{"general"},
		Rules: []config.ACLRule{
			{Machines: []string{"air", "local"}, Rooms: []string{"*"}},
		},
	})
	for _, machine := range []string{"air", "local"} {
		if !policy.CanAccessRoom(Subject{Machine: machine}, "secret") {
			t.Fatalf("%s should have wildcard room access", machine)
		}
	}
	if !policy.CanAccessRoom(Subject{Machine: "phone"}, "general") {
		t.Fatal("fallback should grant general")
	}
	if policy.CanAccessRoom(Subject{Machine: "phone"}, "secret") {
		t.Fatal("fallback should not grant non-general rooms")
	}
}

func TestPolicyTagGrant(t *testing.T) {
	policy := NewPolicy(config.ACLConfig{
		Rules: []config.ACLRule{
			{Tags: []string{"tag:admin"}, Rooms: []string{"*"}},
		},
	})
	if !policy.CanAccessRoom(Subject{Machine: "phone", Tags: []string{"tag:admin"}}, "secret") {
		t.Fatal("tag rule should grant access")
	}
	if policy.CanAccessRoom(Subject{Machine: "phone", Tags: []string{"tag:client"}}, "secret") {
		t.Fatal("unmatched tag should not grant access")
	}
}

func TestPolicyOnlyTreatsStarAsWildcard(t *testing.T) {
	policy := NewPolicy(config.ACLConfig{
		Rules: []config.ACLRule{
			{Machines: []string{"air"}, Rooms: []string{"reva/*"}},
		},
	})
	if policy.CanAccessRoom(Subject{Machine: "air"}, "reva/2026-05-17") {
		t.Fatal("pattern-like room strings should be exact matches for now")
	}
	if !policy.CanAccessRoom(Subject{Machine: "air"}, "reva/*") {
		t.Fatal("pattern-like room strings should still match literally")
	}
}

func TestPolicyFiltersRoomsAndUnreadCounts(t *testing.T) {
	policy := NewPolicy(config.ACLConfig{FallbackRooms: []string{"general"}})
	subject := Subject{Machine: "phone"}

	general := "general"
	private := "private"
	rooms := policy.FilterRooms(subject, []*graph.Room{
		{Name: general},
		{Name: private},
	})
	if len(rooms) != 1 || rooms[0].Name != general {
		t.Fatalf("expected only general room, got %#v", rooms)
	}

	counts := policy.FilterUnreadCounts(subject, []*chat.UnreadCount{
		{Room: general, Count: 1},
		{Room: private, Count: 2},
	})
	if len(counts) != 1 || counts[0].Room != general {
		t.Fatalf("expected only general unread count, got %#v", counts)
	}
}
