package chat

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"io"
	"time"

	"github.com/rs/xid"
)

// Timestamp wraps time.Time for SQLite text storage and JSON serialization.
type Timestamp struct {
	time.Time
}

const timestampFormat = "2006-01-02T15:04:05.000000Z"

func (t *Timestamp) Scan(src interface{}) error {
	s, ok := src.(string)
	if !ok {
		return fmt.Errorf("expected string for timestamp, got %T", src)
	}
	parsed, err := time.Parse(timestampFormat, s)
	if err != nil {
		return err
	}
	t.Time = parsed
	return nil
}

func (t Timestamp) Value() (driver.Value, error) {
	return t.Time.UTC().Format(timestampFormat), nil
}

func (t Timestamp) MarshalJSON() ([]byte, error) {
	return json.Marshal(t.Time)
}

func (t *Timestamp) UnmarshalJSON(data []byte) error {
	return json.Unmarshal(data, &t.Time)
}

func (t Timestamp) MarshalGQL(w io.Writer) {
	b, _ := json.Marshal(t.Time)
	w.Write(b)
}

func (t *Timestamp) UnmarshalGQL(v interface{}) error {
	s, ok := v.(string)
	if !ok {
		return fmt.Errorf("timestamp must be a string")
	}
	parsed, err := time.Parse(time.RFC3339Nano, s)
	if err != nil {
		parsed, err = time.Parse(time.RFC3339, s)
		if err != nil {
			return err
		}
	}
	t.Time = parsed
	return nil
}

// Body is the JSON payload of a message. Always stored as a JSON object.
// Plain text messages use {"body": "text here"}.
type Body map[string]interface{}

func TextBody(text string) Body {
	return Body{"body": text}
}

func (b Body) Text() string {
	if s, ok := b["body"].(string); ok {
		return s
	}
	raw, _ := json.Marshal(b)
	return string(raw)
}

func (b Body) Scan(src interface{}) error {
	s, ok := src.(string)
	if !ok {
		return fmt.Errorf("expected string for body, got %T", src)
	}
	return json.Unmarshal([]byte(s), &b)
}

func (b Body) Value() (driver.Value, error) {
	raw, err := json.Marshal(b)
	return string(raw), err
}

func (b Body) MarshalGQL(w io.Writer) {
	raw, _ := json.Marshal(b)
	w.Write(raw)
}

func (b *Body) UnmarshalGQL(v interface{}) error {
	switch val := v.(type) {
	case map[string]interface{}:
		*b = Body(val)
		return nil
	case string:
		*b = TextBody(val)
		return nil
	default:
		return fmt.Errorf("body must be an object or string, got %T", v)
	}
}

type Message struct {
	ID        string     `json:"id" db:"id"`
	Room      string     `json:"room" db:"room"`
	User      string     `json:"user" db:"user"`
	Body      Body       `json:"body" db:"body"`
	Timestamp Timestamp  `json:"timestamp" db:"timestamp"`
	Source    string     `json:"source" db:"source"`
	Revision  int        `json:"revision" db:"revision"`
	Streaming *Timestamp `json:"streaming,omitempty" db:"streaming"`
}

func NewMessage(user string, body Body, source string) Message {
	if source == "" {
		source = "web"
	}
	return Message{
		ID:        "msg_" + xid.New().String(),
		User:      user,
		Body:      body,
		Timestamp: Timestamp{time.Now().UTC()},
		Source:    source,
		Revision:  1,
	}
}
