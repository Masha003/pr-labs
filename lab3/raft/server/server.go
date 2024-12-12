package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"sync"
	"time"

	"github.com/madflojo/tasks"
)

const (
    NodeTypeLeader    = "leader"
    NodeTypeFollower  = "follower"
    NodeTypeCandidate = "candidate"

    ScheduleHeartbeat              = "heartbeat"
    ScheduleLeaderHeartbeatTimeout = "leader_heartbeat_timeout"
)


type Server struct {
	nodeType string
	mtex  sync.Mutex
	cfg Config
	scheduler *tasks.Scheduler
	leader string
	term int

	conn *net.UDPConn
	stopCh chan struct{}
}

func New(cfg Config) *Server {
	s := &Server{
		nodeType: NodeTypeFollower,
		cfg: cfg,
		scheduler: tasks.New(),
		stopCh: make(chan struct{}),
	}

	// schedule leader heartbeat timeout
	_ = s.scheduler.AddWithID(ScheduleLeaderHeartbeatTimeout, &tasks.Task{
		Interval: cfg.LeaderHeartbeatTimeout,
		TaskFunc: s.leaderHeartbeatTimeoutFunc,
		ErrFunc: s.leaderHeartbeatTimeoutErrorFunc,
	})

	return s
}

func (s *Server) Start(ctx context.Context) error {
    addr, err := net.ResolveUDPAddr("udp", fmt.Sprintf(":%d", s.cfg.Port))
    if err != nil {
        return err
    }

    s.conn, err = net.ListenUDP("udp", addr)
    if err != nil {
        return err
    }

    slog.Info("UDP server started", "address", addr.String())

    // Start listening for incoming UDP messages
    go s.listenLoop()

    <-ctx.Done()
    return nil
}

func (s *Server) Shutdown(ctx context.Context) error {
    close(s.stopCh)
    s.scheduler.Stop()
    if s.conn != nil {
        s.conn.Close()
    }
    return nil
}

// listenLoop continuously listens for incoming UDP messages and processes them.
func (s *Server) listenLoop() {
    buf := make([]byte, 2048)
    for {
        select {
        case <-s.stopCh:
            return
        default:
            s.conn.SetReadDeadline(time.Now().Add(1 * time.Second))
            n, addr, err := s.conn.ReadFromUDP(buf)
            if err != nil {
                // timeout or closed conn is expected
                continue
            }

            var msg Message
            if err := json.Unmarshal(buf[:n], &msg); err != nil {
                slog.Error("failed to unmarshal incoming message", "error", err)
                continue
            }

            s.handleMessage(msg, addr)
        }
    }
}

// handleMessage routes incoming messages based on their Type
func (s *Server) handleMessage(msg Message, addr *net.UDPAddr) {
    switch msg.Type {
    case MessageHeartbeat:
        s.handleHeartbeat(msg, addr)
    case MessageProposal:
        s.handleProposal(msg, addr)
    case MessageHeartbeatResponse, MessageProposalResponse:
        // Responses are expected by candidate or leader. 
        // Handling is done in scheduled tasks logic (if needed).
        s.handleResponse(msg)
    default:
        slog.Warn("received unknown message type", "type", msg.Type)
    }
}

// handleHeartbeat processes a leader heartbeat message
func (s *Server) handleHeartbeat(msg Message, addr *net.UDPAddr) {
    s.mtex.Lock()
    defer s.mtex.Unlock()

    if msg.Term < s.term {
        // Reject
        s.sendResponse(MessageHeartbeatResponse, false, addr, msg.Term, s.cfg.Node, "", "")
        return
    }

    // Accept the heartbeat
    s.leader = msg.Leader
    s.term = msg.Term
    s.nodeType = NodeTypeFollower

    s.scheduler.Del(ScheduleLeaderHeartbeatTimeout)
    _ = s.scheduler.AddWithID(ScheduleLeaderHeartbeatTimeout, &tasks.Task{
        Interval: s.cfg.LeaderHeartbeatTimeout,
        TaskFunc: s.leaderHeartbeatTimeoutFunc,
        ErrFunc:  s.leaderHeartbeatTimeoutErrorFunc,
    })

    slog.Info("acknowledged heartbeat from leader", "leader", msg.Leader, "term", msg.Term)
    s.sendResponse(MessageHeartbeatResponse, true, addr, msg.Term, s.cfg.Node, "", "")
}

// handleProposal processes a candidate proposal message
func (s *Server) handleProposal(msg Message, addr *net.UDPAddr) {
    s.mtex.Lock()
    defer s.mtex.Unlock()

    if msg.Term <= s.term {
        // reject
        s.sendResponse(MessageProposalResponse, false, addr, msg.Term, s.cfg.Node, "", "")
        return
    }

    s.nodeType = NodeTypeFollower
    s.leader = msg.Candidate
    s.term = msg.Term

    s.scheduler.Del(ScheduleLeaderHeartbeatTimeout)
    _ = s.scheduler.AddWithID(ScheduleLeaderHeartbeatTimeout, &tasks.Task{
        Interval: s.cfg.LeaderHeartbeatTimeout,
        TaskFunc: s.leaderHeartbeatTimeoutFunc,
        ErrFunc:  s.leaderHeartbeatTimeoutErrorFunc,
    })

    slog.Info("accepted new leader proposal", "leader", msg.Candidate, "term", msg.Term)
    s.sendResponse(MessageProposalResponse, true, addr, msg.Term, s.cfg.Node, "", "")
}

// handleResponse processes responses to our heartbeat or proposal messages
func (s *Server) handleResponse(msg Message) {
    // Here, you would track how many responses you've received.
    // If you are a candidate and receiving votes (proposal responses), 
    // count them and if majority is reached, become leader.
    //
    // If you are a leader and receiving heartbeat responses, 
    // you might track failures, etc.
    //
    // This logic can be integrated similarly to the HTTP version.

    // For demonstration, just log the response.
    slog.Info("received response", "type", msg.Type, "from", msg.Node, "ack", msg.Ack, "term", msg.Term)
}

// sendResponse sends a response message back to the given UDP address
func (s *Server) sendResponse(msgType MessageType, ack bool, addr *net.UDPAddr, term int, node, leader, candidate string) {
    resp := Message{
        Type:      msgType,
        Ack:       ack,
        Term:      term,
        Node:      node,
        Leader:    leader,
        Candidate: candidate,
    }
    s.sendMessage(resp, addr)
}

// sendMessage marshals a message into JSON and sends it via UDP
func (s *Server) sendMessage(msg Message, addr *net.UDPAddr) {
    data, err := json.Marshal(msg)
    if err != nil {
        slog.Error("failed to marshal message", "error", err)
        return
    }
    _, err = s.conn.WriteToUDP(data, addr)
    if err != nil {
        slog.Error("failed to send message", "error", err, "addr", addr)
    }
}


