CREATE TABLE IF NOT EXISTS tax_credential_systems (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    system_name VARCHAR(150) NOT NULL,
    login_url TEXT NOT NULL,
    description TEXT,

    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_by_user_id TEXT,
    updated_by_user_id TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tax_credential_systems_system_name_not_empty_check
        CHECK (LENGTH(TRIM(system_name)) > 0),

    CONSTRAINT tax_credential_systems_login_url_not_empty_check
        CHECK (LENGTH(TRIM(login_url)) > 0),

    CONSTRAINT tax_credential_systems_display_order_check
        CHECK (display_order >= 0),

    CONSTRAINT tax_credential_systems_system_name_unique
        UNIQUE (system_name),

    CONSTRAINT tax_credential_systems_created_by_user_id_fk
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT tax_credential_systems_updated_by_user_id_fk
        FOREIGN KEY (updated_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tax_credential_systems_active
    ON tax_credential_systems(is_active);

CREATE INDEX IF NOT EXISTS idx_tax_credential_systems_display_order
    ON tax_credential_systems(display_order, created_at);

INSERT INTO tax_credential_systems (
    system_name,
    login_url,
    description,
    display_order,
    is_active
)
VALUES
    (
        'RRA Tax Portal',
        'https://etax.rra.gov.rw/',
        'Rwanda Revenue Authority online tax declaration and taxpayer services portal.',
        1,
        TRUE
    ),
    (
        'RRA EBM',
        'https://ebm.rra.gov.rw/',
        'Rwanda Revenue Authority Electronic Billing Machine system.',
        2,
        TRUE
    )
ON CONFLICT (system_name) DO NOTHING;