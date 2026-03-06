package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins — auth is via token/code
	},
	ReadBufferSize:  8192,
	WriteBufferSize: 8192,
}

// handleDesktopWS handles WebSocket connections from the desktop Electron app.
// The desktop registers a room and receives forwarded requests from the mobile client.
//
// GET /ws/desktop?token=xxx&code=XXXXXX
func handleDesktopWS(rm *RoomManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code == "" || len(code) < 4 || len(code) > 10 {
			http.Error(w, "invalid device code", http.StatusBadRequest)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("[Desktop] Upgrade error: %v", err)
			return
		}

		room := rm.CreateRoom(code, conn)
		log.Printf("[Desktop] Room created: code=%s", code)

		// Send device_code confirmation
		confirm := ControlMessage{
			Type:    "control",
			Action:  "device_code",
			Payload: code,
		}
		confirmBytes, _ := json.Marshal(confirm)
		conn.WriteMessage(websocket.TextMessage, confirmBytes)

		// Read loop: forward desktop messages to mobile
		defer func() {
			rm.RemoveRoom(code)
			log.Printf("[Desktop] Room removed: code=%s", code)
		}()

		for {
			msgType, data, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
					log.Printf("[Desktop] Read error (code=%s): %v", code, err)
				}
				break
			}
			if msgType != websocket.TextMessage {
				continue
			}

			// Peek at the type to handle control messages locally
			var envelope RelayMessage
			if err := json.Unmarshal(data, &envelope); err != nil {
				continue
			}

			switch envelope.Type {
			case "control":
				// Control messages are consumed by the relay, not forwarded
				// (e.g., pong responses)
				continue
			default:
				// Forward everything else (response, push) to mobile as raw bytes
				if err := room.SendToMobile(data); err != nil {
					log.Printf("[Desktop] SendToMobile error (code=%s): %v", code, err)
				}
			}
		}
	}
}

// handleMobileWS handles WebSocket connections from the mobile web client.
// The mobile joins an existing room by device code and sends requests to the desktop.
//
// GET /ws/mobile?code=XXXXXX
func handleMobileWS(rm *RoomManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "missing device code", http.StatusBadRequest)
			return
		}

		room := rm.GetRoom(code)
		if room == nil {
			http.Error(w, "invalid device code", http.StatusNotFound)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("[Mobile] Upgrade error: %v", err)
			return
		}

		room.SetMobile(conn)
		log.Printf("[Mobile] Connected to room: code=%s", code)

		// Notify desktop that a mobile client connected
		notify := ControlMessage{
			Type:   "control",
			Action: "mobile_connected",
		}
		notifyBytes, _ := json.Marshal(notify)
		room.SendToDesktop(notifyBytes)

		// Read loop: forward mobile messages to desktop
		defer func() {
			room.ClearMobile()
			log.Printf("[Mobile] Disconnected from room: code=%s", code)

			// Notify desktop
			disconnectMsg := ControlMessage{
				Type:   "control",
				Action: "mobile_disconnected",
			}
			disconnectBytes, _ := json.Marshal(disconnectMsg)
			room.SendToDesktop(disconnectBytes)
		}()

		for {
			msgType, data, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
					log.Printf("[Mobile] Read error (code=%s): %v", code, err)
				}
				break
			}
			if msgType != websocket.TextMessage {
				continue
			}

			// Forward everything to desktop as raw bytes — zero parsing
			if err := room.SendToDesktop(data); err != nil {
				log.Printf("[Mobile] SendToDesktop error (code=%s): %v", code, err)
			}
		}
	}
}
