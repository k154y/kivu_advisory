CREATE TABLE IF NOT EXISTS staff_members (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    full_name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    role_title VARCHAR(150) NOT NULL,

    short_description VARCHAR(300),
    bio TEXT,
    education_background TEXT,
    work_experience TEXT,
    professional_certifications TEXT,

    email VARCHAR(255),
    phone VARCHAR(50),
    photo_url TEXT,

    show_on_website BOOLEAN NOT NULL DEFAULT TRUE,
    show_on_homepage BOOLEAN NOT NULL DEFAULT FALSE,

    show_bio BOOLEAN NOT NULL DEFAULT TRUE,
    show_education BOOLEAN NOT NULL DEFAULT TRUE,
    show_work_experience BOOLEAN NOT NULL DEFAULT TRUE,
    show_certifications BOOLEAN NOT NULL DEFAULT TRUE,
    show_contact BOOLEAN NOT NULL DEFAULT FALSE,

    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_by_user_id TEXT,
    updated_by_user_id TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT staff_members_created_by_user_id_fk
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT staff_members_updated_by_user_id_fk
        FOREIGN KEY (updated_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT staff_members_full_name_not_empty_check
        CHECK (LENGTH(TRIM(full_name)) > 0),

    CONSTRAINT staff_members_slug_not_empty_check
        CHECK (LENGTH(TRIM(slug)) > 0),

    CONSTRAINT staff_members_role_title_not_empty_check
        CHECK (LENGTH(TRIM(role_title)) > 0),

    CONSTRAINT staff_members_display_order_check
        CHECK (display_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_staff_members_slug
    ON staff_members(slug);

CREATE INDEX IF NOT EXISTS idx_staff_members_public
    ON staff_members(show_on_website, is_active);

CREATE INDEX IF NOT EXISTS idx_staff_members_homepage
    ON staff_members(show_on_homepage, show_on_website, is_active);

CREATE INDEX IF NOT EXISTS idx_staff_members_display_order
    ON staff_members(display_order, created_at);