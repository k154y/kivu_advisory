CREATE TABLE IF NOT EXISTS content (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    content_key VARCHAR(150) NOT NULL UNIQUE,
    title VARCHAR(200),
    slug VARCHAR(180),

    content_type VARCHAR(50) NOT NULL DEFAULT 'section',

    body TEXT,
    summary VARCHAR(500),

    meta_title VARCHAR(200),
    meta_description VARCHAR(300),

    image_url TEXT,
    button_label VARCHAR(100),
    button_url TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,

    created_by_user_id TEXT,
    updated_by_user_id TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT content_created_by_user_id_fk
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT content_updated_by_user_id_fk
        FOREIGN KEY (updated_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT content_type_check
        CHECK (
            content_type IN (
                'page',
                'section',
                'setting',
                'banner',
                'footer',
                'seo'
            )
        ),

    CONSTRAINT content_key_lowercase_check
        CHECK (content_key = lower(content_key)),

    CONSTRAINT content_display_order_check
        CHECK (display_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_content_content_key
    ON content(content_key);

CREATE INDEX IF NOT EXISTS idx_content_slug
    ON content(slug);

CREATE INDEX IF NOT EXISTS idx_content_content_type
    ON content(content_type);

CREATE INDEX IF NOT EXISTS idx_content_is_active
    ON content(is_active);

CREATE INDEX IF NOT EXISTS idx_content_display_order
    ON content(display_order);

CREATE INDEX IF NOT EXISTS idx_content_created_at
    ON content(created_at DESC);