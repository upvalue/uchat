package server

import (
	"log/slog"
	"net/http"

	"uchat/acl"
	"uchat/chat"
	"uchat/config"
	"uchat/graph"
	"uchat/identity"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gorilla/websocket"
	"github.com/rs/cors"
)

type Server struct {
	handler http.Handler
}

func New(store *chat.Store, broker *chat.Broker, cfg *config.Config, dataPath string) *Server {
	resolver := &graph.Resolver{Store: store, Broker: broker, Config: cfg, DataPath: dataPath}
	srv := handler.New(graph.NewExecutableSchema(graph.Config{Resolvers: resolver}))
	srv.AroundFields(acl.Middleware(acl.NewPolicy(cfg.ACL), store))

	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.POST{})
	srv.AddTransport(&transport.Websocket{
		Upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	})

	mux := http.NewServeMux()
	pg := playground.Handler("uchat", "/graphql")
	mux.HandleFunc("GET /graphql", func(w http.ResponseWriter, r *http.Request) {
		// WebSocket upgrades are GET requests; route them to the GraphQL server
		if r.Header.Get("Upgrade") != "" {
			srv.ServeHTTP(w, r)
			return
		}
		pg.ServeHTTP(w, r)
	})
	mux.Handle("POST /graphql", srv)
	mux.Handle("/graphql", srv)
	mux.Handle("/data/", http.StripPrefix("/data/", http.FileServer(http.Dir(dataPath))))

	identityResolver := identity.NewResolver()
	withIdentity := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		machine := identityResolver.ResolveRequest(r)
		slog.Info("tailscale request identity",
			"method", r.Method,
			"path", r.URL.Path,
			"remote", r.RemoteAddr,
			"x_forwarded_for", r.Header.Get("X-Forwarded-For"),
			"source", machine.Source,
			"matched", machine.Matched,
			"ip", machine.IP,
			"machine", machine.Name,
			"host", stringValue(machine.HostName),
			"dns", stringValue(machine.DNSName),
			"tags", machine.Tags,
			"warning", stringValue(machine.Warning),
		)
		mux.ServeHTTP(w, r.WithContext(identity.WithMachine(r.Context(), machine)))
	})

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: false,
	})

	return &Server{handler: c.Handler(withIdentity)}
}

func (s *Server) Listen(addr string) error {
	return http.ListenAndServe(addr, s.handler)
}

func stringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
