package server

import (
	"encoding/json"
	"net"
	"sync"

	"github.com/dyweb/gommon/errors"
	"github.com/madflojo/tasks"
	"golang.org/x/exp/slog"
)

func (s *Server) heartbeatFunc() error {
    var (
        wg   sync.WaitGroup
        merr = errors.NewMultiErrSafe()
        term = s.currTerm()
    )
    slog.Info("running leader heartbeat scheduled task", "node", s.cfg.Node, "term", term)

    wg.Add(len(s.cfg.Peers))

    for _, peer := range s.cfg.Peers {
        go func(peer string) {
            defer wg.Done()
            if err := s.sendHeartbeatToPeer(peer, term); err != nil {
                merr.Append(err)
            }
        }(peer)
    }

    wg.Wait()
    if merr.HasError() && merr.Len() > len(s.cfg.Peers)/2 {
        slog.Error("error sending heartbeat to peers", "error", merr, "term", term)
        return merr
    }

    return nil
}

func (s *Server) sendHeartbeatToPeer(peer string, term int) error {
    msg := Message{
        Type:   MessageHeartbeat,
        Leader: s.cfg.Node,
        Term:   term,
    }
    return s.sendUDPMessage(msg, peer)
}

func (s *Server) heartbeatErrorFunc(err error) {
    s.mtex.Lock()
    defer s.mtex.Unlock()
    s.nodeType = NodeTypeFollower

    slog.Error("error in leader heartbeat scheduled task", "error", err)

    slog.Info("deleting heartbeat scheduled task")
    s.scheduler.Del(ScheduleHeartbeat)

    slog.Info("reinstating leader heartbeat timeout scheduled task")
    _ = s.scheduler.AddWithID(ScheduleLeaderHeartbeatTimeout, &tasks.Task{
        Interval: s.cfg.LeaderHeartbeatTimeout,
        TaskFunc: s.leaderHeartbeatTimeoutFunc,
        ErrFunc:  s.leaderHeartbeatTimeoutErrorFunc,
    })
}

func (s *Server) leaderHeartbeatTimeoutFunc() error {
    var (
        wg   sync.WaitGroup
        merr = errors.NewMultiErrSafe()
        term = s.incTerm()
    )
    slog.Info("triggered leader-heartbeat-timeout; proposing self as candidate", "node", s.cfg.Node, "term", term)

    wg.Add(len(s.cfg.Peers))
    for _, peer := range s.cfg.Peers {
        go func(peer string) {
            defer wg.Done()
            if err := s.sendCandidateProposalToPeer(peer, term); err != nil {
                merr.Append(err)
            }
        }(peer)
    }

    wg.Wait()
    if merr.Len() > len(s.cfg.Peers)/2 {
        slog.Error("error sending candidate proposal to peers", "error", merr, "term", term)
        return merr
    }

    s.upgradeSelfToLeader()
    return nil
}

func (s *Server) incTerm() int {
    s.mtex.Lock()
    defer s.mtex.Unlock()
    s.term++
    return s.term
}

func (s *Server) currTerm() int {
    s.mtex.Lock()
    defer s.mtex.Unlock()
    return s.term
}

func (s *Server) sendCandidateProposalToPeer(peer string, term int) error {
    msg := Message{
        Type:      MessageProposal,
        Candidate: s.cfg.Node,
        Term:      term,
    }
    return s.sendUDPMessage(msg, peer)
}

func (s *Server) upgradeSelfToLeader() {
    s.mtex.Lock()
    defer s.mtex.Unlock()
    s.nodeType = NodeTypeLeader
    s.leader = ""

    _ = s.scheduler.AddWithID(ScheduleHeartbeat, &tasks.Task{
        Interval: s.cfg.HeartbeatInterval,
        TaskFunc: s.heartbeatFunc,
        ErrFunc:  s.heartbeatErrorFunc,
    })

    s.scheduler.Del(ScheduleLeaderHeartbeatTimeout)

    slog.Info("promoted self to leader", "node", s.cfg.Node, "term", s.term)
}

func (s *Server) leaderHeartbeatTimeoutErrorFunc(err error) {
    s.mtex.Lock()
    defer s.mtex.Unlock()
    s.nodeType = NodeTypeFollower

    slog.Error("error encountered on leader_heartbeat_timeout task", "error", err)
}

// sendUDPMessage marshals and sends a Message to a peer via UDP
func (s *Server) sendUDPMessage(msg Message, peer string) error {
    data, err := json.Marshal(msg)
    if err != nil {
        return err
    }
    addr, err := net.ResolveUDPAddr("udp", peer)
    if err != nil {
        return err
    }
    _, err = s.conn.WriteToUDP(data, addr)
    if err != nil {
        slog.Error("failed to send message", "error", err, "peer", peer)
    } else {
        slog.Info("message sent", "type", msg.Type, "peer", peer, "term", msg.Term)
    }
    return err
}
