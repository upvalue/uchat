package chat

import (
	"context"
	"embed"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"
	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var migrations embed.FS

type Store struct {
	db *sqlx.DB
}

func NewStore(dbPath string) (*Store, error) {
	db, err := sqlx.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("opening database: %w", err)
	}
	// SQLite only supports one writer; a pool of connections causes SQLITE_BUSY
	// since pragmas (busy_timeout, journal_mode) are per-connection and won't
	// apply to other connections in the pool.
	db.SetMaxOpenConns(1)
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("connecting to database: %w", err)
	}

	// Set pragmas explicitly (modernc.org/sqlite ignores DSN-style pragma params).
	for _, pragma := range []string{
		"PRAGMA journal_mode=WAL",
		"PRAGMA busy_timeout=5000",
		"PRAGMA foreign_keys=ON",
	} {
		if _, err := db.Exec(pragma); err != nil {
			return nil, fmt.Errorf("%s: %w", pragma, err)
		}
	}

	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		return nil, fmt.Errorf("running migrations: %w", err)
	}
	return s, nil
}

func (s *Store) migrate() error {
	goose.SetBaseFS(migrations)
	goose.SetLogger(goose.NopLogger())
	if err := goose.SetDialect("sqlite3"); err != nil {
		return err
	}
	return goose.Up(s.db.DB, "migrations")
}

