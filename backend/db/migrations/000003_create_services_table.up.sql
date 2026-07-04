CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    title VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    short_description VARCHAR(300),
    description TEXT,

    category VARCHAR(100),
    price_label VARCHAR(100),
    estimated_duration VARCHAR(100),

    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    display_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT services_slug_check
        CHECK (slug = lower(slug)),

    CONSTRAINT services_display_order_check
        CHECK (display_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_services_slug
    ON services(slug);

CREATE INDEX IF NOT EXISTS idx_services_category
    ON services(category);

CREATE INDEX IF NOT EXISTS idx_services_is_active
    ON services(is_active);

CREATE INDEX IF NOT EXISTS idx_services_is_featured
    ON services(is_featured);

CREATE INDEX IF NOT EXISTS idx_services_display_order
    ON services(display_order);