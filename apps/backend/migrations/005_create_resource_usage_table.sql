-- Migration 005: Create resource_usage table for storage and resource monitoring
-- Tracks storage, CPU, memory usage per project for 1GB limit enforcement

CREATE TABLE IF NOT EXISTS resource_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    storage_bytes BIGINT NOT NULL DEFAULT 0,
    cpu_usage_percent DECIMAL(5,2) DEFAULT 0.0,
    memory_usage_mb INTEGER DEFAULT 0,
    storage_exceeded BOOLEAN DEFAULT FALSE,
    last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_resource_usage_project_id ON resource_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_resource_usage_exceeded ON resource_usage(storage_exceeded);
CREATE INDEX IF NOT EXISTS idx_resource_usage_last_checked ON resource_usage(last_checked_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_resource_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_resource_usage_updated_at
    BEFORE UPDATE ON resource_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_resource_usage_updated_at();

-- Add comments for documentation
COMMENT ON TABLE resource_usage IS 'Tracks storage and resource consumption per project for limit enforcement';
COMMENT ON COLUMN resource_usage.storage_bytes IS 'Current database storage in bytes (from pg_database_size)';
COMMENT ON COLUMN resource_usage.cpu_usage_percent IS 'CPU usage percentage (0-100)';
COMMENT ON COLUMN resource_usage.memory_usage_mb IS 'Memory usage in megabytes';
COMMENT ON COLUMN resource_usage.storage_exceeded IS 'TRUE when storage >= 1000MB (1GB hard limit)';
COMMENT ON COLUMN resource_usage.last_checked_at IS 'Last time resources were checked by cronjob';
