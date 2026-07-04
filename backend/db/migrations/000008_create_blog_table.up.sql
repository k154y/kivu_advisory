CREATE TABLE IF NOT EXISTS blog_posts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    title VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,

    excerpt VARCHAR(500),
    body TEXT NOT NULL,

    category VARCHAR(100),
    tags TEXT[] NOT NULL DEFAULT '{}',

    featured_image_url TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,

    meta_title VARCHAR(200),
    meta_description VARCHAR(300),

    author_user_id TEXT,
    published_at TIMESTAMPTZ,

    view_count INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT blog_posts_author_user_id_fk
        FOREIGN KEY (author_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT blog_posts_slug_lowercase_check
        CHECK (slug = lower(slug)),

    CONSTRAINT blog_posts_status_check
        CHECK (
            status IN (
                'draft',
                'published',
                'archived'
            )
        ),

    CONSTRAINT blog_posts_view_count_check
        CHECK (view_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug
    ON blog_posts(slug);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status
    ON blog_posts(status);

CREATE INDEX IF NOT EXISTS idx_blog_posts_category
    ON blog_posts(category);

CREATE INDEX IF NOT EXISTS idx_blog_posts_is_featured
    ON blog_posts(is_featured);

CREATE INDEX IF NOT EXISTS idx_blog_posts_author_user_id
    ON blog_posts(author_user_id);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at
    ON blog_posts(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at
    ON blog_posts(created_at DESC);