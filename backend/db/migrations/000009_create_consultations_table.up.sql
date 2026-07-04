CREATE TABLE IF NOT EXISTS consultations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    whatsapp VARCHAR(50),

    company_name VARCHAR(150),
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    consultation_type VARCHAR(50) NOT NULL DEFAULT 'general',
    preferred_contact_method VARCHAR(50) NOT NULL DEFAULT 'phone',

    preferred_date DATE,
    preferred_time VARCHAR(50),

    status VARCHAR(30) NOT NULL DEFAULT 'new',
    priority VARCHAR(30) NOT NULL DEFAULT 'normal',

    assigned_to_user_id TEXT,
    handled_by_user_id TEXT,

    admin_notes TEXT,
    follow_up_notes TEXT,

    contacted_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT consultations_assigned_to_user_id_fk
        FOREIGN KEY (assigned_to_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT consultations_handled_by_user_id_fk
        FOREIGN KEY (handled_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT consultations_contact_check
        CHECK (
            email IS NOT NULL
            OR phone IS NOT NULL
            OR whatsapp IS NOT NULL
        ),

    CONSTRAINT consultations_type_check
        CHECK (
            consultation_type IN (
                'general',
                'accounting',
                'tax',
                'audit',
                'business_advisory',
                'legal',
                'other'
            )
        ),

    CONSTRAINT consultations_contact_method_check
        CHECK (
            preferred_contact_method IN (
                'email',
                'phone',
                'whatsapp'
            )
        ),

    CONSTRAINT consultations_status_check
        CHECK (
            status IN (
                'new',
                'contacted',
                'scheduled',
                'in_progress',
                'closed',
                'cancelled'
            )
        ),

    CONSTRAINT consultations_priority_check
        CHECK (
            priority IN (
                'low',
                'normal',
                'high',
                'urgent'
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_consultations_status
    ON consultations(status);

CREATE INDEX IF NOT EXISTS idx_consultations_priority
    ON consultations(priority);

CREATE INDEX IF NOT EXISTS idx_consultations_consultation_type
    ON consultations(consultation_type);

CREATE INDEX IF NOT EXISTS idx_consultations_assigned_to_user_id
    ON consultations(assigned_to_user_id);

CREATE INDEX IF NOT EXISTS idx_consultations_handled_by_user_id
    ON consultations(handled_by_user_id);

CREATE INDEX IF NOT EXISTS idx_consultations_preferred_date
    ON consultations(preferred_date);

CREATE INDEX IF NOT EXISTS idx_consultations_created_at
    ON consultations(created_at DESC);