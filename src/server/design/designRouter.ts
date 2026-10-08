import { Router, Request, Response } from 'express';
import { postgresClient } from '../db/postgresClient.js';
import { extractTokenFromRequest } from '../auth/authRouter.js';
import { getSession } from '../auth/sessionStore.js';
import { getUserById } from '../auth/userRegistry.js';
import { DEFAULT_SITE_DESIGN, SiteDesignConfig } from './designTypes.js';

export const designRouter = Router();

const HEX = /^#[0-9a-fA-F]{6}$/;
const clamp = (n: unknown, min: number, max: number, fallback: number) => Number.isFinite(Number(n)) ? Math.min(max, Math.max(min, Number(n))) : fallback;
const str = (v: unknown, max: number, fallback: string) => typeof v === 'string' ? v.trim().slice(0, max) : fallback;
const bool = (v: unknown, fallback: boolean) => typeof v === 'boolean' ? v : fallback;
const oneOf = <T extends string>(v: unknown, values: readonly T[], fallback: T): T => values.includes(v as T) ? v as T : fallback;
const color = (v: unknown, fallback: string) => typeof v === 'string' && HEX.test(v) ? v : fallback;

function sanitizeDesign(input: any): SiteDesignConfig {
  const d = structuredClone(DEFAULT_SITE_DESIGN);
  if (!input || typeof input !== 'object') return d;

  d.site.name = str(input.site?.name, 80, d.site.name);
  d.site.publicDomain = str(input.site?.publicDomain, 253, d.site.publicDomain).toLowerCase().replace(/[^a-z0-9.:-]/g, '');
  d.site.logoUrl = str(input.site?.logoUrl, 500, d.site.logoUrl);
  d.site.faviconUrl = str(input.site?.faviconUrl, 500, d.site.faviconUrl);
  d.site.pageTitle = str(input.site?.pageTitle, 160, d.site.pageTitle);
  d.site.pageDescription = str(input.site?.pageDescription, 300, d.site.pageDescription);

  for (const key of Object.keys(d.brand) as Array<keyof typeof d.brand>) d.brand[key] = color(input.brand?.[key], d.brand[key]);

  d.typography.headingFont = str(input.typography?.headingFont, 80, d.typography.headingFont);
  d.typography.bodyFont = str(input.typography?.bodyFont, 80, d.typography.bodyFont);
  d.typography.baseSize = clamp(input.typography?.baseSize, 12, 24, d.typography.baseSize);
  d.typography.headingWeight = clamp(input.typography?.headingWeight, 400, 900, d.typography.headingWeight);
  d.typography.letterSpacing = clamp(input.typography?.letterSpacing, -0.1, 0.2, d.typography.letterSpacing);
  d.typography.lineHeight = clamp(input.typography?.lineHeight, 1, 2.2, d.typography.lineHeight);

  d.appearance.theme = oneOf(input.appearance?.theme, ['light','dark','system'] as const, d.appearance.theme);
  d.appearance.material = oneOf(input.appearance?.material, ['solid','glass','soft-glass','frosted','transparent','elevated'] as const, d.appearance.material);
  d.appearance.shadow = oneOf(input.appearance?.shadow, ['none','soft','medium','strong'] as const, d.appearance.shadow);
  d.appearance.radius = clamp(input.appearance?.radius, 0, 40, d.appearance.radius);
  d.appearance.glassBlur = clamp(input.appearance?.glassBlur, 0, 40, d.appearance.glassBlur);
  d.appearance.glassOpacity = clamp(input.appearance?.glassOpacity, 0.1, 1, d.appearance.glassOpacity);
  d.appearance.glassSaturation = clamp(input.appearance?.glassSaturation, 50, 250, d.appearance.glassSaturation);
  d.appearance.animationSpeed = clamp(input.appearance?.animationSpeed, 0.1, 3, d.appearance.animationSpeed);
  d.appearance.enableMotion = bool(input.appearance?.enableMotion, d.appearance.enableMotion);

  d.background.mode = oneOf(input.background?.mode, ['solid','gradient','image','video','aurora','particles','shapes','glass'] as const, d.background.mode);
  d.background.imageUrl = typeof input.background?.imageUrl === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(input.background.imageUrl) ? input.background.imageUrl.slice(0, 1200000) : str(input.background?.imageUrl, 1000, d.background.imageUrl);
  d.background.videoUrl = str(input.background?.videoUrl, 1000, d.background.videoUrl);
  d.background.overlayColor = color(input.background?.overlayColor, d.background.overlayColor);
  d.background.overlayOpacity = clamp(input.background?.overlayOpacity, 0, 1, d.background.overlayOpacity);
  d.background.gradientStart = color(input.background?.gradientStart, d.background.gradientStart);
  d.background.gradientEnd = color(input.background?.gradientEnd, d.background.gradientEnd);
  d.background.gradientAngle = clamp(input.background?.gradientAngle, 0, 360, d.background.gradientAngle);

  d.navigation.style = oneOf(input.navigation?.style, ['minimal','floating','glass','solid'] as const, d.navigation.style);
  d.navigation.sticky = bool(input.navigation?.sticky, d.navigation.sticky);
  d.navigation.showLogin = bool(input.navigation?.showLogin, d.navigation.showLogin);
  d.navigation.showGetStarted = bool(input.navigation?.showGetStarted, d.navigation.showGetStarted);
  d.navigation.showDemo = bool(input.navigation?.showDemo, d.navigation.showDemo);
  d.navigation.blur = clamp(input.navigation?.blur, 0, 40, d.navigation.blur);

  d.buttons.style = oneOf(input.buttons?.style, ['solid','gradient','glass','outline','ghost','pill'] as const, d.buttons.style);
  d.buttons.radius = clamp(input.buttons?.radius, 0, 40, d.buttons.radius);
  d.buttons.shadow = bool(input.buttons?.shadow, d.buttons.shadow);
  d.buttons.hoverLift = bool(input.buttons?.hoverLift, d.buttons.hoverLift);
  d.buttons.uppercase = bool(input.buttons?.uppercase, d.buttons.uppercase);

  d.icons.style = oneOf(input.icons?.style, ['filled','outline','duotone','minimal'] as const, d.icons.style);
  d.icons.size = clamp(input.icons?.size, 12, 64, d.icons.size);
  d.icons.strokeWidth = clamp(input.icons?.strokeWidth, 0.5, 4, d.icons.strokeWidth);
  d.icons.color = color(input.icons?.color, d.icons.color);
  d.icons.opacity = clamp(input.icons?.opacity, 0.1, 1, d.icons.opacity);
  d.icons.container = bool(input.icons?.container, d.icons.container);
  d.icons.containerRadius = clamp(input.icons?.containerRadius, 0, 30, d.icons.containerRadius);

  d.homepage.heroHeadline = str(input.homepage?.heroHeadline, 180, d.homepage.heroHeadline);
  d.homepage.heroSubheadline = str(input.homepage?.heroSubheadline, 500, d.homepage.heroSubheadline);
  for (const key of ['showPosterProcess','showBenefits','showIntegrations','showPricing','showFaq','showDashboardPreview','showProblem','showTrustBar'] as const) d.homepage[key] = bool(input.homepage?.[key], d.homepage[key]);
  d.homepage.heroAlignment = oneOf(input.homepage?.heroAlignment, ['left','center','right'] as const, d.homepage.heroAlignment);
  d.homepage.heroMinHeight = clamp(input.homepage?.heroMinHeight, 420, 1000, d.homepage.heroMinHeight);
  d.homepage.heroBackgroundMode = oneOf(input.homepage?.heroBackgroundMode, ['solid','gradient','image','video','aurora','particles','shapes','glass'] as const, d.homepage.heroBackgroundMode);
  if (Array.isArray(input.homepage?.sectionOrder)) {
    const allowed = new Set(['hero','problem','poster','dashboard','benefits','pricing','cta','faq','footer']);
    const order = input.homepage.sectionOrder.filter((x: unknown): x is string => typeof x === 'string' && allowed.has(x));
    if (order.length) d.homepage.sectionOrder = Array.from(new Set<string>(order));
  }

  d.pages.dashboard.backgroundColor = color(input.pages?.dashboard?.backgroundColor, d.pages.dashboard.backgroundColor);
  d.pages.dashboard.surfaceColor = color(input.pages?.dashboard?.surfaceColor, d.pages.dashboard.surfaceColor);
  d.pages.dashboard.radius = clamp(input.pages?.dashboard?.radius, 0, 40, d.pages.dashboard.radius);
  d.pages.dashboard.density = oneOf(input.pages?.dashboard?.density, ['compact','comfortable','spacious'] as const, d.pages.dashboard.density);
  d.pages.login.backgroundColor = color(input.pages?.login?.backgroundColor, d.pages.login.backgroundColor);
  d.pages.login.surfaceColor = color(input.pages?.login?.surfaceColor, d.pages.login.surfaceColor);
  d.pages.login.showLogo = bool(input.pages?.login?.showLogo, d.pages.login.showLogo);
  d.pages.pricing.backgroundColor = color(input.pages?.pricing?.backgroundColor, d.pages.pricing.backgroundColor);
  d.pages.pricing.surfaceColor = color(input.pages?.pricing?.surfaceColor, d.pages.pricing.surfaceColor);
  d.pages.pricing.cardRadius = clamp(input.pages?.pricing?.cardRadius, 0, 40, d.pages.pricing.cardRadius);
  d.pages.pricing.highlightColor = color(input.pages?.pricing?.highlightColor, d.pages.pricing.highlightColor);
  d.pages.public.maxWidth = clamp(input.pages?.public?.maxWidth, 900, 1800, d.pages.public.maxWidth);
  d.pages.public.pagePadding = clamp(input.pages?.public?.pagePadding, 8, 80, d.pages.public.pagePadding);
  return d;
}

