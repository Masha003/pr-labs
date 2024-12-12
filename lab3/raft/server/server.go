package server

import (
	"net"
	"sync"

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