package main

import (
	"fmt"
	"log"
	"log/slog"
	"os"

	"uchat/chat"
	"uchat/config"
	"uchat/server"

	"github.com/urfave/cli/v2"
)

func main() {
	app := &cli.App{
		Name:  "uchat",
		Usage: "Simple chat application backed by SQLite",
		Flags: []cli.Flag{
			&cli.StringFlag{
				Name:    "server",
				Value:   "http://localhost:6767",
				Usage:   "Server URL",
				EnvVars: []string{"UCHAT_SERVER"},
			},
		},
		Commands: []*cli.Command{
			{
				Name:  "serve",
				Usage: "Start the HTTP server",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:    "db",
						Value:   "uchat.db",
						Usage:   "SQLite database path",
						EnvVars: []string{"UCHAT_DB"},
					},
					&cli.StringFlag{
						Name:  "addr",
						Value: ":6767",
						Usage: "Listen address",
					},
					&cli.StringFlag{
						Name:    "config",
						Value:   "config.toml",
						Usage:   "Path to config file",
						EnvVars: []string{"UCHAT_CONFIG"},
					},
					&cli.StringFlag{
						Name:    "data",
						Value:   "data",
						Usage:   "Path to data directory (served at /data/)",
						EnvVars: []string{"UCHAT_DATA"},
					},
				},
				Action: serveAction,
			},
			{
				Name:  "migrate",
				Usage: "Run database migrations",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:    "db",
						Value:   "uchat.db",
						Usage:   "SQLite database path",
						EnvVars: []string{"UCHAT_DB"},
					},
				},
				Action: migrateAction,
			},
			{
				Name:      "view",
				Usage:     "View messages in a chatroom",
				ArgsUsage: "<room>",
				Action:    viewAction,
			},
			{
				Name:      "send",
				Usage:     "Send a message to a chatroom",
				ArgsUsage: "<room>",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:     "message",
						Aliases:  []string{"m"},
						Usage:    "Message text",
						Required: true,
					},
					&cli.StringFlag{
						Name:     "user",
						Aliases:  []string{"u"},
						Usage:    "Username",
						Required: true,
					},
				},
				Action: sendAction,
			},
			{
				Name:      "edit",
				Usage:     "Edit a message",
				ArgsUsage: "<message-id>",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:     "message",
						Aliases:  []string{"m"},
						Usage:    "New message text",
						Required: true,
					},
				},
				Action: editAction,
			},
		},
	}

	if err := app.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}

func migrateAction(c *cli.Context) error {
	store, err := chat.NewStore(c.String("db"))
	if err != nil {
		return err
	}
	defer store.Close()
	fmt.Println("Migrations complete.")
	return nil
}

func openClient(c *cli.Context) *chat.HTTPClient {
	return chat.NewHTTPClient(c.String("server"))
}

func serveAction(c *cli.Context) error {
	cfg, err := config.Load(c.String("config"))
	if err != nil {
		return err
	}

	dataPath := c.String("data")
	if err := os.MkdirAll(dataPath, 0755); err != nil {
		return fmt.Errorf("creating data directory: %w", err)
	}

	store, err := chat.NewStore(c.String("db"))
	if err != nil {
		return err
	}
	defer store.Close()
	broker := chat.NewBroker()
	addr := c.String("addr")
	slog.Info("uchat server starting", "addr", addr, "db", c.String("db"), "data", dataPath)
	return server.New(store, broker, cfg, dataPath).Listen(addr)
}

func viewAction(c *cli.Context) error {
	room := c.Args().First()
	if room == "" {
		return fmt.Errorf("room name is required")
	}

	client := openClient(c)
	messages, err := client.GetMessages(room)
	if err != nil {
		return err
	}

	if len(messages) == 0 {
		fmt.Println("No messages yet.")
		return nil
	}

	for _, msg := range messages {
		fmt.Printf("[%s] %s: %s\n", msg.Timestamp.Format("15:04:05"), msg.User, msg.Body.Text())
	}
	return nil
}

func sendAction(c *cli.Context) error {
	room := c.Args().First()
	if room == "" {
		return fmt.Errorf("room name is required")
	}

	client := openClient(c)
	msg, err := client.Send(room, c.String("user"), c.String("message"))
	if err != nil {
		return err
	}

	fmt.Printf("Sent %s to %s\n", msg.ID, room)
	return nil
}

func editAction(c *cli.Context) error {
	id := c.Args().First()
	if id == "" {
		return fmt.Errorf("message ID is required")
	}

	client := openClient(c)
	if err := client.EditMessage(id, c.String("message")); err != nil {
		return err
	}

	fmt.Printf("Updated %s\n", id)
	return nil
}
