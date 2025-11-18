package api

import (
	"encoding/json"
	"log"
	"net/http"
	"runtime"
	"fmt"
	"go.bug.st/serial"

	"backend/services"
	"backend/types"
)

type ProgramPayload struct {
	Program string `json:"program"`
}

var savedProgram string

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, map[string]string{"status": "ok"})
}

func getProgramHandler(w http.ResponseWriter) {
	writeJSON(w, ProgramPayload{Program: savedProgram})
}

func saveProgramHandler(w http.ResponseWriter, r *http.Request) {
	var p ProgramPayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	savedProgram = p.Program
	log.Println("Program saved (length):", len(savedProgram))
	writeJSON(w, map[string]string{"result": "saved"})
}

func sendProgramHandler(w http.ResponseWriter, r *http.Request) {
	var p ProgramPayload
	if r.ContentLength != 0 {
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
	} else {
		p.Program = savedProgram
	}

	if p.Program == "" {
		http.Error(w, "no program provided", http.StatusBadRequest)
		return
	}

	result, err := services.SendToSerial(p.Program)
	if err != nil {
		log.Printf("Failed to send program: %v", err)
		http.Error(w, "failed to send program: "+err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, result)
}

func getConfigHandler(w http.ResponseWriter) {
	cfg := services.GetConfig()
	writeJSON(w, cfg)
}

func updateConfigHandler(w http.ResponseWriter, r *http.Request) {
	var cfg types.SerialConfig
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	if err := services.UpdateConfig(cfg); err != nil {
		log.Printf("Failed to update config: %v", err)
		http.Error(w, "failed to update config: "+err.Error(), http.StatusBadRequest)
		return
	}

	writeJSON(w, map[string]string{"result": "config updated"})
}

func getSystemOSHandler(w http.ResponseWriter) {
	writeJSON(w, map[string]string{
		"os": runtime.GOOS,
	})
}

func getAvailablePortsHandler(w http.ResponseWriter) {
	ports, err := serial.GetPortsList()
	if err != nil {
		http.Error(w, "failed to list ports: "+err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string][]string{
		"ports": ports,
	})
}

// ReadPositionPayload is used to request reading a stored position slot
type ReadPositionPayload struct {
	Slot int `json:"slot"`
}

func readPositionHandler(w http.ResponseWriter, r *http.Request) {
	var p ReadPositionPayload
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	if p.Slot < 0 {
		http.Error(w, "invalid slot", http.StatusBadRequest)
		return
	}

	// Build rd command (use channel 00)
	cmd := fmt.Sprintf("00 rd %d", p.Slot)
	result, err := services.SendToSerial(cmd)
	if err != nil {
		log.Printf("Failed to rd slot %d: %v", p.Slot, err)
		http.Error(w, "failed to read slot: "+err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, result)
}