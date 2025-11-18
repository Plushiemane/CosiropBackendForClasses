package api

import (
	"net/http"
)

// SetupRoutes configures all API routes with CORS
func SetupRoutes() http.Handler {
    mux := http.NewServeMux()
    
    mux.HandleFunc("/api/health", healthHandler)
    mux.HandleFunc("/api/program", func(w http.ResponseWriter, r *http.Request) {
        switch r.Method {
        case http.MethodGet:
            getProgramHandler(w)
        case http.MethodPost:
            saveProgramHandler(w, r)
        default:
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
        }
    })
    mux.HandleFunc("/api/program/send", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost && r.Method != http.MethodGet {
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
            return
        }
        sendProgramHandler(w, r)
    })
    mux.HandleFunc("/api/config", func(w http.ResponseWriter, r *http.Request) {
        switch r.Method {
        case http.MethodGet:
            getConfigHandler(w)
        case http.MethodPost:
            updateConfigHandler(w, r)
        default:
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
        }
    })
    mux.HandleFunc("/api/system/os", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodGet {
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
            return
        }
        getSystemOSHandler(w)
    })
    mux.HandleFunc("/api/serial/ports", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodGet {
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
            return
        }
        getAvailablePortsHandler(w)
    })

    mux.HandleFunc("/api/position/read", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
            return
        }
        readPositionHandler(w, r)
    })

    return withCORS(mux)
}

func withCORS(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        next.ServeHTTP(w, r)
    })
}