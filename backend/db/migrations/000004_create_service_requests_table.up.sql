CREATE TABLE IF NOT EXISTS service_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    reference_number TEXT NOT NULL UNIQUE DEFAULT (
        'SR-' || upper(substr(gen_random_uuid()::TEXT, 1, 8))
    ),

    client_id TEXT,
    service_id TEXT,

    requester_name VARCHAR(150),
    requester_email VARCHAR(255),
    requester_phone VARCHAR(50),
    requester_company VARCHAR(150),

    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    status VARCHAR(50) NOT NULL DEFAULT 'new',
    priority VARCHAR(30) NOT NULL DEFAULT 'normal',

    preferred_contact_method VARCHAR(50),
    expected_deadline DATE,

    source VARCHAR(50) NOT NULL DEFAULT 'website',

    admin_notes TEXT,
    internal_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT service_requests_client_id_fk
        FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON DELETE SET NULL,

    CONSTRAINT service_requests_service_id_fk
        FOREIGN KEY (service_id)
        REFERENCES services(id)
        ON DELETE SET NULL,

    CONSTRAINT service_requests_status_check
        CHECK (
            status IN (
                'new',
                'pending',
                'in_review',
                'waiting_client',
                'in_progress',
                'completed',
                'cancelled'
            )
        ),

    CONSTRAINT service_requests_priority_check
        CHECK (
            priority IN (
                'low',
                'normal',
                'high',
                'urgent'
            )
        ),

    CONSTRAINT service_requests_contact_method_check
        CHECK (
            preferred_contact_method IS NULL
            OR preferred_contact_method IN (
                'email',
                'phone',
                'whatsapp'
            )
        ),

    CONSTRAINT service_requests_source_check
        CHECK (
            source IN (
                'website',
                'client_portal',
                'admin'
            )
        ),

    CONSTRAINT service_requests_requester_check
        CHECK (
            client_id IS NOT NULL
            OR requester_email IS NOT NULL
            OR requester_phone IS NOT NULL
        )
);

CREATE INDEX IF NOT EXISTS idx_service_requests_reference_number
    ON service_requests(reference_number);

CREATE INDEX IF NOT EXISTS idx_service_requests_client_id
    ON service_requests(client_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_service_id
    ON service_requests(service_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_status
    ON service_requests(status);

CREATE INDEX IF NOT EXISTS idx_service_requests_priority
    ON service_requests(priority);

CREATE INDEX IF NOT EXISTS idx_service_requests_source
    ON service_requests(source);

CREATE INDEX IF NOT EXISTS idx_service_requests_created_at
    ON service_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_requests_expected_deadline
    ON service_requests(expected_deadline);