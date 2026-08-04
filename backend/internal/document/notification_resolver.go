package document

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type PostgresNotificationResolver struct {
	pool       *pgxpool.Pool
	adminEmail string
}

func NewPostgresNotificationResolver(pool *pgxpool.Pool, adminEmail string) *PostgresNotificationResolver {
	return &PostgresNotificationResolver{
		pool:       pool,
		adminEmail: strings.TrimSpace(adminEmail),
	}
}

func (r *PostgresNotificationResolver) FindAdminNotificationRecipient(ctx context.Context) (NotificationRecipient, error) {
	if r == nil || r.pool == nil {
		return NotificationRecipient{}, apperrors.Internal("document notification resolver is not initialized")
	}

	if r.adminEmail == "" {
		return NotificationRecipient{}, apperrors.InvalidInput("admin email is required")
	}

	var recipient NotificationRecipient

	err := r.pool.QueryRow(ctx, `
		SELECT
			id,
			COALESCE(full_name, ''),
			email,
			COALESCE(phone, '')
		FROM users
		WHERE LOWER(email) = LOWER($1)
			AND role = 'admin'
		LIMIT 1
	`, r.adminEmail).Scan(
		&recipient.UserID,
		&recipient.FullName,
		&recipient.Email,
		&recipient.Phone,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return NotificationRecipient{}, apperrors.NotFound("admin notification recipient not found")
		}

		return NotificationRecipient{}, apperrors.InternalWrap(err, "failed to read admin notification recipient")
	}

	return recipient, nil
}

func (r *PostgresNotificationResolver) FindServiceRequestNotificationContext(
	ctx context.Context,
	serviceRequestID string,
) (ServiceRequestNotificationContext, error) {
	if r == nil || r.pool == nil {
		return ServiceRequestNotificationContext{}, apperrors.Internal("document notification resolver is not initialized")
	}

	serviceRequestID = strings.TrimSpace(serviceRequestID)
	if serviceRequestID == "" {
		return ServiceRequestNotificationContext{}, apperrors.InvalidInput("service request id is required")
	}

	var requestContext ServiceRequestNotificationContext
	var expectedDeadline pgtype.Date

	err := r.pool.QueryRow(ctx, `
		SELECT
			sr.id,
			sr.reference_number,
			sr.title,
			sr.priority,
			sr.expected_deadline,
			COALESCE(u.id, ''),
			COALESCE(u.full_name, sr.requester_name, ''),
			COALESCE(u.email, sr.requester_email, ''),
			COALESCE(u.phone, sr.requester_phone, '')
		FROM service_requests sr
		LEFT JOIN clients c ON c.id = sr.client_id
		LEFT JOIN users u ON u.id = c.user_id
		WHERE sr.id = $1
		LIMIT 1
	`, serviceRequestID).Scan(
		&requestContext.ID,
		&requestContext.ReferenceNumber,
		&requestContext.Title,
		&requestContext.Priority,
		&expectedDeadline,
		&requestContext.ClientUserID,
		&requestContext.ClientFullName,
		&requestContext.ClientEmail,
		&requestContext.ClientPhone,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ServiceRequestNotificationContext{}, apperrors.NotFound("service request not found")
		}

		return ServiceRequestNotificationContext{}, apperrors.InternalWrap(err, "failed to read service request notification context")
	}

	if expectedDeadline.Valid {
		deadline := expectedDeadline.Time
		requestContext.ExpectedDeadline = &deadline
	}

	return requestContext, nil
}
