package server

import (
	"io/ioutil"

	"gopkg.in/yaml.v2"
)

type Config struct {
	Port       int      `yaml:"port"`
	Peers      []string `yaml:"peers"`
	NodeID     string   `yaml:"node_id"`
	ElectionTimeout int  `yaml:"election_timeout"`
	HeartbeatInterval int `yaml:"heartbeat_interval"`
}

func LoadConfig(filePath string) (*Config, error) {
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	cfg := &Config{}
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, err
	}

	return cfg, nil
}
