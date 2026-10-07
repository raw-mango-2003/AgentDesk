import { Router, Request, Response } from 'express';
import { postgresClient } from '../db/postgresClient.js';
import { extractTokenFromRequest } from '../auth/authRouter.js';
import { getSession } from '../auth/sessionStore.js';
import { getUserById } from '../auth/userRegistry.js';
import { DEFAULT_SITE_DESIGN, SiteDesignConfig } from './designTypes.js';

export const designRouter = Router();

function validHex(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function sanitizeDesign(input: any): SiteDesignConfig {
  const next = structuredClone(DEFAULT_SITE_DESIGN);
  if (!input || typeof input !== 'object') return next;

  if (typeof input.site?.name === 'string') next.site.name = input.site.name.trim().slice(0, 80);
  if (typeof input.site?.publicDomain === 'string') next.site.publicDomain = input.site.publicDomain.trim().toLowerCase().replace(/[^a-z0-9.:-]/g, '').slice(0, 253);
  if (typeof input.site?.logoUrl === 'string') next.site.logoUrl = input.site.logoUrl.trim().slice(0, 500);

  if (validHex(input.brand?.primaryColor)) next.brand.primaryColor = input.brand.primaryColor;
  if (validHex(input.brand?.secondaryColor)) next.brand.secondaryColor = input.brand.secondaryColor;
  if (validHex(input.brand?.accentColor)) next.brand.accentColor = input.brand.accentColor;
  if (validHex(input.brand?.backgroundColor)) next.brand.backgroundColor = input.brand.backgroundColor;
  if (validHex(input.brand?.textColor)) next.brand.textColor = input.brand.textColor;

  if (typeof input.typography?.headingFont === 'string') next.typography.headingFont = input.typography.headingFont.slice(0, 80);
  if (typeof input.typography?.bodyFont === 'string') next.typography.bodyFont = input.typography.bodyFont.slice(0, 80);
  if (Number.isFinite(input.typography?.baseSize)) next.typography.baseSize = Math.min(24, Math.max(12, Number(input.typography.baseSize)));
  if (Number.isFinite(input.typography?.headingWeight)) next.typography.headingWeight = Math.min(900, Math.max(400, Number(input.typography.headingWeight)));

  if (typeof input.homepage?.heroHeadline === 'string') next.homepage.heroHeadline = input.homepage.heroHeadline.slice(0, 180);
  if (typeof input.homepage?.heroSubheadline === 'string') next.homepage.heroSubheadline = input.homepage.heroSubheadline.slice(0, 500);
  for (const key of ['showPosterProcess','showBenefits','showIntegrations','showPricing','showFaq'] as const) {
    if (typeof input.homepage?.[key] === 'boolean') next.homepage[key] = input.homepage[key];
  }
  if (Array.isArray(input.homepage?.sectionOrder)) {
    const allowed = new Set(['hero','benefits','integrations','pricing','faq']);
    next.homepage.sectionOrder = input.homepage.sectionOrder.filter((x: unknown): x is string => typeof x === 'string' && allowed.has(x));
  }

  return next;
}

async function getDesign(): Promise<SiteDesignConfig> {
  const result = await postgresClient.query(
    'SELECT config FROM agentdesk_site_design WHERE id = $1 LIMIT 1',
    ['global']
  );
  return result.rows[0]?.config ? sanitizeDesign(result.rows[0].config) : DEFAULT_SITE_DESIGN;
}

designRouter.get('/site-design', async (_req: Request, res: Response) => {
  try {
    return res.json({ success: true, design: await getDesign() });
  } catch (err) {
    console.error('[DesignRouter] Failed to read site design:', err);
    return res.json({ success: true, design: DEFAULT_SITE_DESIGN });
  }
});

designRouter.put('/site-design', async (req: Request, res: Response) => {
  try {
    const token = extractTokenFromRequest(req);
    const session = await getSession(token);
    const user = session ? getUserById(session.userId) : null;
    if (!user) return res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' } });
    if (user.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ success: false, error: { code: 'DESIGN_FORBIDDEN', message: 'Only Platform Admin can edit the site design.' } });
    }

    const design = sanitizeDesign(req.body);
    await postgresClient.query(
      `INSERT INTO agentdesk_site_design (id, config, updated_by, updated_at)
       VALUES ($1, $2::jsonb, $3, $4)
       ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at`,
      ['global', JSON.stringify(design), user.id, new Date().toISOString()]
    );

    return res.json({ success: true, design });
  } catch (err) {
    console.error('[DesignRouter] Failed to save site design:', err);
    return res.status(500).json({ success: false, error: { code: 'DESIGN_SAVE_FAILED', message: 'Unable to save site design.' } });
  }
});

designRouter.post('/site-design/reset', async (req: Request, res: Response) => {
  try {
    const token = extractTokenFromRequest(req);
    const session = await getSession(token);
    const user = session ? getUserById(session.userId) : null;
    if (!user) return res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' } });
    if (user.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ success: false, error: { code: 'DESIGN_FORBIDDEN', message: 'Only Platform Admin can reset the site design.' } });
    }

    await postgresClient.query('DELETE FROM agentdesk_site_design WHERE id = $1', ['global']);
    return res.json({ success: true, design: DEFAULT_SITE_DESIGN });
  } catch (err) {
    console.error('[DesignRouter] Failed to reset site design:', err);
    return res.status(500).json({ success: false, error: { code: 'DESIGN_RESET_FAILED', message: 'Unable to reset site design.' } });
  }
});
