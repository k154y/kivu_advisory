CREATE TABLE IF NOT EXISTS client_tax_credentials (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    client_id TEXT NOT NULL,
    system_id TEXT NOT NULL,

    username TEXT NOT NULL,
    encrypted_password TEXT NOT NULL,
    notes TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_by_user_id TEXT,
    updated_by_user_id TEXT,

    last_revealed_at TIMESTAMPTZ,
    last_revealed_by_user_id TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT client_tax_credentials_username_not_empty_check
        CHECK (LENGTH(TRIM(username)) > 0),

    CONSTRAINT client_tax_credentials_encrypted_password_not_empty_check
        CHECK (LENGTH(TRIM(encrypted_password)) > 0),

    CONSTRAINT client_tax_credentials_client_id_fk
        FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON DELETE CASCADE,

    CONSTRAINT client_tax_credentials_system_id_fk
        FOREIGN KEY (system_id)
        REFERENCES tax_credential_systems(id)
        ON DELETE CASCADE,

    CONSTRAINT client_tax_credentials_created_by_user_id_fk
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT client_tax_credentials_updated_by_user_id_fk
        FOREIGN KEY (updated_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT client_tax_credentials_last_revealed_by_user_id_fk
        FOREIGN KEY (last_revealed_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT client_tax_credentials_client_system_unique
        UNIQUE (client_id, system_id)
);

CREATE INDEX IF NOT EXISTS idx_client_tax_credentials_client_id
    ON client_tax_credentials(client_id);

CREATE INDEX IF NOT EXISTS idx_client_tax_credentials_system_id
    ON client_tax_credentials(system_id);

CREATE INDEX IF NOT EXISTS idx_client_tax_credentials_active
    ON client_tax_credentials(is_active);

CREATE INDEX IF NOT EXISTS idx_client_tax_credentials_created_at
    ON client_tax_credentials(created_at);