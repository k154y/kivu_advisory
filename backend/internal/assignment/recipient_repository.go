package assignment

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type PostgresAccountantRecipientRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresAccountantRecipientRepository(pool *pgxpool.Pool) *PostgresAccountantRecipientRepository {
	return &PostgresAccountantRecipientRepository{
		pool: pool,
	}
}

func (r *PostgresAccountantRecipientRepository) FindAccountantNotificationRecipient(
	ctx context.Context,
	accountantUserID string,
) (AccountantNotificationRecipient, error) {
	if r == nil || r.pool == nil {
		return AccountantNotificationRecipient{}, apperrors.Internal("accountant recipient repository is not initialized")
	}

	accountantUserID = strings.TrimSpace(accountantUserID)
	if accountantUserID == "" {
		return AccountantNotificationRecipient{}, apperrors.InvalidInput("accountant user id is required")
	}

	var recipient AccountantNotificationRecipient

	err := r.pool.QueryRow(ctx, `
		SELECT
			id,
			COALESCE(full_name, ''),
			email,
			COALESCE(phone, '')
		FROM users
		WHERE id = $1
			AND role = 'accountant'
		LIMIT 1
	`, accountantUserID).Scan(
		&recipient.UserID,
		&recipient.FullName,
		&recipient.Email,
		&recipient.Phone,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return AccountantNotificationRecipient{}, apperrors.NotFound("accountant notification recipient not found")
		}

		return AccountantNotificationRecipient{}, apperrors.InternalWrap(err, "failed to read accountant notification recipient")
	}

	return recipient, nil
}
