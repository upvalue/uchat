package identity

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/netip"
	"os/exec"
	"strings"
	"sync"
	"time"
)

type Machine struct {
	Name      string
	IP        string
	Matched   bool
	Source    string
	ID        *string
	PublicKey *string
	HostName  *string
	DNSName   *string
	UserID    *int
	Tags      []string
	Online    *bool
	Active    *bool
	Warning   *string
}

type contextKey struct{}

func WithMachine(ctx context.Context, m *Machine) context.Context {
	return context.WithValue(ctx, contextKey{}, m)
}

func FromContext(ctx context.Context) (*Machine, bool) {
	m, ok := ctx.Value(contextKey{}).(*Machine)
	return m, ok
}

type StatusProvider interface {
	Status(context.Context) (*Status, error)
}

type CommandStatusProvider struct {
	Command []string
}

func (p CommandStatusProvider) Status(ctx context.Context) (*Status, error) {
	command := p.Command
	if len(command) == 0 {
		command = []string{"tailscale", "status", "--json"}
	}
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	out, err := exec.CommandContext(ctx, command[0], command[1:]...).Output()
	if err != nil {
		return nil, err
	}
	var status Status
	if err := json.Unmarshal(out, &status); err != nil {
		return nil, err
	}
	return &status, nil
}

type Resolver struct {
	Provider StatusProvider
	TTL      time.Duration

	mu        sync.Mutex
	cached    *Status
	cachedErr error
	cachedAt  time.Time
}

func NewResolver() *Resolver {
	return &Resolver{
		Provider: CommandStatusProvider{},
		TTL:      5 * time.Second,
	}
}

func (r *Resolver) ResolveRequest(req *http.Request) *Machine {
	ip, source, trustedProxy, warning := clientIP(req)
	m := &Machine{
		Name:    fallbackName(ip),
		IP:      ip.String(),
		Source:  source,
		Matched: false,
	}
	if warning != "" {
		m.Warning = &warning
	}

	status, err := r.status(req.Context())
	if err != nil {
		msg := fmt.Sprintf("tailscale status: %v", err)
		m.Warning = &msg
		return m
	}

	node := status.FindByIP(ip)
	if node == nil {
		if trustedProxy && req.Header.Get("X-Forwarded-For") == "" {
			msg := "trusted proxy request did not include X-Forwarded-For"
			m.Warning = &msg
		}
		return m
	}

	m.Matched = true
	m.ID = stringPtr(node.ID)
	m.PublicKey = stringPtr(node.PublicKey)
	m.HostName = stringPtr(node.HostName)
	m.DNSName = stringPtr(node.DNSName)
	m.UserID = intPtr(node.UserID)
	m.Tags = append([]string(nil), node.Tags...)
	m.Online = boolPtr(node.Online)
	m.Active = boolPtr(node.Active)
	m.Name = machineName(*node)
	return m
}

func (r *Resolver) status(ctx context.Context) (*Status, error) {
	ttl := r.TTL
	if ttl == 0 {
		ttl = 5 * time.Second
	}
	provider := r.Provider
	if provider == nil {
		provider = CommandStatusProvider{}
	}

	now := time.Now()
	r.mu.Lock()
	if r.cached != nil && now.Sub(r.cachedAt) < ttl {
		status, err := r.cached, r.cachedErr
		r.mu.Unlock()
		return status, err
	}
	r.mu.Unlock()

	status, err := provider.Status(ctx)

	r.mu.Lock()
	r.cached = status
	r.cachedErr = err
	r.cachedAt = now
	r.mu.Unlock()
	return status, err
}

type Status struct {
	Self *Node           `json:"Self"`
	Peer map[string]Node `json:"Peer"`
}

func (s *Status) FindByIP(ip netip.Addr) *Node {
	if s == nil {
		return nil
	}
	if s.Self != nil && s.Self.HasIP(ip) {
		return s.Self
	}
	for _, node := range s.Peer {
		n := node
		if n.HasIP(ip) {
			return &n
		}
	}
	return nil
}

type Node struct {
	ID           string   `json:"ID"`
	PublicKey    string   `json:"PublicKey"`
	HostName     string   `json:"HostName"`
	DNSName      string   `json:"DNSName"`
	UserID       int      `json:"UserID"`
	Tags         []string `json:"Tags"`
	Online       bool     `json:"Online"`
	Active       bool     `json:"Active"`
	TailscaleIPs []string `json:"TailscaleIPs"`
}

func (n Node) HasIP(ip netip.Addr) bool {
	for _, raw := range n.TailscaleIPs {
		addr, err := netip.ParseAddr(raw)
		if err == nil && addr == ip {
			return true
		}
	}
	return false
}

func clientIP(req *http.Request) (netip.Addr, string, bool, string) {
	remote, warning := parseRemoteAddr(req.RemoteAddr)
	trustedProxy := remote.IsLoopback()
	if trustedProxy {
		if forwarded := firstForwardedFor(req.Header.Get("X-Forwarded-For")); forwarded.IsValid() {
			return forwarded, "trusted_x_forwarded_for", true, warning
		}
	}
	return remote, "remote_addr", trustedProxy, warning
}

func parseRemoteAddr(remoteAddr string) (netip.Addr, string) {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		host = remoteAddr
	}
	ip, err := netip.ParseAddr(host)
	if err != nil {
		return netip.MustParseAddr("127.0.0.1"), fmt.Sprintf("invalid RemoteAddr %q", remoteAddr)
	}
	return ip, ""
}

func firstForwardedFor(value string) netip.Addr {
	for _, part := range strings.Split(value, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if ip, err := netip.ParseAddr(part); err == nil {
			return ip
		}
	}
	return netip.Addr{}
}

func machineName(node Node) string {
	dns := strings.TrimSuffix(node.DNSName, ".")
	if i := strings.IndexByte(dns, '.'); i > 0 {
		return dns[:i]
	}
	if dns != "" {
		return dns
	}
	if node.HostName != "" {
		return node.HostName
	}
	if len(node.TailscaleIPs) > 0 {
		return node.TailscaleIPs[0]
	}
	return "unknown"
}

func fallbackName(ip netip.Addr) string {
	if ip.IsLoopback() {
		return "local"
	}
	return ip.String()
}

func stringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func intPtr(i int) *int {
	if i == 0 {
		return nil
	}
	return &i
}

func boolPtr(b bool) *bool {
	return &b
}
