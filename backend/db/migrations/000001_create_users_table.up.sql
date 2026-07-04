CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    full_name VARCHAR(150) NOT NULL,
    company_name VARCHAR(150),

    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    location VARCHAR(150),

    role VARCHAR(30) NOT NULL,
    password_hash TEXT NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,

    CONSTRAINT users_role_check
        CHECK (role IN ('admin', 'client', 'accountant')),

    CONSTRAINT users_email_lowercase_check
        CHECK (email = lower(email))
);

CREATE INDEX IF NOT EXISTS idx_users_role
    ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_is_active
    ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_users_created_at
    ON users(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_search
    ON users(full_name, email, phone);