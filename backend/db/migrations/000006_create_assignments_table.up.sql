CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    service_request_id TEXT NOT NULL,
    accountant_user_id TEXT NOT NULL,
    assigned_by_user_id TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'assigned',
    priority VARCHAR(30) NOT NULL DEFAULT 'normal',

    assignment_notes TEXT,
    internal_notes TEXT,

    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    due_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT assignments_service_request_id_fk
        FOREIGN KEY (service_request_id)
        REFERENCES service_requests(id)
        ON DELETE CASCADE,

    CONSTRAINT assignments_accountant_user_id_fk
        FOREIGN KEY (accountant_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT assignments_assigned_by_user_id_fk
        FOREIGN KEY (assigned_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT assignments_status_check
        CHECK (
            status IN (
                'assigned',
                'accepted',
                'in_progress',
                'waiting_client',
                'completed',
                'cancelled'
            )
        ),

    CONSTRAINT assignments_priority_check
        CHECK (
            priority IN (
                'low',
                'normal',
                'high',
                'urgent'
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_assignments_service_request_id
    ON assignments(service_request_id);

CREATE INDEX IF NOT EXISTS idx_assignments_accountant_user_id
    ON assignments(accountant_user_id);

CREATE INDEX IF NOT EXISTS idx_assignments_assigned_by_user_id
    ON assignments(assigned_by_user_id);

CREATE INDEX IF NOT EXISTS idx_assignments_status
    ON assignments(status);

CREATE INDEX IF NOT EXISTS idx_assignments_priority
    ON assignments(priority);

CREATE INDEX IF NOT EXISTS idx_assignments_due_date
    ON assignments(due_date);

CREATE INDEX IF NOT EXISTS idx_assignments_assigned_at
    ON assignments(assigned_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_one_active_accountant_per_request
    ON assignments(service_request_id)
    WHERE status IN ('assigned', 'accepted', 'in_progress', 'waiting_client');