-- Migration 004: Create project_domains table for domain management
-- Standard domains: {slug}.Neuhauser.network
-- Custom domains: with DNS verification and SSL certificates

CREATE TABLE IF NOT EXISTS project_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL UNIQUE,
    is_custom BOOLEAN DEFAULT FALSE,
    dns_verified BOOLEAN DEFAULT FALSE,
    dns_token VARCHAR(255),
    ssl_cert_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_project_domains_project_id ON project_domains(project_id);
CREATE INDEX IF NOT EXISTS idx_project_domains_domain ON project_domains(domain);
CREATE INDEX IF NOT EXISTS idx_project_domains_dns_verified ON project_domains(dns_verified);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_domains_updated_at
    BEFORE UPDATE ON project_domains
    FOR EACH ROW
    EXECUTE FUNCTION update_project_domains_updated_at();

-- Add comments for documentation
COMMENT ON TABLE project_domains IS 'Stores standard and custom domain configurations for projects';
COMMENT ON COLUMN project_domains.domain IS 'Full domain name (e.g., myproject.Neuhauser.network or custom.com)';
COMMENT ON COLUMN project_domains.is_custom IS 'TRUE for custom domains, FALSE for standard {slug}.Neuhauser.network domains';
COMMENT ON COLUMN project_domains.dns_verified IS 'TRUE when DNS TXT record verification succeeds';
COMMENT ON COLUMN project_domains.dns_token IS 'Random token for DNS TXT record verification (_freebase-verify)';
COMMENT ON COLUMN project_domains.ssl_cert_expiry IS 'Expiry date of the Let''s Encrypt SSL certificate';
