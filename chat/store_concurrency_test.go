package chat

import (
	"context"
	"fmt"
	"path/filepath"
	"sync"
	"testing"
)

// newTempStore opens a file-backed store: WAL mode with a real connection pool,
// unlike newTestStore which uses a single-connection in-memory database. This is
// what exercises the concurrent read/write paths.
func newTempStore(t *testing.T) *Store {
	t.Helper()
	s, err := NewStore(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("NewStore: %v", err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

// collectErrs drains ch and fails the test with the first error, if any.
func collectErrs(t *testing.T, ch chan error) {
	t.Helper()
	close(ch)
	for err := range ch {
		t.Fatalf("concurrent op failed: %v", err)
	}
}

func TestConcurrentCreateRoomDistinctPositions(t *testing.T) {
	s := newTempStore(t)
	ctx := context.Background()

	const n = 50
	errs := make(chan error, n)
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			if _, err := s.CreateRoom(ctx, fmt.Sprintf("room-%d", i), "", nil); err != nil {
				errs <- err
			}
		}(i)
	}
	wg.Wait()
	collectErrs(t, errs)

	rooms, err := s.ListRooms(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(rooms) != n {
		t.Fatalf("expected %d rooms, got %d", n, len(rooms))
	}
	seen := make(map[int]bool, n)
	for _, r := range rooms {
		if r.Position < 0 || r.Position >= n {
			t.Fatalf("position %d out of range [0,%d)", r.Position, n)
		}
		if seen[r.Position] {
			t.Fatalf("duplicate position %d", r.Position)
		}
		seen[r.Position] = true
	}
}

func TestConcurrentSendToSameNewRoom(t *testing.T) {
	s := newTempStore(t)
	ctx := context.Background()

	const n = 50
	errs := make(chan error, n)
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			m := NewMessage("bot", TextBody(fmt.Sprintf("msg %d", i)), "api")
			m.Room = "logs/today"
			if err := s.Send(ctx, "logs/today", m); err != nil {
				errs <- err
			}
		}(i)
	}
	wg.Wait()
	collectErrs(t, errs)

	rooms, err := s.ListRooms(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(rooms) != 1 {
		t.Fatalf("expected room auto-created exactly once, got %d rooms", len(rooms))
	}
	msgs, err := s.GetMessages(ctx, "logs/today")
	if err != nil {
		t.Fatal(err)
	}
	if len(msgs) != n {
		t.Fatalf("expected %d messages, got %d", n, len(msgs))
	}
}

func TestConcurrentEditMessageRevisions(t *testing.T) {
	s := newTempStore(t)
	ctx := context.Background()

	m := NewMessage("bot", TextBody("v0"), "api")
	m.Room = "general"
	if err := s.Send(ctx, "general", m); err != nil {
		t.Fatal(err)
	}

	const n = 100
	errs := make(chan error, n)
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			if err := s.EditMessage(ctx, m.ID, TextBody(fmt.Sprintf("v%d", i+1)), nil); err != nil {
				errs <- err
			}
		}(i)
	}
	wg.Wait()
	collectErrs(t, errs)

	got, err := s.GetMessage(ctx, m.ID)
	if err != nil {
		t.Fatal(err)
	}
	// revision starts at 1; each of n edits does `revision = revision + 1`
	// atomically under the write lock, so the writes don't lose each other.
	if got.Revision != n+1 {
		t.Fatalf("expected revision %d, got %d", n+1, got.Revision)
	}
}

// TestConcurrentMixedWorkload is a smoke test: reads, sends, room creation and
// room deletion all in flight at once should never surface "database is locked".
func TestConcurrentMixedWorkload(t *testing.T) {
	s := newTempStore(t)
	ctx := context.Background()

	if _, err := s.CreateRoom(ctx, "general", "", nil); err != nil {
		t.Fatal(err)
	}

	errs := make(chan error, 512)
	report := func(err error) {
		select {
		case errs <- err:
		default:
		}
	}

	var wg sync.WaitGroup
	spawn := func(f func()) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			f()
		}()
	}

	for i := 0; i < 25; i++ {
		i := i
		spawn(func() {
			m := NewMessage("alice", TextBody(fmt.Sprintf("hi %d", i)), "web")
			m.Room = "general"
			if err := s.Send(ctx, "general", m); err != nil {
				report(fmt.Errorf("Send: %w", err))
			}
		})
		spawn(func() {
			name := fmt.Sprintf("scratch-%d", i)
			if _, err := s.CreateRoom(ctx, name, "tmp", nil); err != nil {
				report(fmt.Errorf("CreateRoom: %w", err))
				return
			}
			if err := s.DeleteRoom(ctx, name, "tmp"); err != nil {
				report(fmt.Errorf("DeleteRoom: %w", err))
			}
		})
		spawn(func() {
			if _, err := s.ListRooms(ctx, nil); err != nil {
				report(fmt.Errorf("ListRooms: %w", err))
			}
			if _, err := s.GetMessages(ctx, "general"); err != nil {
				report(fmt.Errorf("GetMessages: %w", err))
			}
			if _, err := s.GetUnreadCounts(ctx, "alice"); err != nil {
				report(fmt.Errorf("GetUnreadCounts: %w", err))
			}
		})
	}
	wg.Wait()
	collectErrs(t, errs)
}
