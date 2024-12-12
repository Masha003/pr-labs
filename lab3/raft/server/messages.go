package server

// MessageType identifies the type of message
type MessageType string

const (
    MessageHeartbeat         MessageType = "heartbeat"
    MessageHeartbeatResponse MessageType = "heartbeat_response"
    MessageProposal          MessageType = "proposal"
    MessageProposalResponse  MessageType = "proposal_response"
)

type Message struct {
    Type      MessageType `json:"type"`
    Leader    string      `json:"leader,omitempty"`
    Candidate string      `json:"candidate,omitempty"`
    Term      int         `json:"term,omitempty"`
    Ack       bool        `json:"ack,omitempty"`
    Node      string      `json:"node,omitempty"`
}
