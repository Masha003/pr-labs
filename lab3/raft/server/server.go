package server

import (
	"encoding/json"
	"log"
	"net"
	"sync"
	"time"

	"raft/config"
)

type RaftNode struct {
	config     *config.Config
	udpConn    *net.UDPConn
	peers      []*net.UDPAddr
	state      string
	mutex      sync.Mutex
	heartbeatTicker *time.Ticker
}

func NewRaftNode(cfg *config.Config, conn *net.UDPConn) *RaftNode {
	peers := make([]*net.UDPAddr, len(cfg.Peers))
	for i, peer := range cfg.Peers {
		addr, err := net.ResolveUDPAddr("udp", peer)
		if err != nil {
			log.Fatalf("Failed to resolve peer address %s: %v", peer, err)
		}
		peers[i] = addr
	}

	return &RaftNode{
		config:          cfg,
		udpConn:         conn,
		peers:           peers,
		state:           "follower",
		heartbeatTicker:  time.NewTicker(time.Duration(cfg.HeartbeatInterval) * time.Millisecond),
	}
}

func (node *RaftNode) Start() {
	go node.listen()
	for {
		select {
		case <-node.heartbeatTicker.C:
			if node.state == "leader" {
				node.sendHeartbeat()
			}
		}
	}
}

func (node *RaftNode) Stop() {
	node.heartbeatTicker.Stop()
}

func (node *RaftNode) listen() {
	buf := make([]byte, 1024)
	for {
		n, addr, err := node.udpConn.ReadFromUDP(buf)
		if err != nil {
			log.Printf("Error receiving UDP message: %v", err)
			continue
		}
		go node.handleMessage(buf[:n], addr)
	}
}

func (node *RaftNode) handleMessage(data []byte, addr *net.UDPAddr) {
	var message map[string]interface{}
	if err := json.Unmarshal(data, &message); err != nil {
		log.Printf("Error decoding message from %s: %v", addr, err)
		return
	}

	log.Printf("Received message from %s: %v", addr, message)
	// Handle Raft-specific messages (e.g., votes, heartbeats)
}

func (node *RaftNode) sendHeartbeat() {
	msg := map[string]string{
		"type": "heartbeat",
		"from": node.config.NodeID,
	}
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to serialize heartbeat message: %v", err)
		return
	}

	for _, peer := range node.peers {
		if _, err := node.udpConn.WriteToUDP(data, peer); err != nil {
			log.Printf("Failed to send heartbeat to %s: %v", peer, err)
		}
	}
}
