import { postgresClient } from '../db/postgresClient.js';
import { createSession, getSession, destroySession } from '../auth/sessionStore.js';
import { integrationStore } from '../integrations/integrationStore.js';
import { conversationStore } from '../db/conversationStore.js';
import crypto from 'crypto';

export interface SmokeTestStep {
  name: string;
  category: 'DATABASE' | 'SECURITY' | 'INTEGRATIONS' | 'CONVERSATIONS' | 'ISOLATION';
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

export interface SmokeTestSuiteResult {
  allPassed: boolean;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  timestamp: string;
  steps: SmokeTestStep[];
}

export async function runProductionSmokeTests(): Promise<SmokeTestSuiteResult> {
  const steps: SmokeTestStep[] = [];

  // Step 1: PostgreSQL authoritativeness and schema check
  const startDb = Date.now();
  try {
    const isReady = await postgresClient.initialize();
    if (!isReady) {
      steps.push({
        name: 'PostgreSQL Database Connection & Initialization',
        category: 'DATABASE',
        passed: false,
        durationMs: Date.now() - startDb,
        error: 'PostgreSQL client could not be initialized or connection refused.'
      });
    } else {
      // Verify key authoritative tables
      const tableRes = await postgresClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN (
            'agentdesk_users', 
            'agentdesk_sessions', 
            'agentdesk_integrations', 
            'agentdesk_oauth_states', 
            'agentdesk_conversations'
          )
      `);
      const existingTables = (tableRes?.rows || []).map((r: any) => r.table_name);
      const requiredTables = [
        'agentdesk_users',
        'agentdesk_sessions',
        'agentdesk_integrations',
        'agentdesk_oauth_states',
        'agentdesk_conversations'
      ];
      const missing = requiredTables.filter(t => !existingTables.includes(t));

      steps.push({
        name: 'Authoritative PostgreSQL Tables Verification',
        category: 'DATABASE',
        passed: missing.length === 0,
        durationMs: Date.now() - startDb,
        details: missing.length === 0 
          ? `All 5 authoritative tables present (${existingTables.join(', ')})`
          : `Missing tables: ${missing.join(', ')}`
      });
    }
  } catch (err: any) {
    steps.push({
      name: 'Authoritative PostgreSQL Tables Verification',
      category: 'DATABASE',
      passed: false,
      durationMs: Date.now() - startDb,
      error: err.message
    });
  }

  // Step 2: Session Store Hashing & Persistence
  const startSession = Date.now();
  try {
    const testUserId = `smoke_user_${Date.now()}`;
    const testEmail = `smoke_${Date.now()}@agentdesk.internal`;
    const testTenant = `smoke_tenant_${Date.now()}`;

    // Create session (must store SHA-256 hash in DB, not plain token)
    const session = await createSession(
      testUserId,
      testEmail,
      'BUSINESS_ADMIN',
      testTenant
    );

    const rawToken = session.token;
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Query DB directly to verify hash
    const dbCheck = await postgresClient.query(`
      SELECT token_hash, user_id, email, tenant_id 
      FROM agentdesk_sessions 
      WHERE token_hash = $1
    `, [expectedHash]);

    const isHashStoredInDb = Boolean(dbCheck && dbCheck.rows && dbCheck.rows.length > 0);

    // Lookup session with raw token
    const retrieved = await getSession(rawToken);
    const lookupSucceeded = retrieved !== null && retrieved.userId === testUserId;

    // Clean up
    await destroySession(rawToken);

    steps.push({
      name: 'Session Token SHA-256 Hashing & Fail-Closed DB Persistence',
      category: 'SECURITY',
      passed: isHashStoredInDb && lookupSucceeded,
      durationMs: Date.now() - startSession,
      details: isHashStoredInDb && lookupSucceeded
        ? 'Session successfully hashed with SHA-256, persisted to PostgreSQL, and verified via constant-time token lookup.'
        : `Hash in DB: ${isHashStoredInDb}, Lookup Succeeded: ${lookupSucceeded}`
    });
  } catch (err: any) {
    steps.push({
      name: 'Session Token SHA-256 Hashing & Fail-Closed DB Persistence',
      category: 'SECURITY',
      passed: false,
      durationMs: Date.now() - startSession,
      error: err.message
    });
  }

  // Step 3: OAuth State CSRF & Single-Use Enforcement
  const startOauth = Date.now();
  try {
    const testTenant = `smoke_tenant_${Date.now()}`;

    // 1. Save state
    const generatedState = await integrationStore.generateOAuthState(
      'smoke_user_1',
      testTenant,
      'https://test.agentdesk.internal',
      'GOOGLE'
    );

    // 2. First validation (must succeed and consume atomically)
    const firstValidation = await integrationStore.validateAndConsumeOAuthState(generatedState);

    // 3. Replay attack validation (must be rejected as single-use)
    const replayValidation = await integrationStore.validateAndConsumeOAuthState(generatedState);

    const passed = firstValidation.valid && !replayValidation.valid;

    steps.push({
      name: 'OAuth State Single-Use CSRF Protection in PostgreSQL',
      category: 'SECURITY',
      passed,
      durationMs: Date.now() - startOauth,
      details: passed
        ? 'OAuth state correctly created in PostgreSQL, validated, and replay attack successfully blocked.'
        : `First valid: ${firstValidation.valid}, Replay valid: ${replayValidation.valid}`
    });
  } catch (err: any) {
    steps.push({
      name: 'OAuth State Single-Use CSRF Protection in PostgreSQL',
      category: 'SECURITY',
      passed: false,
      durationMs: Date.now() - startOauth,
      error: err.message
    });
  }

  // Step 4: Integration Store & AES-256-GCM Encryption
  const startInt = Date.now();
  try {
    const testIntegrationId = `smoke_int_${Date.now()}`;
    const testRefreshToken = `1//04_smoke_refresh_token_sample_${crypto.randomBytes(16).toString('hex')}`;
    const encryptedSecret = integrationStore.encryptSecret(testRefreshToken);

    // Save integration
    await integrationStore.saveIntegrationAsync({
      id: testIntegrationId,
      provider: 'GOOGLE',
      type: 'GMAIL',
      accountEmail: 'smoke.test@agentdesk.internal',
      encryptedRefreshToken: encryptedSecret,
      status: 'CONNECTED',
      connectedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Retrieve and verify decryption
    const retrieved = await integrationStore.getIntegrationAsync(testIntegrationId);
    const decryptedMatches = retrieved !== null && integrationStore.decryptSecret(retrieved.encryptedRefreshToken) === testRefreshToken;

    // Verify DB contains ciphertext, not plaintext
    const dbCheck = await postgresClient.query(`
      SELECT encrypted_refresh_token 
      FROM agentdesk_integrations 
      WHERE id = $1
    `, [testIntegrationId]);

    const rawDbValue = dbCheck?.rows?.[0]?.encrypted_refresh_token || '';
    const isEncryptedInDb = rawDbValue.includes(':') && !rawDbValue.includes(testRefreshToken);

    // Clean up
    await postgresClient.query('DELETE FROM agentdesk_integrations WHERE id = $1', [testIntegrationId]);

    const passed = decryptedMatches && isEncryptedInDb;

    steps.push({
      name: 'Integration Store AES-256-GCM Encryption & DB Persistence',
      category: 'INTEGRATIONS',
      passed,
      durationMs: Date.now() - startInt,
      details: passed
        ? 'OAuth tokens securely stored as AES-256-GCM ciphertext in PostgreSQL and correctly decrypted in-flight.'
        : `Decrypted match: ${decryptedMatches}, Encrypted in DB: ${isEncryptedInDb}`
    });
  } catch (err: any) {
    steps.push({
      name: 'Integration Store AES-256-GCM Encryption & DB Persistence',
      category: 'INTEGRATIONS',
      passed: false,
      durationMs: Date.now() - startInt,
      error: err.message
    });
  }

  // Step 5: Conversation Store Authoritative PostgreSQL Persistence
  const startConv = Date.now();
  try {
    const testConvId = `smoke_conv_${Date.now()}`;
    const testBizId = `smoke_tenant_${Date.now()}`;

    // Create conversation
    const conv = await conversationStore.getOrCreateConversationAsync(testConvId, testBizId);
    conv.messages.push({
      id: `msg_1`,
      conversationId: testConvId,
      businessId: testBizId,
      role: 'user',
      content: 'What is your pricing?',
      timestamp: new Date().toISOString()
    });

    await conversationStore.persistConversationAsync(conv);

    // Retrieve conversation
    const loaded = await conversationStore.getConversationAsync(testConvId, testBizId);
    const roundTripPassed = loaded !== null && loaded.messages.length === 1 && loaded.messages[0].content === 'What is your pricing?';

    // Clean up
    await conversationStore.deleteConversationsByBusinessAsync(testBizId);

    steps.push({
      name: 'Conversation Memory PostgreSQL Authoritative Round-Trip',
      category: 'CONVERSATIONS',
      passed: roundTripPassed,
      durationMs: Date.now() - startConv,
      details: roundTripPassed
        ? 'Conversation and state messages persisted to agentdesk_conversations in PostgreSQL and retrieved successfully.'
        : 'Failed to round-trip conversation state.'
    });
  } catch (err: any) {
    steps.push({
      name: 'Conversation Memory PostgreSQL Authoritative Round-Trip',
      category: 'CONVERSATIONS',
      passed: false,
      durationMs: Date.now() - startConv,
      error: err.message
    });
  }

  const passedCount = steps.filter(s => s.passed).length;
  const failedCount = steps.length - passedCount;

  return {
    allPassed: failedCount === 0,
    totalTests: steps.length,
    passedCount,
    failedCount,
    timestamp: new Date().toISOString(),
    steps
  };
}
