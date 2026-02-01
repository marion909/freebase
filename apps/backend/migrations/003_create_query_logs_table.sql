-- Migration 003: Create query_logs table for tracking SQL query execution
-- Purpose: Track all queries executed by users for audit and monitoring

CREATE TABLE query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  query_hash VARCHAR(64) NOT NULL,
  executed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_ms INTEGER,
  rows_affected INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX idx_query_logs_project_id ON query_logs(project_id);
CREATE INDEX idx_query_logs_executed_at ON query_logs(executed_at);
CREATE INDEX idx_query_logs_success ON query_logs(success);
CREATE INDEX idx_query_logs_user_id ON query_logs(executed_by_user_id);

COMMENT ON TABLE query_logs IS 'Audit log for all SQL queries executed against project databases';
COMMENT ON COLUMN query_logs.query_hash IS 'SHA-256 hash of query_text for deduplication and analysis';
COMMENT ON COLUMN query_logs.duration_ms IS 'Query execution time in milliseconds';
COMMENT ON COLUMN query_logs.rows_affected IS 'Number of rows returned (SELECT) or affected (INSERT/UPDATE/DELETE)';
