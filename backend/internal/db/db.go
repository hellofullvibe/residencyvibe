package db

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	poolCfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}
	poolCfg.MaxConns = 10
	poolCfg.MaxConnLifetime = time.Hour

	// Use the Exec query mode (no cached named prepared statements). This is
	// required for compatibility with Supabase's transaction pooler (PgBouncer),
	// which drops server-side prepared statements when it recycles a connection.
	// Without this, queries fail with "prepared statement does not exist" after
	// the pooler rotates connections.
	poolCfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeExec

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}
