package config

import (
	"fmt"
	"os"

	"github.com/BurntSushi/toml"
)

type UserConfig struct {
	Avatar string `toml:"avatar"`
}

type Config struct {
	Users map[string]UserConfig `toml:"users"`
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
