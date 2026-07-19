DROP INDEX IF EXISTS idx_consultations_created_at;
DROP INDEX IF EXISTS idx_consultations_preferred_date;
DROP INDEX IF EXISTS idx_consultations_handled_by_user_id;
DROP INDEX IF EXISTS idx_consultations_assigned_to_user_id;
DROP INDEX IF EXISTS idx_consultations_consultation_type;
DROP INDEX IF EXISTS idx_consultations_priority;
DROP INDEX IF EXISTS idx_consultations_status;

DROP TABLE IF EXISTS consultations;