// Send stores a message. The room parameter is a room path ("folder/name" or "name").
// Auto-creates the room if it doesn't exist.
func (s *Store) Send(ctx context.Context, room string, msg Message) error {
	bodyVal, err := msg.Body.Value()
	if err != nil {
		return err
	}
	ts := msg.Timestamp.UTC().Format(timestampFormat)

	folder, name := ParseRoomPath(room)

	// Ensure the room exists (auto-create for backward compat with bots/API).
	_, err = s.db.ExecContext(ctx,
		`INSERT INTO rooms (folder, name, position, created_at)
		 VALUES (?, ?, COALESCE((SELECT MAX(position) FROM rooms), -1) + 1, ?)
		 ON CONFLICT(folder, name) DO NOTHING`,
		folder, name, ts,
	)
	if err != nil {
		return fmt.Errorf("ensuring room: %w", err)
	}

	var streamingVal interface{}
	if msg.Streaming != nil {
		streamingVal = msg.Streaming.UTC().Format(timestampFormat)
	}

	_, err = s.db.ExecContext(ctx,
		`INSERT INTO messages (id, room, user, body, timestamp, source, revision, streaming) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		msg.ID, room, msg.User, bodyVal, ts, msg.Source, msg.Revision, streamingVal,
	)
	return err
}

func (s *Store) GetMessages(ctx context.Context, room string) ([]Message, error) {
	var messages []Message
	err := s.db.SelectContext(ctx, &messages,
		`SELECT id, room, user, body, timestamp, source, revision, streaming FROM messages WHERE room = ? ORDER BY timestamp ASC`, room,
	)
	return messages, err
}

func (s *Store) GetMessage(ctx context.Context, id string) (*Message, error) {
	var msg Message
	err := s.db.GetContext(ctx, &msg,
		`SELECT id, room, user, body, timestamp, source, revision, streaming FROM messages WHERE id = ?`, id,
	)
	if err != nil {
		return nil, fmt.Errorf("message %s not found", id)
	}
	return &msg, nil
}

type RoomRow struct {
	Name        string  `db:"name"`
	Folder      string  `db:"folder"`
	Description *string `db:"description"`
	Position    int     `db:"position"`
	CreatedAt   string  `db:"created_at"`
}

// Path returns the room path ("folder/name" or just "name").
func (r RoomRow) Path() string {
	return RoomPath(r.Folder, r.Name)
}

func (s *Store) CreateRoom(ctx context.Context, name string, folder string, description *string) (RoomRow, error) {
	now := time.Now().UTC().Format(timestampFormat)
	var pos int
	err := s.db.GetContext(ctx, &pos, `SELECT COALESCE(MAX(position), -1) + 1 FROM rooms`)
	if err != nil {
		return RoomRow{}, fmt.Errorf("getting next position: %w", err)
	}
	_, err = s.db.ExecContext(ctx,
		`INSERT INTO rooms (folder, name, description, position, created_at) VALUES (?, ?, ?, ?, ?)
		 ON CONFLICT (folder, name) DO UPDATE SET description = COALESCE(excluded.description, rooms.description)`,
		folder, name, description, pos, now,
	)
	if err != nil {
		return RoomRow{}, fmt.Errorf("creating room: %w", err)
	}
	var room RoomRow
	err = s.db.GetContext(ctx, &room,
		`SELECT folder, name, description, position, created_at FROM rooms WHERE folder = ? AND name = ?`, folder, name)
	if err != nil {
		return RoomRow{}, fmt.Errorf("fetching room: %w", err)
	}
	return room, nil
}

func (s *Store) ListRooms(ctx context.Context, folder *string) ([]RoomRow, error) {
	var rooms []RoomRow
	var err error
	if folder != nil {
		err = s.db.SelectContext(ctx, &rooms,
			`SELECT folder, name, description, position, created_at FROM rooms WHERE folder = ? ORDER BY position DESC, name`, *folder,
		)
	} else {
		err = s.db.SelectContext(ctx, &rooms,
			`SELECT folder, name, description, position, created_at FROM rooms ORDER BY position DESC, name`,
		)
	}
	return rooms, err
}

func (s *Store) UpdateRoom(ctx context.Context, name string, folder string, description *string) (RoomRow, error) {
	_, err := s.db.ExecContext(ctx,
		`UPDATE rooms SET description = ? WHERE folder = ? AND name = ?`,
		description, folder, name,
	)
	if err != nil {
		return RoomRow{}, fmt.Errorf("updating room: %w", err)
	}
	var room RoomRow
	err = s.db.GetContext(ctx, &room,
		`SELECT folder, name, description, position, created_at FROM rooms WHERE folder = ? AND name = ?`, folder, name)
	if err != nil {
		return RoomRow{}, fmt.Errorf("room not found")
	}
	return room, nil
}

func (s *Store) DeleteRoom(ctx context.Context, name string, folder string) error {
	path := RoomPath(folder, name)
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `DELETE FROM read_markers WHERE room = ?`, path); err != nil {
		return fmt.Errorf("deleting read markers: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM messages WHERE room = ?`, path); err != nil {
		return fmt.Errorf("deleting messages: %w", err)
	}
	res, err := tx.ExecContext(ctx, `DELETE FROM rooms WHERE folder = ? AND name = ?`, folder, name)
	if err != nil {
		return fmt.Errorf("deleting room: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("room not found")
	}
	return tx.Commit()
}

func (s *Store) MarkRead(ctx context.Context, room, user, messageID string) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO read_markers (room, user, last_read) VALUES (?, ?, ?)
		 ON CONFLICT(room, user) DO UPDATE SET last_read = excluded.last_read`,
		room, user, messageID,
	)
	return err
}

type UnreadCount struct {
	Room  string `json:"room" db:"room"`
	Count int    `json:"count" db:"count"`
}

func (s *Store) GetUnreadCounts(ctx context.Context, user string) ([]UnreadCount, error) {
	var counts []UnreadCount
	err := s.db.SelectContext(ctx, &counts, `
		SELECT m.room, COUNT(*) as count
		FROM messages m
		LEFT JOIN read_markers rm ON rm.room = m.room AND rm.user = ?
		LEFT JOIN messages lm ON lm.id = rm.last_read
		WHERE (rm.last_read IS NULL OR m.timestamp > lm.timestamp)
		GROUP BY m.room
		HAVING count > 0
		ORDER BY m.room`, user)
	if err != nil {
		return nil, err
	}
	return counts, nil
}

func (s *Store) EditMessage(ctx context.Context, id string, body Body, streaming *Timestamp) error {
	bodyVal, err := body.Value()
	if err != nil {
		return err
	}
	var streamingVal interface{}
	if streaming != nil {
		streamingVal = streaming.UTC().Format(timestampFormat)
	}
	res, err := s.db.ExecContext(ctx, `UPDATE messages SET body = ?, revision = revision + 1, streaming = ? WHERE id = ?`, bodyVal, streamingVal, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("message %s not found", id)
	}
	return nil
}

func (s *Store) Close() error {
	return s.db.Close()
}
