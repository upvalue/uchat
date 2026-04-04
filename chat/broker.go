package chat

import "sync"

type Subscription struct {
	ch     chan Message
	closed bool
	mu     sync.Mutex
}

func (s *Subscription) Messages() <-chan Message {
	return s.ch
}

func (s *Subscription) Close() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.closed {
		s.closed = true
		close(s.ch)
	}
}

type Broker struct {
	mu         sync.RWMutex
	subs       map[string]map[*Subscription]struct{}
	folderSubs map[string]map[*Subscription]struct{}
	globalSubs map[*Subscription]struct{}
}

func NewBroker() *Broker {
	return &Broker{
		subs:       make(map[string]map[*Subscription]struct{}),
		folderSubs: make(map[string]map[*Subscription]struct{}),
		globalSubs: make(map[*Subscription]struct{}),
	}
}

func (b *Broker) Subscribe(room string) *Subscription {
	sub := &Subscription{ch: make(chan Message, 64)}
	b.mu.Lock()
	defer b.mu.Unlock()
	if room == "" {
		b.globalSubs[sub] = struct{}{}
	} else {
		if b.subs[room] == nil {
			b.subs[room] = make(map[*Subscription]struct{})
		}
		b.subs[room][sub] = struct{}{}
	}
	return sub
}

func (b *Broker) SubscribeFolder(folder string) *Subscription {
	sub := &Subscription{ch: make(chan Message, 64)}
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.folderSubs[folder] == nil {
		b.folderSubs[folder] = make(map[*Subscription]struct{})
	}
	b.folderSubs[folder][sub] = struct{}{}
	return sub
}

func (b *Broker) Unsubscribe(room string, sub *Subscription) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if room == "" {
		delete(b.globalSubs, sub)
	} else if subs, ok := b.subs[room]; ok {
		delete(subs, sub)
		if len(subs) == 0 {
			delete(b.subs, room)
		}
	}
	sub.Close()
}

func (b *Broker) UnsubscribeFolder(folder string, sub *Subscription) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if subs, ok := b.folderSubs[folder]; ok {
		delete(subs, sub)
		if len(subs) == 0 {
			delete(b.folderSubs, folder)
		}
	}
	sub.Close()
}

func (b *Broker) Publish(room string, folder string, msg Message) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	deliver := func(sub *Subscription) {
		sub.mu.Lock()
		if !sub.closed {
			select {
			case sub.ch <- msg:
			default:
			}
		}
		sub.mu.Unlock()
	}
	for sub := range b.subs[room] {
		deliver(sub)
	}
	if folder != "" {
		for sub := range b.folderSubs[folder] {
			deliver(sub)
		}
	}
	for sub := range b.globalSubs {
		deliver(sub)
	}
}
