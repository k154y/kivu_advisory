package taxcredential

import (
	stderrors "errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type rowScanner interface {
	Scan(dest ...any) error
}

func nullableString(value string) any {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}

	return value
}

func mapPostgresError(err error, notFoundMessage string, conflictMessage string) error {
	if err == nil {
		return nil
	}

	if stderrors.Is(err, pgx.ErrNoRows) {
		return apperrors.NotFound(notFoundMessage)
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503":
			return apperrors.Conflict("related record does not exist")
		case "23505":
			return apperrors.Conflict(conflictMessage)
		case "23514":
			return apperrors.InvalidInput("invalid tax credential data")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed")
}