package main

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Room represents a paired desktop + mobile session.
type Room struct {
	DeviceCode  string
	DesktopConn *websocket.Conn
	MobileConn  *websocket.Conn
	CreatedAt   time.Time
	mu          sync.Mutex
}

// RoomManager manages all active rooms.
type RoomManager struct {
	mu    sync.RWMutex
	rooms map[string]*Room // deviceCode → Room
}

func NewRoomManager() *RoomManager {
	rm := &RoomManager{
		rooms: make(map[string]*Room),
	}
	// Start background cleanup of expired rooms
	go rm.cleanup()
	return rm
}

// CreateRoom registers a new room for a desktop client.
func (rm *RoomManager) CreateRoom(code string, desktopConn *websocket.Conn) *Room {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	// Remove existing room with same code if any
	if old, ok := rm.rooms[code]; ok {
		old.Close()
	}

	room := &Room{
		DeviceCode:  code,
		DesktopConn: desktopConn,
		CreatedAt:   time.Now(),
	}
	rm.rooms[code] = room
	return room
}

// GetRoom looks up a room by device code.
func (rm *RoomManager) GetRoom(code string) *Room {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	return rm.rooms[code]
}

// RemoveRoom removes a room by device code.
func (rm *RoomManager) RemoveRoom(code string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	if room, ok := rm.rooms[code]; ok {
		room.Close()
		delete(rm.rooms, code)
	}
}

// RoomCount returns the number of active rooms.
func (rm *RoomManager) RoomCount() int {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	return len(rm.rooms)
}

// cleanup periodically removes rooms older than 24 hours with no mobile connection.
func (rm *RoomManager) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		rm.mu.Lock()
		now := time.Now()
		for code, room := range rm.rooms {
			room.mu.Lock()
			idle := room.MobileConn == nil && now.Sub(room.CreatedAt) > 24*time.Hour
			room.mu.Unlock()
			if idle {
				room.Close()
				delete(rm.rooms, code)
			}
		}
		rm.mu.Unlock()
	}
}

// SetMobile attaches a mobile connection to the room.
func (r *Room) SetMobile(conn *websocket.Conn) {
	r.mu.Lock()
	defer r.mu.Unlock()
	// Close previous mobile connection if any
	if r.MobileConn != nil {
		r.MobileConn.Close()
	}
	r.MobileConn = conn
}

// ClearMobile removes the mobile connection.
func (r *Room) ClearMobile() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.MobileConn = nil
}

// SendToDesktop forwards raw bytes to the desktop client.
func (r *Room) SendToDesktop(data []byte) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.DesktopConn == nil {
		return nil
	}
	return r.DesktopConn.WriteMessage(websocket.TextMessage, data)
}

// SendToMobile forwards raw bytes to the mobile client.
func (r *Room) SendToMobile(data []byte) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.MobileConn == nil {
		return nil
	}
	return r.MobileConn.WriteMessage(websocket.TextMessage, data)
}

// Close terminates both connections.
func (r *Room) Close() {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.DesktopConn != nil {
		r.DesktopConn.Close()
		r.DesktopConn = nil
	}
	if r.MobileConn != nil {
		r.MobileConn.Close()
		r.MobileConn = nil
	}
}
