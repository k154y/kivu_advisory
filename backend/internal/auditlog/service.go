package auditlog

import (
	"context"
	"log"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// Record best-effort logs an audit entry. It intentionally never returns an
// error: audit logging must never block or fail the mutation it describes.
func (s *Service) Record(ctx context.Context, input RecordInput) {
	if s == nil || s.repo == nil {
		return
	}

	if err := s.repo.Create(ctx, input); err != nil {
		log.Printf("audit log: failed to record %q on %q: %v", input.Action, input.EntityType, err)
	}
}

func (s *Service) ListAdmin(ctx context.Context, filter ListAuditLogsFilter) ([]PublicAuditLog, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("audit log service is not initialized")
	}

	items, totalItems, err := s.repo.List(ctx, filter.Normalize())
	if err != nil {
		return nil, 0, err
	}

	return PublicAuditLogs(items), totalItems, nil
}
