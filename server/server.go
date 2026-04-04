package server

import (
	"net/http"

	"uchat/chat"
	"uchat/config"
	"uchat/graph"

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

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: false,
	})

	return &Server{handler: c.Handler(mux)}
}

func (s *Server) Listen(addr string) error {
	return http.ListenAndServe(addr, s.handler)
}
