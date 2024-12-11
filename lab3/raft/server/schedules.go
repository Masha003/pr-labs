package server

import (
	"sync"
	"time"
)

type Scheduler struct {
	tasks  map[string]*time.Timer
	mutex  sync.Mutex
}

func NewScheduler() *Scheduler {
	return &Scheduler{
		tasks: make(map[string]*time.Timer),
	}
}

func (s *Scheduler) ScheduleTask(id string, delay time.Duration, task func()) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if existing, ok := s.tasks[id]; ok {
		existing.Stop()
	}
	s.tasks[id] = time.AfterFunc(delay, func() {
		s.mutex.Lock()
		defer s.mutex.Unlock()
		task()
		delete(s.tasks, id)
	})
}

func (s *Scheduler) CancelTask(id string) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if timer, ok := s.tasks[id]; ok {
		timer.Stop()
		delete(s.tasks, id)
	}
}
