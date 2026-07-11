CREATE TABLE IF NOT EXISTS testimonials (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    client_name VARCHAR(150) NOT NULL,
    client_role VARCHAR(150),
    company_name VARCHAR(150),
    content TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5,
    photo_url TEXT,

    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_by_user_id TEXT,
    updated_by_user_id TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT testimonials_created_by_user_id_fk
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT testimonials_updated_by_user_id_fk
        FOREIGN KEY (updated_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT testimonials_client_name_not_empty_check
        CHECK (LENGTH(TRIM(client_name)) > 0),

    CONSTRAINT testimonials_content_not_empty_check
        CHECK (LENGTH(TRIM(content)) > 0),

    CONSTRAINT testimonials_rating_range_check
        CHECK (rating >= 1 AND rating <= 5),

    CONSTRAINT testimonials_display_order_check
        CHECK (display_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_testimonials_public
    ON testimonials(is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_testimonials_featured
    ON testimonials(is_featured, is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_testimonials_display_order
    ON testimonials(display_order, created_at);
