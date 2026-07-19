CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    user_id TEXT NOT NULL,

    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,

    notification_type VARCHAR(50) NOT NULL DEFAULT 'general',
    entity_type VARCHAR(50),
    entity_id TEXT,
    action_url TEXT,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT notifications_user_id_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT notifications_type_check
        CHECK (
            notification_type IN (
                'general',
                'blog',
                'service_request',
                'document',
                'message',
                'consultation',
                'assignment',
                'system'
            )
        ),

    CONSTRAINT notifications_title_not_empty_check
        CHECK (LENGTH(TRIM(title)) > 0),

    CONSTRAINT notifications_body_not_empty_check
        CHECK (LENGTH(TRIM(body)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_type
    ON notifications(notification_type);

CREATE INDEX IF NOT EXISTS idx_notifications_entity
    ON notifications(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
    ON notifications(created_at DESC);