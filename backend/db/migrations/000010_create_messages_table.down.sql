DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_is_read;
DROP INDEX IF EXISTS idx_messages_is_internal;
DROP INDEX IF EXISTS idx_messages_visibility;
DROP INDEX IF EXISTS idx_messages_message_type;
DROP INDEX IF EXISTS idx_messages_recipient_user_id;
DROP INDEX IF EXISTS idx_messages_sender_user_id;
DROP INDEX IF EXISTS idx_messages_service_request_id;

DROP TABLE IF EXISTS messages;