DROP INDEX IF EXISTS idx_assignments_one_active_accountant_per_request;
DROP INDEX IF EXISTS idx_assignments_assigned_at;
DROP INDEX IF EXISTS idx_assignments_due_date;
DROP INDEX IF EXISTS idx_assignments_priority;
DROP INDEX IF EXISTS idx_assignments_status;
DROP INDEX IF EXISTS idx_assignments_assigned_by_user_id;
DROP INDEX IF EXISTS idx_assignments_accountant_user_id;
DROP INDEX IF EXISTS idx_assignments_service_request_id;

DROP TABLE IF EXISTS assignments;