async function getDesign() {
  const result = await postgresClient.query('SELECT config FROM agentdesk_site_design WHERE id = $1 LIMIT 1', ['global']);
  return result.rows[0]?.config ? sanitizeDesign(result.rows[0].config) : DEFAULT_SITE_DESIGN;
}

async function requirePlatformAdmin(req: Request, res: Response) {
  const token = extractTokenFromRequest(req);
  const session = await getSession(token);
  const user = session ? getUserById(session.userId) : null;
  if (!user) { res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' } }); return null; }
  if (user.role !== 'PLATFORM_ADMIN') { res.status(403).json({ success: false, error: { code: 'DESIGN_FORBIDDEN', message: 'Only Platform Admin can manage the Visual Studio.' } }); return null; }
  return user;
}

designRouter.get('/site-design', async (_req, res) => {
  try { return res.json({ success: true, design: await getDesign() }); }
  catch (err) { console.error('[DesignRouter] Failed to read:', err); return res.json({ success: true, design: DEFAULT_SITE_DESIGN }); }
});

designRouter.put('/site-design', async (req, res) => {
  try {
    const user = await requirePlatformAdmin(req, res); if (!user) return;
    const design = sanitizeDesign(req.body);
    await postgresClient.query(`INSERT INTO agentdesk_site_design (id, config, updated_by, updated_at)
      VALUES ($1, $2::jsonb, $3, $4)
      ON CONFLICT (id) DO UPDATE SET config=EXCLUDED.config, updated_by=EXCLUDED.updated_by, updated_at=EXCLUDED.updated_at`,
      ['global', JSON.stringify(design), user.id, new Date().toISOString()]);
    return res.json({ success: true, design });
  } catch (err) { console.error('[DesignRouter] Failed to save:', err); return res.status(500).json({ success: false, error: { code: 'DESIGN_SAVE_FAILED', message: 'Unable to save site design.' } }); }
});

designRouter.post('/site-design/reset', async (req, res) => {
  try {
    const user = await requirePlatformAdmin(req, res); if (!user) return;
    await postgresClient.query('DELETE FROM agentdesk_site_design WHERE id = $1', ['global']);
    return res.json({ success: true, design: DEFAULT_SITE_DESIGN });
  } catch (err) { console.error('[DesignRouter] Failed to reset:', err); return res.status(500).json({ success: false, error: { code: 'DESIGN_RESET_FAILED', message: 'Unable to reset site design.' } }); }
});
