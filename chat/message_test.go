package chat

import (
	"encoding/json"
	"testing"
	"time"
)

func TestTextBodyRoundTrip(t *testing.T) {
	b := TextBody("hello world")
	if b.Text() != "hello world" {
		t.Errorf("Text() = %q, want %q", b.Text(), "hello world")
	}
}

func TestBodyTextFallback(t *testing.T) {
	b := Body{"key": "value", "num": float64(42)}
	text := b.Text()
	// No "body" key, so it falls back to JSON
	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(text), &parsed); err != nil {
		t.Fatalf("fallback text is not valid JSON: %v", err)
	}
}

func TestBodyScanAndValue(t *testing.T) {
	original := Body{"body": "test", "extra": float64(123)}
	val, err := original.Value()
	if err != nil {
		t.Fatalf("Value: %v", err)
	}

	// Body.Scan populates the existing map (like sqlx does with struct fields).
	// We need to initialize the map first since Scan uses json.Unmarshal into
	// the receiver map.
	restored := make(Body)
	if err := restored.Scan(val); err != nil {
		t.Fatalf("Scan: %v", err)
	}
	if restored.Text() != "test" {
		t.Errorf("expected text 'test', got %q", restored.Text())
	}
	if restored["extra"] != float64(123) {
		t.Errorf("expected extra 123, got %v", restored["extra"])
	}
}

func TestBodyScanInvalidType(t *testing.T) {
	var b Body
	if err := b.Scan(12345); err == nil {
		t.Fatal("expected error scanning non-string")
	}
}

func TestTimestampScanAndValue(t *testing.T) {
	original := Timestamp{time.Date(2025, 6, 15, 10, 30, 0, 0, time.UTC)}
	val, err := original.Value()
	if err != nil {
		t.Fatalf("Value: %v", err)
	}

	var restored Timestamp
	str, ok := val.(string)
	if !ok {
		t.Fatal("expected string from Value")
	}
	if err := restored.Scan(str); err != nil {
		t.Fatalf("Scan: %v", err)
	}
	if !restored.Time.Equal(original.Time) {
		t.Errorf("expected %v, got %v", original.Time, restored.Time)
	}
}

func TestTimestampScanInvalidType(t *testing.T) {
	var ts Timestamp
	if err := ts.Scan(12345); err == nil {
		t.Fatal("expected error scanning non-string")
	}
}

func TestTimestampJSON(t *testing.T) {
	ts := Timestamp{time.Date(2025, 3, 15, 8, 0, 0, 0, time.UTC)}
	data, err := json.Marshal(ts)
	if err != nil {
		t.Fatal(err)
	}
	var restored Timestamp
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatal(err)
	}
	if !restored.Time.Equal(ts.Time) {
		t.Errorf("expected %v, got %v", ts.Time, restored.Time)
	}
}

func TestBodyUnmarshalGQLObject(t *testing.T) {
	var b Body
	input := map[string]interface{}{"body": "from gql", "tag": "test"}
	if err := b.UnmarshalGQL(input); err != nil {
		t.Fatal(err)
	}
	if b.Text() != "from gql" {
		t.Errorf("expected 'from gql', got %q", b.Text())
	}
}

func TestBodyUnmarshalGQLString(t *testing.T) {
	var b Body
	if err := b.UnmarshalGQL("plain text"); err != nil {
		t.Fatal(err)
	}
	if b.Text() != "plain text" {
		t.Errorf("expected 'plain text', got %q", b.Text())
	}
}

func TestBodyUnmarshalGQLInvalid(t *testing.T) {
	var b Body
	if err := b.UnmarshalGQL(12345); err == nil {
		t.Fatal("expected error for int input")
	}
}

func TestTimestampUnmarshalGQL(t *testing.T) {
	var ts Timestamp

	// RFC3339
	if err := ts.UnmarshalGQL("2025-06-15T10:30:00Z"); err != nil {
		t.Fatalf("RFC3339: %v", err)
	}

	// RFC3339Nano
	if err := ts.UnmarshalGQL("2025-06-15T10:30:00.123456789Z"); err != nil {
		t.Fatalf("RFC3339Nano: %v", err)
	}

	// Invalid
	if err := ts.UnmarshalGQL("not-a-date"); err == nil {
		t.Fatal("expected error for invalid date")
	}

	// Wrong type
	if err := ts.UnmarshalGQL(12345); err == nil {
		t.Fatal("expected error for non-string")
	}
}

func TestNewMessage(t *testing.T) {
	msg := NewMessage("alice", TextBody("hi"), "")
	if msg.User != "alice" {
		t.Errorf("expected user alice, got %s", msg.User)
	}
	if msg.Body.Text() != "hi" {
		t.Errorf("expected body hi, got %s", msg.Body.Text())
	}
	if msg.ID == "" {
		t.Error("expected non-empty ID")
	}
	if msg.Timestamp.IsZero() {
		t.Error("expected non-zero timestamp")
	}
}
