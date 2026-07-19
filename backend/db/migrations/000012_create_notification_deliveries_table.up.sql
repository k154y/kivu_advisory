CREATE TABLE IF NOT EXISTS notification_deliveries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    notification_id TEXT NOT NULL,
    user_id TEXT NOT NULL,

    channel VARCHAR(30) NOT NULL,
    recipient VARCHAR(255) NOT NULL,

    subject VARCHAR(255),
    message TEXT NOT NULL,

    provider VARCHAR(100),
    provider_message_id TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,

    error_message TEXT,
    sent_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT notification_deliveries_notification_id_fk
        FOREIGN KEY (notification_id)
        REFERENCES notifications(id)
        ON DELETE CASCADE,

    CONSTRAINT notification_deliveries_user_id_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT notification_deliveries_channel_check
        CHECK (
            channel IN (
                'in_app',
                'email',
                'sms'
            )
        ),

    CONSTRAINT notification_deliveries_status_check
        CHECK (
            status IN (
                'pending',
                'sent',
                'failed',
                'skipped'
            )
        ),

    CONSTRAINT notification_deliveries_attempt_count_check
        CHECK (attempt_count >= 0),

    CONSTRAINT notification_deliveries_recipient_not_empty_check
        CHECK (LENGTH(TRIM(recipient)) > 0),

    CONSTRAINT notification_deliveries_message_not_empty_check
        CHECK (LENGTH(TRIM(message)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification_id
    ON notification_deliveries(notification_id);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_id
    ON notification_deliveries(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_channel
    ON notification_deliveries(channel);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status
    ON notification_deliveries(status);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_created_at
    ON notification_deliveries(created_at DESC);