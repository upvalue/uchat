package chat

import (
	"fmt"
	"regexp"
	"strings"
)

// validRoom allows alphanumeric characters, hyphens, and spaces.
// Must not be empty, must not start/end with a space or hyphen.
var validRoom = regexp.MustCompile(`^[a-zA-Z0-9]+([a-zA-Z0-9 -]*[a-zA-Z0-9]+)?$`)

// ValidateRoomName checks that a room name contains only alphanumeric
// characters, hyphens, and spaces. It must not be empty or start/end
// with a hyphen or space.
func ValidateRoomName(name string) error {
	if name == "" {
		return fmt.Errorf("room name must not be empty")
	}
	if !validRoom.MatchString(name) {
		return fmt.Errorf("invalid room name %q: must be alphanumeric with hyphens and spaces", name)
	}
	return nil
}

// ValidateRoomPath validates a room path ("folder/name" or just "name").
// Both folder and name components must pass ValidateRoomName.
func ValidateRoomPath(path string) error {
	if path == "" {
		return fmt.Errorf("room path must not be empty")
	}
	if i := strings.Index(path, "/"); i >= 0 {
		folder, name := path[:i], path[i+1:]
		if err := ValidateRoomName(folder); err != nil {
			return fmt.Errorf("invalid folder in room path: %w", err)
		}
		if strings.Contains(name, "/") {
			return fmt.Errorf("room path may only contain one slash (folder/name)")
		}
		return ValidateRoomName(name)
	}
	return ValidateRoomName(path)
}

// RoomPath joins folder and name into a path identifier.
// Returns "folder/name" if folder is non-empty, otherwise just "name".
func RoomPath(folder, name string) string {
	if folder == "" {
		return name
	}
	return folder + "/" + name
}

// ParseRoomPath splits a room path into folder and name components.
// "folder/name" → ("folder", "name"), "name" → ("", "name").
func ParseRoomPath(path string) (folder, name string) {
	if i := strings.Index(path, "/"); i >= 0 {
		return path[:i], path[i+1:]
	}
	return "", path
}
