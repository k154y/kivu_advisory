package notification

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type RecipientRepository interface {
	ListActiveClients(ctx context.Context) ([]Recipient, error)
}

type PostgresRecipientRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRecipientRepository(pool *pgxpool.Pool) *PostgresRecipientRepository {
	return &PostgresRecipientRepository{
		pool: pool,
	}
}

func (r *PostgresRecipientRepository) ListActiveClients(ctx context.Context) ([]Recipient, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("notification recipient repository is not initialized")
	}

	rows, err := r.pool.Query(ctx, `
		SELECT
			id,
			full_name,
			email,
			COALESCE(phone, ''),
			role
		FROM users
		WHERE role = 'client'
		  AND is_active = TRUE
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, apperrors.InternalWrap(err, "failed to list active clients for notifications")
	}
	defer rows.Close()

	recipients := make([]Recipient, 0)

	for rows.Next() {
		var recipient Recipient

		if err := rows.Scan(
			&recipient.UserID,
			&recipient.FullName,
			&recipient.Email,
			&recipient.Phone,
			&recipient.Role,
		); err != nil {
			return nil, apperrors.InternalWrap(err, "failed to read notification recipient")
		}

		recipients = append(recipients, recipient.Normalize())
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.InternalWrap(err, "failed to read notification recipients")
	}

	return recipients, nil
}