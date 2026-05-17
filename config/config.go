package config

import (
	"fmt"
	"os"

	"github.com/BurntSushi/toml"
)

type UserConfig struct {
	Avatar string `toml:"avatar"`
}

type ACLRule struct {
	Machines []string `toml:"machines"`
	Tags     []string `toml:"tags"`
	Rooms    []string `toml:"rooms"`
}

type ACLConfig struct {
	FallbackRooms []string  `toml:"fallback_rooms"`
	Rules         []ACLRule `toml:"rules"`
}

type Config struct {
	Title string                `toml:"title"`
	Users map[string]UserConfig `toml:"users"`
	ACL   ACLConfig             `toml:"acl"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return &Config{Users: map[string]UserConfig{}}, nil
		}
		return nil, fmt.Errorf("reading config: %w", err)
	}
	var cfg Config
	if err := toml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parsing config: %w", err)
	}
	if cfg.Users == nil {
		cfg.Users = map[string]UserConfig{}
	}
	return &cfg, nil
}
