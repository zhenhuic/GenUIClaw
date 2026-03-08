package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "9527"
	}

	rm := NewRoomManager()

	mux := http.NewServeMux()

	// WebSocket endpoints
	mux.HandleFunc("/ws/desktop", handleDesktopWS(rm))
	mux.HandleFunc("/ws/mobile", handleMobileWS(rm))

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok","rooms":%d}`, rm.RoomCount())
	})

	// Static files for mobile web app (optional — served from ./static/)
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "./static"
	}
	if info, err := os.Stat(staticDir); err == nil && info.IsDir() {
		fs := http.FileServer(http.Dir(staticDir))
		mux.Handle("/app/", http.StripPrefix("/app/", fs))
		log.Printf("[Relay] Serving static files from %s at /app/", staticDir)
	}

	addr := ":" + port
	log.Printf("[Relay] GenUIClaw Relay Server starting on %s", addr)
	log.Printf("[Relay] Desktop endpoint: ws://localhost%s/ws/desktop", addr)
	log.Printf("[Relay] Mobile endpoint:  ws://localhost%s/ws/mobile", addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("[Relay] Server error: %v", err)
	}
}
