package graph

import (
	"uchat/chat"
	"uchat/config"
)

type Resolver struct {
	Store    *chat.Store
	Broker   *chat.Broker
	Config   *config.Config
	DataPath string
}

func ptrIfNonEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
