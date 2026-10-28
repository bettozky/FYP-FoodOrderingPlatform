-- Remembers the last chat message each person has seen, for unread badges.
CREATE TABLE IF NOT EXISTS chat_read (
    user_id        BIGINT NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    thread_kind    TEXT   NOT NULL CHECK (thread_kind IN ('order', 'reservation')),
    thread_id      BIGINT NOT NULL,
    last_seen_id   BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, thread_kind, thread_id)
);
