CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    service_request_id TEXT,
    sender_user_id TEXT,
    recipient_user_id TEXT,

    subject VARCHAR(200),
    body TEXT NOT NULL,

    message_type VARCHAR(30) NOT NULL DEFAULT 'message',
    visibility VARCHAR(30) NOT NULL DEFAULT 'conversation',

    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT messages_service_request_id_fk
        FOREIGN KEY (service_request_id)
        REFERENCES service_requests(id)
        ON DELETE CASCADE,

    CONSTRAINT messages_sender_user_id_fk
        FOREIGN KEY (sender_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT messages_recipient_user_id_fk
        FOREIGN KEY (recipient_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT messages_message_type_check
        CHECK (
            message_type IN (
                'message',
                'note',
                'system',
                'status_update'
            )
        ),

    CONSTRAINT messages_visibility_check
        CHECK (
            visibility IN (
                'conversation',
                'staff',
                'admin'
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_messages_service_request_id
    ON messages(service_request_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_user_id
    ON messages(sender_user_id);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_user_id
    ON messages(recipient_user_id);

CREATE INDEX IF NOT EXISTS idx_messages_message_type
    ON messages(message_type);

CREATE INDEX IF NOT EXISTS idx_messages_visibility
    ON messages(visibility);

CREATE INDEX IF NOT EXISTS idx_messages_is_internal
    ON messages(is_internal);

CREATE INDEX IF NOT EXISTS idx_messages_is_read
    ON messages(is_read);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
    ON messages(created_at DESC);