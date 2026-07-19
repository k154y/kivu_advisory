package database

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TxFunc func(ctx context.Context, tx pgx.Tx) error

func WithTx(ctx context.Context, pool *pgxpool.Pool, fn TxFunc) (err error) {
	if pool == nil {
		return errors.New("database pool is not initialized")
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}

	committed := false

	defer func() {
		if recovered := recover(); recovered != nil {
			_ = tx.Rollback(ctx)
			panic(recovered)
		}

		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	if err := fn(ctx, tx); err != nil {
		return fmt.Errorf("transaction operation: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	committed = true

	return nil
}
