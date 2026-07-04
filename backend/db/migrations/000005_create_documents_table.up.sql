CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    service_request_id TEXT NOT NULL,
    uploaded_by_user_id TEXT,

    original_file_name VARCHAR(255) NOT NULL,
    stored_file_name VARCHAR(255) NOT NULL,

    storage_driver VARCHAR(30) NOT NULL DEFAULT 'local',
    storage_bucket VARCHAR(150),
    storage_key TEXT NOT NULL UNIQUE,

    content_type VARCHAR(150),
    file_extension VARCHAR(20),
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    checksum TEXT,

    document_type VARCHAR(50) NOT NULL DEFAULT 'client_upload',
    visibility VARCHAR(30) NOT NULL DEFAULT 'staff',
    status VARCHAR(30) NOT NULL DEFAULT 'uploaded',

    title VARCHAR(200),
    description TEXT,

    is_final_deliverable BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT documents_service_request_id_fk
        FOREIGN KEY (service_request_id)
        REFERENCES service_requests(id)
        ON DELETE CASCADE,

    CONSTRAINT documents_uploaded_by_user_id_fk
        FOREIGN KEY (uploaded_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT documents_storage_driver_check
        CHECK (
            storage_driver IN (
                'local',
                'r2'
            )
        ),

    CONSTRAINT documents_document_type_check
        CHECK (
            document_type IN (
                'client_upload',
                'admin_upload',
                'accountant_upload',
                'final_deliverable',
                'internal_file'
            )
        ),

    CONSTRAINT documents_visibility_check
        CHECK (
            visibility IN (
                'client',
                'staff',
                'admin'
            )
        ),

    CONSTRAINT documents_status_check
        CHECK (
            status IN (
                'uploaded',
                'under_review',
                'approved',
                'rejected',
                'archived'
            )
        ),

    CONSTRAINT documents_file_size_check
        CHECK (file_size_bytes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_documents_service_request_id
    ON documents(service_request_id);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by_user_id
    ON documents(uploaded_by_user_id);

CREATE INDEX IF NOT EXISTS idx_documents_storage_key
    ON documents(storage_key);

CREATE INDEX IF NOT EXISTS idx_documents_document_type
    ON documents(document_type);

CREATE INDEX IF NOT EXISTS idx_documents_visibility
    ON documents(visibility);

CREATE INDEX IF NOT EXISTS idx_documents_status
    ON documents(status);

CREATE INDEX IF NOT EXISTS idx_documents_is_final_deliverable
    ON documents(is_final_deliverable);

CREATE INDEX IF NOT EXISTS idx_documents_is_deleted
    ON documents(is_deleted);

CREATE INDEX IF NOT EXISTS idx_documents_created_at
    ON documents(created_at DESC);