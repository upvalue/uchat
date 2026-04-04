-- +goose Up
CREATE TABLE rooms (
    folder     TEXT NOT NULL DEFAULT '',
    name       TEXT NOT NULL,
    description TEXT,
    position   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    PRIMARY KEY (folder, name)
);

CREATE TABLE messages (
    id        TEXT PRIMARY KEY,
    room      TEXT NOT NULL,
    user      TEXT NOT NULL,
    body      TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    source    TEXT NOT NULL DEFAULT 'web',
    revision  INTEGER NOT NULL DEFAULT 1,
    streaming TEXT
);
CREATE INDEX idx_messages_room_timestamp ON messages(room, timestamp);

CREATE TABLE read_markers (
    room      TEXT NOT NULL,
    user      TEXT NOT NULL,
    last_read TEXT NOT NULL,
    PRIMARY KEY (room, user)
);

-- +goose Down
DROP TABLE read_markers;
DROP TABLE messages;
DROP TABLE rooms;
