package chat

import (
	"sync"
	"testing"
	"time"
)

func testMsg(user, text string) Message {
	m := NewMessage(user, TextBody(text), "")
	m.Room = "general"
	return m
}

func TestBrokerSubscribeAndPublish(t *testing.T) {
	b := NewBroker()
	sub := b.Subscribe("general")
	defer b.Unsubscribe("general", sub)

	msg := testMsg("alice", "hello")
	b.Publish("general", "", msg)

	select {
	case got := <-sub.Messages():
		if got.ID != msg.ID {
			t.Errorf("expected id %s, got %s", msg.ID, got.ID)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for message")
	}
}

func TestBrokerRoomIsolation(t *testing.T) {
	b := NewBroker()
	subGeneral := b.Subscribe("general")
	subDev := b.Subscribe("dev")
	defer b.Unsubscribe("general", subGeneral)
	defer b.Unsubscribe("dev", subDev)

	msg := testMsg("alice", "hello")
	b.Publish("general", "", msg)

	select {
	case <-subGeneral.Messages():
		// expected
	case <-time.After(time.Second):
		t.Fatal("general subscriber didn't receive message")
	}

	select {
	case <-subDev.Messages():
		t.Fatal("dev subscriber should not receive general message")
	case <-time.After(50 * time.Millisecond):
		// expected
	}
}

func TestBrokerGlobalSubscription(t *testing.T) {
	b := NewBroker()
	global := b.Subscribe("")
	defer b.Unsubscribe("", global)

	b.Publish("general", "", testMsg("alice", "a"))
	b.Publish("dev", "", testMsg("bob", "b"))

	for i := 0; i < 2; i++ {
		select {
		case <-global.Messages():
		case <-time.After(time.Second):
			t.Fatalf("global subscriber didn't receive message %d", i)
		}
	}
}

func TestBrokerUnsubscribeStopsDelivery(t *testing.T) {
	b := NewBroker()
	sub := b.Subscribe("general")

	b.Unsubscribe("general", sub)

	b.Publish("general", "", testMsg("alice", "hello"))

	select {
	case _, ok := <-sub.Messages():
		if ok {
			t.Fatal("received message after unsubscribe")
		}
		// channel closed, expected
	case <-time.After(50 * time.Millisecond):
		// also fine — channel closed, no more reads
	}
}

func TestBrokerMultipleSubscribers(t *testing.T) {
	b := NewBroker()
	sub1 := b.Subscribe("general")
	sub2 := b.Subscribe("general")
	defer b.Unsubscribe("general", sub1)
	defer b.Unsubscribe("general", sub2)

	msg := testMsg("alice", "broadcast")
	b.Publish("general", "", msg)

	for i, sub := range []*Subscription{sub1, sub2} {
		select {
		case got := <-sub.Messages():
			if got.ID != msg.ID {
				t.Errorf("sub%d: wrong message id", i)
			}
		case <-time.After(time.Second):
			t.Fatalf("sub%d: timed out", i)
		}
	}
}

func TestBrokerConcurrentPublish(t *testing.T) {
	b := NewBroker()
	sub := b.Subscribe("general")
	defer b.Unsubscribe("general", sub)

	n := 100
	var wg sync.WaitGroup
	wg.Add(n)
	for i := 0; i < n; i++ {
		go func() {
			defer wg.Done()
			b.Publish("general", "", testMsg("alice", "msg"))
		}()
	}
	wg.Wait()

	// Drain — we should get up to 64 (channel buffer size), no panics
	count := 0
	for {
		select {
		case <-sub.Messages():
			count++
		default:
			goto done
		}
	}
done:
	if count == 0 {
		t.Fatal("expected at least some messages")
	}
}

func TestBrokerFolderSubscription(t *testing.T) {
	b := NewBroker()
	folderSub := b.SubscribeFolder("ubot")
	roomSub := b.Subscribe("session-1")
	defer b.UnsubscribeFolder("ubot", folderSub)
	defer b.Unsubscribe("session-1", roomSub)

	msg := testMsg("alice", "hello")
	b.Publish("session-1", "ubot", msg)

	// Both folder and room subscriber should receive
	for name, sub := range map[string]*Subscription{"folder": folderSub, "room": roomSub} {
		select {
		case got := <-sub.Messages():
			if got.ID != msg.ID {
				t.Errorf("%s: wrong message id", name)
			}
		case <-time.After(time.Second):
			t.Fatalf("%s: timed out", name)
		}
	}
}

func TestBrokerFolderIsolation(t *testing.T) {
	b := NewBroker()
	ubotSub := b.SubscribeFolder("ubot")
	otherSub := b.SubscribeFolder("other")
	defer b.UnsubscribeFolder("ubot", ubotSub)
	defer b.UnsubscribeFolder("other", otherSub)

	msg := testMsg("alice", "hello")
	b.Publish("session-1", "ubot", msg)

	select {
	case <-ubotSub.Messages():
		// expected
	case <-time.After(time.Second):
		t.Fatal("ubot folder subscriber didn't receive message")
	}

	select {
	case <-otherSub.Messages():
		t.Fatal("other folder subscriber should not receive ubot message")
	case <-time.After(50 * time.Millisecond):
		// expected
	}
}

func TestBrokerFolderDoesNotMatchWithoutFolder(t *testing.T) {
	b := NewBroker()
	folderSub := b.SubscribeFolder("ubot")
	defer b.UnsubscribeFolder("ubot", folderSub)

	// Publish with empty folder — folder sub should NOT receive
	msg := testMsg("alice", "hello")
	b.Publish("general", "", msg)

	select {
	case <-folderSub.Messages():
		t.Fatal("folder subscriber should not receive message without folder")
	case <-time.After(50 * time.Millisecond):
		// expected
	}
}

func TestSubscriptionDoubleClose(t *testing.T) {
	sub := &Subscription{ch: make(chan Message, 1)}
	sub.Close()
	sub.Close() // should not panic
}
