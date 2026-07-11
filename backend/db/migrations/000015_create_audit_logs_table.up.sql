CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    actor_user_id TEXT,
    actor_role VARCHAR(50),

    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id TEXT,

    description TEXT,
    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT audit_logs_actor_user_id_fk
        FOREIGN KEY (actor_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT audit_logs_action_not_empty_check
        CHECK (LENGTH(TRIM(action)) > 0),

    CONSTRAINT audit_logs_entity_type_not_empty_check
        CHECK (LENGTH(TRIM(entity_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
    ON audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
    ON audit_logs(actor_user_id);
