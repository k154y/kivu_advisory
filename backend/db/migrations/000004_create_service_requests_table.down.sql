DROP INDEX IF EXISTS idx_service_requests_expected_deadline;
DROP INDEX IF EXISTS idx_service_requests_created_at;
DROP INDEX IF EXISTS idx_service_requests_source;
DROP INDEX IF EXISTS idx_service_requests_priority;
DROP INDEX IF EXISTS idx_service_requests_status;
DROP INDEX IF EXISTS idx_service_requests_service_id;
DROP INDEX IF EXISTS idx_service_requests_client_id;
DROP INDEX IF EXISTS idx_service_requests_reference_number;

DROP TABLE IF EXISTS service_requests;