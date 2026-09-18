-- AgentDesk database migration 001
-- Baseline schema. Safe to run against an existing installation because all
-- CREATE/ALTER/INDEX operations are additive and idempotent.

CREATE TABLE IF NOT EXISTS agentdesk_integrations (
              id VARCHAR(128) PRIMARY KEY,
              provider VARCHAR(64) NOT NULL,
              type VARCHAR(64) NOT NULL,
              account_email VARCHAR(255) NOT NULL,
              encrypted_refresh_token TEXT,
              status VARCHAR(64) NOT NULL,
              connected_at VARCHAR(64),
              last_successful_send_at VARCHAR(64),
              last_error TEXT,
              created_at VARCHAR(64) NOT NULL,
              updated_at VARCHAR(64) NOT NULL
            );

            ALTER TABLE agentdesk_integrations ADD COLUMN IF NOT EXISTS encrypted_client_id TEXT;
            ALTER TABLE agentdesk_integrations ADD COLUMN IF NOT EXISTS encrypted_client_secret TEXT;

            CREATE TABLE IF NOT EXISTS agentdesk_oauth_states (
              state VARCHAR(128) PRIMARY KEY,
              user_id VARCHAR(128),
              tenant_id VARCHAR(128),
              provider VARCHAR(64) DEFAULT 'GOOGLE',
              redirect_url TEXT,
              created_at BIGINT NOT NULL,
              expires_at BIGINT NOT NULL,
              used_at BIGINT
            );

            ALTER TABLE agentdesk_oauth_states ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(128);
            ALTER TABLE agentdesk_oauth_states ADD COLUMN IF NOT EXISTS provider VARCHAR(64) DEFAULT 'GOOGLE';
            ALTER TABLE agentdesk_oauth_states ADD COLUMN IF NOT EXISTS redirect_url TEXT;
            ALTER TABLE agentdesk_oauth_states ADD COLUMN IF NOT EXISTS used_at BIGINT;
            CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON agentdesk_oauth_states (expires_at);
            CREATE INDEX IF NOT EXISTS idx_oauth_states_tenant ON agentdesk_oauth_states (tenant_id);

            CREATE TABLE IF NOT EXISTS agentdesk_sessions (
              token_hash VARCHAR(255) PRIMARY KEY,
              token VARCHAR(255),
              user_id VARCHAR(128) NOT NULL,
              email VARCHAR(255) NOT NULL,
              role VARCHAR(64) NOT NULL,
              tenant_id VARCHAR(128) NOT NULL,
              created_at BIGINT NOT NULL,
              expires_at BIGINT NOT NULL
            );

            ALTER TABLE agentdesk_sessions ADD COLUMN IF NOT EXISTS token_hash VARCHAR(255);
            ALTER TABLE agentdesk_sessions ADD COLUMN IF NOT EXISTS token VARCHAR(255);
            CREATE INDEX IF NOT EXISTS idx_sessions_user ON agentdesk_sessions (user_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_expires ON agentdesk_sessions (expires_at);
            CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON agentdesk_sessions (tenant_id);

            CREATE TABLE IF NOT EXISTS agentdesk_webhook_events (
              event_id VARCHAR(255) PRIMARY KEY,
              provider VARCHAR(64) NOT NULL,
              event_type VARCHAR(128) NOT NULL,
              status VARCHAR(64) NOT NULL,
              payload JSONB,
              created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS agentdesk_audit_logs (
              id VARCHAR(128) PRIMARY KEY,
              actor_id VARCHAR(128),
              actor_email VARCHAR(255),
              actor_role VARCHAR(64),
              action VARCHAR(128) NOT NULL,
              entity_type VARCHAR(64) NOT NULL,
              entity_id VARCHAR(128),
              result VARCHAR(64) NOT NULL,
              metadata JSONB,
              timestamp VARCHAR(64) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agentdesk_users (
              id VARCHAR(128) PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              email VARCHAR(255) UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              role VARCHAR(64) NOT NULL,
              tenant_id VARCHAR(128) NOT NULL,
              status VARCHAR(64) NOT NULL,
              must_change_password BOOLEAN DEFAULT FALSE,
              email_verified BOOLEAN DEFAULT FALSE,
              reset_token_hash TEXT,
              reset_token_expires BIGINT,
              verification_token_hash TEXT,
              verification_token_expires BIGINT,
              setup_token_hash TEXT,
              setup_token_expires BIGINT,
              two_factor_enabled BOOLEAN DEFAULT FALSE,
              two_factor_phone VARCHAR(64),
              failed_login_attempts INT DEFAULT 0,
              lockout_until BIGINT,
              created_at VARCHAR(64) NOT NULL,
              updated_at VARCHAR(64) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agentdesk_tenants (
              id VARCHAR(128) PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              industry VARCHAR(128),
              status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE',
              owner_id VARCHAR(128),
              plan_id VARCHAR(64) NOT NULL DEFAULT 'trial',
              currency VARCHAR(16) DEFAULT 'USD',
              settings JSONB,
              created_at VARCHAR(64) NOT NULL,
              updated_at VARCHAR(64) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agentdesk_knowledge (
              id VARCHAR(128) PRIMARY KEY,
              tenant_id VARCHAR(128) NOT NULL,
              business_id VARCHAR(128),
              title VARCHAR(512) NOT NULL,
              content TEXT NOT NULL,
              type VARCHAR(64) DEFAULT 'faq',
              category VARCHAR(128) DEFAULT 'General',
              status VARCHAR(64) DEFAULT 'active',
              active BOOLEAN DEFAULT TRUE,
              metadata JSONB,
              created_at VARCHAR(64) NOT NULL,
              updated_at VARCHAR(64) NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_knowledge_tenant ON agentdesk_knowledge (tenant_id);

            CREATE TABLE IF NOT EXISTS agentdesk_files (
              key VARCHAR(255) PRIMARY KEY,
              filename VARCHAR(255) NOT NULL,
              content_type VARCHAR(128) NOT NULL,
              size_bytes BIGINT NOT NULL,
              tenant_id VARCHAR(128) NOT NULL,
              is_private BOOLEAN DEFAULT TRUE,
              uploaded_at VARCHAR(64) NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_files_tenant ON agentdesk_files (tenant_id);

            CREATE TABLE IF NOT EXISTS agentdesk_queue_jobs (
              id VARCHAR(128) PRIMARY KEY,
              type VARCHAR(64) NOT NULL,
              payload JSONB NOT NULL DEFAULT '{}'::jsonb,
              status VARCHAR(32) NOT NULL,
              attempt_count INT NOT NULL DEFAULT 0,
              max_attempts INT NOT NULL DEFAULT 3,
              next_attempt_at TIMESTAMPTZ,
              last_attempt_at TIMESTAMPTZ,
              completed_at TIMESTAMPTZ,
              failure_reason TEXT,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_queue_jobs_pending ON agentdesk_queue_jobs (status, next_attempt_at);
            CREATE INDEX IF NOT EXISTS idx_queue_jobs_created ON agentdesk_queue_jobs (created_at DESC);

            CREATE TABLE IF NOT EXISTS agentdesk_delivery_logs (
              id VARCHAR(128) PRIMARY KEY,
              tenant_id VARCHAR(128),
              channel VARCHAR(32) NOT NULL,
              recipient VARCHAR(255),
              event_type VARCHAR(128) NOT NULL,
              status VARCHAR(32) NOT NULL,
              provider VARCHAR(64),
              provider_id VARCHAR(255),
              error TEXT,
              retry_count INT NOT NULL DEFAULT 0,
              payload JSONB,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_delivery_logs_created ON agentdesk_delivery_logs (created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_delivery_logs_tenant ON agentdesk_delivery_logs (tenant_id);
            CREATE INDEX IF NOT EXISTS idx_delivery_logs_status ON agentdesk_delivery_logs (status);

            CREATE TABLE IF NOT EXISTS agentdesk_rate_limits (
              key VARCHAR(255) PRIMARY KEY,
              count INT NOT NULL DEFAULT 1,
              reset_at BIGINT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agentdesk_invoices (
              id VARCHAR(128) PRIMARY KEY,
              tenant_id VARCHAR(128) NOT NULL,
              razorpay_invoice_id VARCHAR(128),
              amount NUMERIC(12, 2) NOT NULL,
              currency VARCHAR(16) NOT NULL,
              status VARCHAR(64) NOT NULL,
              hosted_invoice_url TEXT,
              created_at VARCHAR(64) NOT NULL,
              updated_at VARCHAR(64) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agentdesk_2fa_challenges (
              token_hash VARCHAR(128) PRIMARY KEY,
              user_id VARCHAR(128) NOT NULL,
              email VARCHAR(255) NOT NULL,
              role VARCHAR(64) NOT NULL,
              tenant_id VARCHAR(128) NOT NULL,
              phone VARCHAR(64) NOT NULL,
              expires_at BIGINT NOT NULL,
              created_at BIGINT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agentdesk_agents (
              id VARCHAR(128) PRIMARY KEY,
              tenant_id VARCHAR(128) NOT NULL,
              public_id VARCHAR(128),
              name VARCHAR(255) NOT NULL,
              config JSONB NOT NULL,
              created_at VARCHAR(64) NOT NULL,
              updated_at VARCHAR(64) NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agentdesk_agents (tenant_id);

            CREATE TABLE IF NOT EXISTS agentdesk_conversations (
              id VARCHAR(128) PRIMARY KEY,
              business_id VARCHAR(128) NOT NULL,
              tenant_id VARCHAR(128),
              user_id VARCHAR(128),
              visitor_id VARCHAR(128),
              status VARCHAR(64) DEFAULT 'ACTIVE',
              messages JSONB DEFAULT '[]',
              summary TEXT,
              intelligence JSONB,
              state JSONB,
              created_at VARCHAR(64) NOT NULL,
              updated_at VARCHAR(64) NOT NULL
            );
            ALTER TABLE agentdesk_conversations ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(128);
            ALTER TABLE agentdesk_conversations ADD COLUMN IF NOT EXISTS user_id VARCHAR(128);
            ALTER TABLE agentdesk_conversations ADD COLUMN IF NOT EXISTS state JSONB;
            CREATE INDEX IF NOT EXISTS idx_conversations_business ON agentdesk_conversations (business_id);
            CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON agentdesk_conversations (tenant_id);
            CREATE INDEX IF NOT EXISTS idx_conversations_user ON agentdesk_conversations (user_id);

            CREATE TABLE IF NOT EXISTS agentdesk_appointments (
              id VARCHAR(128) PRIMARY KEY,
              tenant_id VARCHAR(128) NOT NULL,
              customer_name VARCHAR(255) NOT NULL,
              customer_email VARCHAR(255),
              customer_phone VARCHAR(64),
              service_type VARCHAR(128),
              scheduled_at VARCHAR(64) NOT NULL,
              status VARCHAR(64) DEFAULT 'CONFIRMED',
              notes TEXT,
              created_at VARCHAR(64) NOT NULL,
              updated_at VARCHAR(64) NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON agentdesk_appointments (tenant_id);

            CREATE TABLE IF NOT EXISTS agentdesk_leads (
              id VARCHAR(128) PRIMARY KEY,
              tenant_id VARCHAR(128) NOT NULL,
              name VARCHAR(255) NOT NULL,
              email VARCHAR(255),
              phone VARCHAR(64),
              source VARCHAR(128),
              status VARCHAR(64) DEFAULT 'NEW',
              score INT DEFAULT 0,
              details JSONB,
              created_at VARCHAR(64) NOT NULL,
              updated_at VARCHAR(64) NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_leads_tenant ON agentdesk_leads (tenant_id);

            CREATE TABLE IF NOT EXISTS agentdesk_usage (
              tenant_id VARCHAR(128) PRIMARY KEY,
              ai_usage INT DEFAULT 0,
              voice_minutes INT DEFAULT 0,
              knowledge_documents INT DEFAULT 0,
              contacts INT DEFAULT 0,
              last_reset VARCHAR(64) NOT NULL
            );
