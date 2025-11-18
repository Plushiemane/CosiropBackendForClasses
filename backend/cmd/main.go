package main

import (
    "context"
    "fmt"
    "log"
    "net/http"
    "os"
    "os/signal"
    "time"
	"backend/api"
)

func main() {
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    // Setup API routes
    mux := api.SetupRoutes()

    srv := &http.Server{
        Addr:    ":" + port,
        Handler: mux,
    }

    // Graceful shutdown
    idleConnsClosed := make(chan struct{})
    go func() {
        c := make(chan os.Signal, 1)
        signal.Notify(c, os.Interrupt)
        <-c
        log.Println("Shutdown signal received...")
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        _ = srv.Shutdown(ctx)
        close(idleConnsClosed)
    }()

    fmt.Printf("Backend HTTP API listening on http://localhost:%s\n", port)
    if err := srv.ListenAndServe(); err != http.ErrServerClosed {
        log.Fatalf("Server error: %v", err)
    }

    <-idleConnsClosed
    log.Println("Server stopped")
}