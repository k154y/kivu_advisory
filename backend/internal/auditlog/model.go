package auditlog

import "time"

const (
	DefaultPageSize = 20
	MaxPageSize     = 100
)

type AuditLog struct {
	ID          string
	ActorUserID string
	ActorRole   string
	Action      string
	EntityType  string
	EntityID    string
	Description string
	Metadata    map[string]any
	CreatedAt   time.Time
}

type PublicAuditLog struct {
	ID          string         `json:"id"`
	ActorUserID string         `json:"actor_user_id,omitempty"`
	ActorRole   string         `json:"actor_role,omitempty"`
	Action      string         `json:"action"`
	EntityType  string         `json:"entity_type"`
	EntityID    string         `json:"entity_id,omitempty"`
	Description string         `json:"description,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
}

func (a AuditLog) Public() PublicAuditLog {
	return PublicAuditLog{
		ID:          a.ID,
		ActorUserID: a.ActorUserID,
		ActorRole:   a.ActorRole,
		Action:      a.Action,
		EntityType:  a.EntityType,
		EntityID:    a.EntityID,
		Description: a.Description,
		Metadata:    a.Metadata,
		CreatedAt:   a.CreatedAt,
	}
}

func PublicAuditLogs(items []AuditLog) []PublicAuditLog {
	result := make([]PublicAuditLog, 0, len(items))

	for _, item := range items {
		result = append(result, item.Public())
	}

	return result
}

type RecordInput struct {
	ActorUserID string
	ActorRole   string
	Action      string
	EntityType  string
	EntityID    string
	Description string
	Metadata    map[string]any
}

type ListAuditLogsFilter struct {
	EntityType  string
	ActorUserID string
	Page        int
	PageSize    int
}

func (f ListAuditLogsFilter) Normalize() ListAuditLogsFilter {
	if f.Page <= 0 {
		f.Page = 1
	}

	if f.PageSize <= 0 {
		f.PageSize = DefaultPageSize
	}

	if f.PageSize > MaxPageSize {
		f.PageSize = MaxPageSize
	}

	return f
}

func (f ListAuditLogsFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}
