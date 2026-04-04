package chat

import "testing"

func TestValidateRoomName(t *testing.T) {
	valid := []string{
		"general",
		"dev-ops",
		"Room1",
		"a",
		"my-cool-room-123",
		"ABC",
		"my channel",
		"2026-02-23 12-00-pm",
		"Hello World",
		"room with spaces",
	}
	invalid := []string{
		"",
		" leading",
		"trailing ",
		"-leading",
		"trailing-",
		"no_underscores",
		"no.dots",
		"no/slashes",
		"special@char",
		"-",
		" ",
		"  ",
	}

	for _, name := range valid {
		if err := ValidateRoomName(name); err != nil {
			t.Errorf("expected %q to be valid, got: %v", name, err)
		}
	}
	for _, name := range invalid {
		if err := ValidateRoomName(name); err == nil {
			t.Errorf("expected %q to be invalid, got nil", name)
		}
	}
}
