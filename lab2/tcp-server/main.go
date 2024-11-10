package main

import (
	"bufio"
	"fmt"
	"net"
	"os"
	"strings"
	"sync"
	"time"

	"golang.org/x/exp/rand"
)

var (
    mu       sync.Mutex
    filePath = "data.txt"
)

func main() {
	ln, err := net.Listen("tcp", "localhost:8080")

	if err != nil {
		fmt.Println("Error: ", err)
		return
	}

	defer ln.Close()

	fmt.Println("Server started on :8080...")


	for {
        conn, err := ln.Accept()
        if err != nil {
            fmt.Println("Error accepting connection:", err)
            continue
        }
        go handleClient(conn)
    }

}


func handleClient(conn net.Conn) {
	defer conn.Close()

	reader := bufio.NewReader(conn)

	for {
		message, err := reader.ReadString('\n')
		if err != nil {
			fmt.Println("Error reading message: ", err)
			return
		}

		command := strings.TrimSpace(message)
		if strings.HasPrefix(command, "write") {
			data := strings.TrimPrefix(command, "write")
			handleWrite(data)
			conn.Write([]byte("Write command executed\n"))

		} else if strings.HasPrefix(command, "read") {
            data := handleRead()
            conn.Write([]byte("Read command result: " + data + "\n"))
        } else {
            conn.Write([]byte("Unknown command\n"))
		}

        time.Sleep(time.Duration(rand.Intn(7)+1) * time.Second)

	}

}

func handleWrite(data string) {
    mu.Lock()
    defer mu.Unlock()

    // Open the file in append mode
    file, err := os.OpenFile(filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
    if err != nil {
        fmt.Println("Error opening file:", err)
        return
    }
    defer file.Close()

    // Write data with a timestamp
    timestamp := time.Now().Format(time.RFC3339)
    entry := fmt.Sprintf("%s: %s\n", timestamp, data)
    if _, err := file.WriteString(entry); err != nil {
        fmt.Println("Error writing to file:", err)
    }
}

func handleRead() string {
    mu.Lock()
    defer mu.Unlock()

    file, err := os.Open(filePath)
    if err != nil {
        fmt.Println("Error opening file:", err)
        return "Error reading file"
    }
    defer file.Close()

    var data []string
    scanner := bufio.NewScanner(file)
    for scanner.Scan() {
        data = append(data, scanner.Text())
    }

    if err := scanner.Err(); err != nil {
        fmt.Println("Error reading file:", err)
        return "Error reading file"
    }

    return strings.Join(data, "\n")
}