DROP INDEX IF EXISTS idx_documents_created_at;
DROP INDEX IF EXISTS idx_documents_is_deleted;
DROP INDEX IF EXISTS idx_documents_is_final_deliverable;
DROP INDEX IF EXISTS idx_documents_status;
DROP INDEX IF EXISTS idx_documents_visibility;
DROP INDEX IF EXISTS idx_documents_document_type;
DROP INDEX IF EXISTS idx_documents_storage_key;
DROP INDEX IF EXISTS idx_documents_uploaded_by_user_id;
DROP INDEX IF EXISTS idx_documents_service_request_id;

DROP TABLE IF EXISTS documents;