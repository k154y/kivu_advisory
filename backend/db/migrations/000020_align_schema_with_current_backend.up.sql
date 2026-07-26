-- Align old staging database schema with the current backend schema.
-- This migration is safe to run on local, staging, and production.
-- It is idempotent and can continue safely after a previous failed attempt.

BEGIN;

DO $$
BEGIN
    -- assignments.notes -> assignments.assignment_notes
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'assignments'
          AND column_name = 'notes'
    )
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'assignments'
          AND column_name = 'assignment_notes'
    ) THEN
        ALTER TABLE assignments RENAME COLUMN notes TO assignment_notes;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'assignments'
          AND column_name = 'notes'
    )
    AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'assignments'
          AND column_name = 'assignment_notes'
    ) THEN
        UPDATE assignments
        SET assignment_notes = COALESCE(NULLIF(BTRIM(assignment_notes), ''), notes)
        WHERE notes IS NOT NULL
          AND (assignment_notes IS NULL OR BTRIM(assignment_notes) = '');

        ALTER TABLE assignments DROP COLUMN notes;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'assignments'
          AND column_name = 'assignment_notes'
    ) THEN
        ALTER TABLE assignments ADD COLUMN assignment_notes TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'assignments'
          AND column_name = 'internal_notes'
    ) THEN
        ALTER TABLE assignments ADD COLUMN internal_notes TEXT;
    END IF;
END $$;


DO $$
BEGIN
    -- documents.file_name -> documents.stored_file_name
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'file_name'
    )
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'stored_file_name'
    ) THEN
        ALTER TABLE documents RENAME COLUMN file_name TO stored_file_name;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'file_name'
    )
    AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'stored_file_name'
    ) THEN
        UPDATE documents
        SET stored_file_name = COALESCE(NULLIF(BTRIM(stored_file_name), ''), file_name)
        WHERE file_name IS NOT NULL
          AND (stored_file_name IS NULL OR BTRIM(stored_file_name) = '');

        ALTER TABLE documents DROP COLUMN file_name;
    END IF;

    -- documents.mime_type -> documents.content_type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'mime_type'
    )
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'content_type'
    ) THEN
        ALTER TABLE documents RENAME COLUMN mime_type TO content_type;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'mime_type'
    )
    AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'content_type'
    ) THEN
        UPDATE documents
        SET content_type = COALESCE(NULLIF(BTRIM(content_type), ''), mime_type)
        WHERE mime_type IS NOT NULL
          AND (content_type IS NULL OR BTRIM(content_type) = '');

        ALTER TABLE documents DROP COLUMN mime_type;
    END IF;

    -- documents.is_final -> documents.is_final_deliverable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'is_final'
    )
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'is_final_deliverable'
    ) THEN
        ALTER TABLE documents RENAME COLUMN is_final TO is_final_deliverable;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'is_final'
    )
    AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'is_final_deliverable'
    ) THEN
        UPDATE documents
        SET is_final_deliverable = COALESCE(is_final_deliverable, is_final)
        WHERE is_final IS NOT NULL
          AND is_final_deliverable IS NULL;

        ALTER TABLE documents DROP COLUMN is_final;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'stored_file_name'
    ) THEN
        ALTER TABLE documents ADD COLUMN stored_file_name VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'content_type'
    ) THEN
        ALTER TABLE documents ADD COLUMN content_type VARCHAR(150);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'is_final_deliverable'
    ) THEN
        ALTER TABLE documents ADD COLUMN is_final_deliverable BOOLEAN DEFAULT FALSE;
    END IF;
END $$;


-- Drop old document CHECK constraints before normalizing rows.
-- This prevents old constraints from blocking updates to rows that already contain newer values.
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_visibility_check;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;


-- Normalize old document data to the values used by the current backend.
UPDATE documents
SET document_type = CASE
    WHEN document_type = 'internal' THEN 'internal_file'
    WHEN document_type IN (
        'client_upload',
        'admin_upload',
        'accountant_upload',
        'final_deliverable',
        'internal_file'
    ) THEN document_type
    ELSE 'client_upload'
END;

UPDATE documents
SET visibility = CASE
    WHEN visibility = 'shared' THEN 'staff'
    WHEN visibility = 'accountant' THEN 'staff'
    WHEN visibility = 'internal' THEN 'admin'
    WHEN visibility = 'admin' THEN 'admin'
    WHEN visibility = 'client' THEN 'client'
    WHEN visibility = 'staff' THEN 'staff'
    ELSE 'staff'
END;

UPDATE documents
SET status = CASE
    WHEN status = 'active' THEN 'uploaded'
    WHEN status = 'deleted' THEN 'archived'
    WHEN status IN ('uploaded', 'under_review', 'approved', 'rejected', 'archived') THEN status
    ELSE 'uploaded'
END;

UPDATE documents
SET stored_file_name = COALESCE(NULLIF(BTRIM(stored_file_name), ''), original_file_name, id)
WHERE stored_file_name IS NULL
   OR BTRIM(stored_file_name) = '';

UPDATE documents
SET is_final_deliverable = FALSE
WHERE is_final_deliverable IS NULL;


-- Align document defaults and required fields.
ALTER TABLE documents
    ALTER COLUMN visibility SET DEFAULT 'staff';

ALTER TABLE documents
    ALTER COLUMN status SET DEFAULT 'uploaded';

ALTER TABLE documents
    ALTER COLUMN document_type SET DEFAULT 'client_upload';

ALTER TABLE documents
    ALTER COLUMN is_final_deliverable SET DEFAULT FALSE;

ALTER TABLE documents
    ALTER COLUMN stored_file_name SET NOT NULL;

ALTER TABLE documents
    ALTER COLUMN is_final_deliverable SET NOT NULL;


-- Add current document CHECK constraints.
ALTER TABLE documents ADD CONSTRAINT documents_document_type_check
CHECK (
    document_type IN (
        'client_upload',
        'admin_upload',
        'accountant_upload',
        'final_deliverable',
        'internal_file'
    )
);

ALTER TABLE documents ADD CONSTRAINT documents_visibility_check
CHECK (
    visibility IN (
        'client',
        'staff',
        'admin'
    )
);

ALTER TABLE documents ADD CONSTRAINT documents_status_check
CHECK (
    status IN (
        'uploaded',
        'under_review',
        'approved',
        'rejected',
        'archived'
    )
);


-- Align document index name.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'idx_documents_is_final'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'idx_documents_is_final_deliverable'
    ) THEN
        ALTER INDEX idx_documents_is_final RENAME TO idx_documents_is_final_deliverable;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'idx_documents_is_final'
    )
    AND EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'idx_documents_is_final_deliverable'
    ) THEN
        DROP INDEX idx_documents_is_final;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'idx_documents_is_final_deliverable'
    ) THEN
        CREATE INDEX idx_documents_is_final_deliverable
        ON documents(is_final_deliverable);
    END IF;
END $$;


-- Ensure services.show_price_label exists because the service/admin frontend expects it.
ALTER TABLE services
ADD COLUMN IF NOT EXISTS show_price_label BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE services
SET show_price_label = FALSE
WHERE show_price_label IS NULL;


-- Link old public/visitor service requests to existing client profiles by matching requester email.
UPDATE service_requests sr
SET
    client_id = c.id,
    updated_at = NOW()
FROM clients c
JOIN users u ON u.id = c.user_id
WHERE NULLIF(BTRIM(COALESCE(sr.client_id, '')), '') IS NULL
  AND sr.requester_email IS NOT NULL
  AND LOWER(BTRIM(sr.requester_email)) = LOWER(BTRIM(u.email));

COMMIT;