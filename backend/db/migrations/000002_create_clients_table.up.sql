CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    user_id TEXT NOT NULL UNIQUE,

    company_name VARCHAR(150),
    tin VARCHAR(50),
    business_type VARCHAR(100),
    address VARCHAR(200),
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Rwanda',
    website VARCHAR(200),
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT clients_user_id_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id
    ON clients(user_id);

CREATE INDEX IF NOT EXISTS idx_clients_company_name
    ON clients(company_name);

CREATE INDEX IF NOT EXISTS idx_clients_tin
    ON clients(tin);

CREATE INDEX IF NOT EXISTS idx_clients_created_at
    ON clients(created_at DESC);