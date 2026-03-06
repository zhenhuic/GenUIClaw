package main

// RelayMessage is the top-level message envelope.
// We only parse the "type" field to decide routing; the body is
// forwarded as raw bytes to avoid unnecessary marshal/unmarshal.
type RelayMessage struct {
	Type string `json:"type"` // "request" | "response" | "push" | "control"
}

// ControlMessage is a parsed control frame.
type ControlMessage struct {
	Type    string      `json:"type"`   // always "control"
	Action  string      `json:"action"` // "device_code", "mobile_connected", ...
	Payload interface{} `json:"payload,omitempty"`
}
