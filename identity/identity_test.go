package identity

import (
	"context"
	"net/http"
	"testing"
	"time"
)

type staticProvider struct {
	status *Status
	calls  int
}

func (p *staticProvider) Status(context.Context) (*Status, error) {
	p.calls++
	return p.status, nil
}

func TestResolveRequestUsesTrustedForwardedFor(t *testing.T) {
	provider := &staticProvider{status: &Status{
		Peer: map[string]Node{
			"air": {
				ID:           "node-id",
				PublicKey:    "node-key",
				HostName:     "MacBook Air",
				DNSName:      "air.mouse-sun.ts.net.",
				UserID:       123,
				Tags:         []string{"tag:client"},
				Online:       true,
				Active:       true,
				TailscaleIPs: []string{"100.101.18.20"},
			},
		},
	}}
	resolver := &Resolver{Provider: provider, TTL: time.Minute}
	req, err := http.NewRequest("GET", "/graphql", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.RemoteAddr = "127.0.0.1:50642"
	req.Header.Set("X-Forwarded-For", "100.101.18.20")

	machine := resolver.ResolveRequest(req)
	if !machine.Matched {
		t.Fatalf("expected match: %#v", machine)
	}
	if machine.Name != "air" {
		t.Fatalf("expected name air, got %q", machine.Name)
	}
	if machine.Source != "trusted_x_forwarded_for" {
		t.Fatalf("expected trusted source, got %q", machine.Source)
	}
}

func TestResolveRequestIgnoresForwardedForFromNonLocalPeer(t *testing.T) {
	provider := &staticProvider{status: &Status{
		Peer: map[string]Node{
			"air": {DNSName: "air.mouse-sun.ts.net.", TailscaleIPs: []string{"100.101.18.20"}},
			"bad": {DNSName: "bad.mouse-sun.ts.net.", TailscaleIPs: []string{"100.64.0.99"}},
		},
	}}
	resolver := &Resolver{Provider: provider, TTL: time.Minute}
	req, err := http.NewRequest("GET", "/graphql", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.RemoteAddr = "100.64.0.99:12345"
	req.Header.Set("X-Forwarded-For", "100.101.18.20")

	machine := resolver.ResolveRequest(req)
	if !machine.Matched {
		t.Fatalf("expected direct remote match: %#v", machine)
	}
	if machine.Name != "bad" {
		t.Fatalf("expected non-local RemoteAddr to win, got %q", machine.Name)
	}
	if machine.Source != "remote_addr" {
		t.Fatalf("expected remote_addr source, got %q", machine.Source)
	}
}
