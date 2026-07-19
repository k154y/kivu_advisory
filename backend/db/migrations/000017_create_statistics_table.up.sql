CREATE TABLE IF NOT EXISTS statistics (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    value VARCHAR(80) NOT NULL,
    label VARCHAR(150) NOT NULL,
    description TEXT,

    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_by_user_id TEXT,
    updated_by_user_id TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT statistics_value_not_empty_check
        CHECK (LENGTH(TRIM(value)) > 0),

    CONSTRAINT statistics_label_not_empty_check
        CHECK (LENGTH(TRIM(label)) > 0),

    CONSTRAINT statistics_display_order_check
        CHECK (display_order >= 0),

    CONSTRAINT statistics_created_by_user_id_fk
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT statistics_updated_by_user_id_fk
        FOREIGN KEY (updated_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_statistics_active
    ON statistics(is_active);

CREATE INDEX IF NOT EXISTS idx_statistics_display_order
    ON statistics(display_order, created_at);

INSERT INTO statistics (
    value,
    label,
    description,
    display_order,
    is_active
)
VALUES
    ('500+', 'Clients Served', 'Businesses and individuals supported with accounting, tax and advisory services.', 1, TRUE),
    ('10+', 'Years Experience', 'Practical experience in accounting, tax compliance and business advisory.', 2, TRUE),
    ('98%', 'Client Satisfaction', 'Focused on reliable service, clear communication and practical solutions.', 3, TRUE),
    ('24/7', 'Online Support', 'Clients can request services and follow up through the digital platform.', 4, TRUE)
ON CONFLICT DO NOTHING;