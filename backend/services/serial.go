package services

import (
	"backend/types"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"go.bug.st/serial"
)

var (
	currentConfig = types.SerialConfig{
		PortName:    "COM1",
		BaudRate:    9600,
		DataBits:    8,
		Parity:      "none",
		StopBits:    1,
		FlowControl: "none",
	}
	configMutex sync.RWMutex
)

// GetConfig returns the current serial configuration
func GetConfig() types.SerialConfig {
	configMutex.RLock()
	defer configMutex.RUnlock()
	return currentConfig
}

// UpdateConfig updates the serial port configuration
func UpdateConfig(cfg types.SerialConfig) error {
	// Validate configuration
	if cfg.BaudRate <= 0 {
		return fmt.Errorf("invalid baud rate: %d", cfg.BaudRate)
	}
	if cfg.DataBits < 5 || cfg.DataBits > 8 {
		return fmt.Errorf("invalid data bits: %d (must be 5-8)", cfg.DataBits)
	}
	if cfg.StopBits != 1 && cfg.StopBits != 2 {
		return fmt.Errorf("invalid stop bits: %d (must be 1 or 2)", cfg.StopBits)
	}

	configMutex.Lock()
	defer configMutex.Unlock()

	if cfg.PortName != "" {
		currentConfig.PortName = cfg.PortName
	}
	if cfg.BaudRate > 0 {
		currentConfig.BaudRate = cfg.BaudRate
	}
	if cfg.DataBits > 0 {
		currentConfig.DataBits = cfg.DataBits
	}
	if cfg.Parity != "" {
		currentConfig.Parity = cfg.Parity
	}
	if cfg.StopBits > 0 {
		currentConfig.StopBits = cfg.StopBits
	}
	if cfg.FlowControl != "" {
		currentConfig.FlowControl = cfg.FlowControl
	}

	log.Printf("Serial config updated: Port=%s, Baud=%d, Data=%d, Parity=%s, Stop=%d, Flow=%s",
		currentConfig.PortName, currentConfig.BaudRate, currentConfig.DataBits,
		currentConfig.Parity, currentConfig.StopBits, currentConfig.FlowControl)
	return nil
}

// SendToSerial sends program text to the configured serial port
func SendToSerial(program string) (*types.SerialResult, error) {
	// List available ports for diagnostics
	ports, err := serial.GetPortsList()
	if err != nil {
		log.Printf("Error listing ports: %v", err)
	} else {
		log.Printf("Available ports: %v", ports)
	}

	// Get current config
	cfg := GetConfig()
	log.Printf("Using serial config: Port=%s, Baud=%d, Data=%d, Parity=%s, Stop=%d",
		cfg.PortName, cfg.BaudRate, cfg.DataBits, cfg.Parity, cfg.StopBits)

	// Build try list
	portName := os.Getenv("SERIAL_PORT")
	if portName == "" {
		portName = cfg.PortName
	}

	tryPorts := buildPortList(portName, ports)

	// Try to open a port with current config
	port, openedPort, err := openAvailablePort(tryPorts, cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to open any serial port: %w", err)
	}
	defer port.Close()

	// Normalize the program text
	normalizedProgram := normalizeLineEndings(program)
	programBytes := []byte(normalizedProgram + "\r")

	log.Printf("Writing to %s (baud=%d): %q", openedPort, cfg.BaudRate, programBytes)

	n, err := port.Write(programBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to write to serial port: %w", err)
	}
	log.Printf("Wrote %d bytes to %s", n, openedPort)

	// Try to read response (with timeout)
	port.SetReadTimeout(2 * time.Second)
	buf := make([]byte, 256)
	nr, _ := port.Read(buf)
	resp := ""
	if nr > 0 {
		resp = string(buf[:nr])
		log.Printf("Serial response: %q", resp)
	}

	return &types.SerialResult{
		Result:        "sent",
		Length:        len(program),
		SerialPort:    openedPort,
		SerialWritten: n,
		SerialReply:   resp,
	}, nil
}

func buildPortList(primary string, available []string) []string {
	tryPorts := []string{primary}

	// Add common defaults
	if primary != "COM1" {
		tryPorts = append(tryPorts, "COM1")
	}
	if primary != "COM2" {
		tryPorts = append(tryPorts, "COM2")
	}

	// Add all available ports as fallback
	for _, p := range available {
		found := false
		for _, t := range tryPorts {
			if t == p {
				found = true
				break
			}
		}
		if !found {
			tryPorts = append(tryPorts, p)
		}
	}

	return tryPorts
}

func openAvailablePort(tryPorts []string, cfg types.SerialConfig) (serial.Port, string, error) {
	var lastErr error

	mode := &serial.Mode{
		BaudRate: cfg.BaudRate, // Use config baud rate, not hardcoded 9600
		DataBits: cfg.DataBits,
		Parity:   parseParity(cfg.Parity),
		StopBits: parseStopBits(cfg.StopBits),
	}

	for _, pName := range tryPorts {
		log.Printf("Attempting to open %s with baud=%d, data=%d, parity=%s, stop=%d",
			pName, mode.BaudRate, mode.DataBits, cfg.Parity, cfg.StopBits)

		port, err := serial.Open(pName, mode)
		if err == nil {
			log.Printf("Successfully opened %s with baud rate %d", pName, mode.BaudRate)
			return port, pName, nil
		}

		lastErr = err
		log.Printf("Failed to open %s: %v", pName, err)
	}

	return nil, "", fmt.Errorf("no port available: %w", lastErr)
}

func parseParity(p string) serial.Parity {
	switch p {
	case "even":
		return serial.EvenParity
	case "odd":
		return serial.OddParity
	default:
		return serial.NoParity
	}
}

func parseStopBits(sb int) serial.StopBits {
	if sb == 2 {
		return serial.TwoStopBits
	}
	return serial.OneStopBit
}

// Add this helper function:
func normalizeLineEndings(program string) string {
	// First replace Windows style endings
	program = strings.ReplaceAll(program, "\r\n", "\n")
	// Then replace any remaining single \r
	program = strings.ReplaceAll(program, "\r", "\n")
	// Split into lines and rebuild with only CR (\r) separators
	lines := strings.Split(program, "\n")
	// Filter empty lines and join with CR only
	var nonEmptyLines []string
	for _, line := range lines {
		if strings.TrimSpace(line) != "" {
			nonEmptyLines = append(nonEmptyLines, line)
		}
	}
	return strings.Join(nonEmptyLines, "\r")
}