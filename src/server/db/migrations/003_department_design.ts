export const version = '003_site_design';
export const description = 'Add persistent AgentDesk site design and control-center configuration';
export const sql = `
CREATE TABLE IF NOT EXISTS agentdesk_site_design (
  id VARCHAR(64) PRIMARY KEY,
  config JSONB NOT NULL,
  updated_by VARCHAR(128),
  updated_at VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_site_design_updated_at ON agentdesk_site_design (updated_at DESC);
`;
