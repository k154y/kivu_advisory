CREATE TABLE IF NOT EXISTS social_links (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    platform VARCHAR(80) NOT NULL,
    label VARCHAR(120) NOT NULL,
    url TEXT NOT NULL,
    icon_name VARCHAR(80),

    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    show_in_footer BOOLEAN NOT NULL DEFAULT TRUE,
    show_in_contact_page BOOLEAN NOT NULL DEFAULT TRUE,

    created_by_user_id TEXT,
    updated_by_user_id TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT social_links_created_by_user_id_fk
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT social_links_updated_by_user_id_fk
        FOREIGN KEY (updated_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT social_links_platform_not_empty_check
        CHECK (LENGTH(TRIM(platform)) > 0),

    CONSTRAINT social_links_label_not_empty_check
        CHECK (LENGTH(TRIM(label)) > 0),

    CONSTRAINT social_links_url_not_empty_check
        CHECK (LENGTH(TRIM(url)) > 0),

    CONSTRAINT social_links_display_order_check
        CHECK (display_order >= 0),

    CONSTRAINT social_links_platform_unique
        UNIQUE (platform)
);

CREATE INDEX IF NOT EXISTS idx_social_links_active
    ON social_links(is_active);

CREATE INDEX IF NOT EXISTS idx_social_links_footer
    ON social_links(show_in_footer, is_active);

CREATE INDEX IF NOT EXISTS idx_social_links_contact_page
    ON social_links(show_in_contact_page, is_active);

CREATE INDEX IF NOT EXISTS idx_social_links_display_order
    ON social_links(display_order, created_at);