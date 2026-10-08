export type BackgroundMode = 'solid' | 'gradient' | 'image' | 'video' | 'aurora' | 'particles' | 'shapes' | 'glass';
export type MaterialStyle = 'solid' | 'glass' | 'soft-glass' | 'frosted' | 'transparent' | 'elevated';
export type ButtonStyle = 'solid' | 'gradient' | 'glass' | 'outline' | 'ghost' | 'pill';
export type IconStyle = 'filled' | 'outline' | 'duotone' | 'minimal';

export interface SiteDesignConfig {
  version: 2;
  site: {
    name: string;
    publicDomain: string;
    logoUrl: string;
    faviconUrl: string;
    pageTitle: string;
    pageDescription: string;
  };
  brand: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    mutedTextColor: string;
    borderColor: string;
    successColor: string;
    dangerColor: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    baseSize: number;
    headingWeight: number;
    letterSpacing: number;
    lineHeight: number;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    radius: number;
    shadow: 'none' | 'soft' | 'medium' | 'strong';
    material: MaterialStyle;
    glassBlur: number;
    glassOpacity: number;
    glassSaturation: number;
    animationSpeed: number;
    enableMotion: boolean;
  };
  background: {
    mode: BackgroundMode;
    imageUrl: string;
    videoUrl: string;
    overlayColor: string;
    overlayOpacity: number;
    gradientStart: string;
    gradientEnd: string;
    gradientAngle: number;
  };
  navigation: {
    style: 'minimal' | 'floating' | 'glass' | 'solid';
    sticky: boolean;
    showLogin: boolean;
    showGetStarted: boolean;
    showDemo: boolean;
    blur: number;
  };
  buttons: {
    style: ButtonStyle;
    radius: number;
    shadow: boolean;
    hoverLift: boolean;
    uppercase: boolean;
  };
  icons: {
    style: IconStyle;
    size: number;
    strokeWidth: number;
    color: string;
    opacity: number;
    container: boolean;
    containerRadius: number;
  };
  homepage: {
    heroHeadline: string;
    heroSubheadline: string;
    showPosterProcess: boolean;
    showBenefits: boolean;
    showIntegrations: boolean;
    showPricing: boolean;
    showFaq: boolean;
    showDashboardPreview: boolean;
    showProblem: boolean;
    showTrustBar: boolean;
    sectionOrder: string[];
    heroAlignment: 'left' | 'center' | 'right';
    heroMinHeight: number;
    heroBackgroundMode: BackgroundMode;
  };
  pages: {
    dashboard: { backgroundColor: string; surfaceColor: string; radius: number; density: 'compact' | 'comfortable' | 'spacious' };
    login: { backgroundColor: string; surfaceColor: string; showLogo: boolean };
    pricing: { backgroundColor: string; surfaceColor: string; cardRadius: number; highlightColor: string };
    public: { maxWidth: number; pagePadding: number };
  };
}

export const DEFAULT_SITE_DESIGN: SiteDesignConfig = {
  version: 2,
  site: {
    name: 'AgentDesk',
    publicDomain: '',
    logoUrl: '',
    faviconUrl: '',
    pageTitle: 'AgentDesk',
    pageDescription: 'AI employee platform for customer conversations.'
  },
  brand: {
    primaryColor: '#2563EB',
    secondaryColor: '#0F172A',
    accentColor: '#7C3AED',
    backgroundColor: '#020617',
    surfaceColor: '#0F172A',
    textColor: '#F8FAFC',
    mutedTextColor: '#94A3B8',
    borderColor: '#1E293B',
    successColor: '#22C55E',
    dangerColor: '#EF4444'
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    baseSize: 16,
    headingWeight: 700,
    letterSpacing: -0.02,
    lineHeight: 1.5
  },
  appearance: {
    theme: 'dark',
    radius: 18,
    shadow: 'medium',
    material: 'glass',
    glassBlur: 18,
    glassOpacity: 0.62,
    glassSaturation: 150,
    animationSpeed: 1,
    enableMotion: true
  },
  background: {
    mode: 'aurora',
    imageUrl: '',
    videoUrl: '',
    overlayColor: '#020617',
    overlayOpacity: 0.32,
    gradientStart: '#2563EB',
    gradientEnd: '#7C3AED',
    gradientAngle: 135
  },
  navigation: {
    style: 'glass',
    sticky: true,
    showLogin: true,
    showGetStarted: true,
    showDemo: true,
    blur: 18
  },
  buttons: {
    style: 'gradient',
    radius: 16,
    shadow: true,
    hoverLift: true,
    uppercase: false
  },
  icons: {
    style: 'outline',
    size: 20,
    strokeWidth: 1.8,
    color: '#60A5FA',
    opacity: 1,
    container: true,
    containerRadius: 12
  },
  homepage: {
    heroHeadline: 'Your AI employee for every customer conversation.',
    heroSubheadline: 'Let AgentDesk handle the first response, capture the enquiry, qualify the lead, and keep follow-up moving.',
    showPosterProcess: true,
    showBenefits: true,
    showIntegrations: true,
    showPricing: true,
    showFaq: true,
    showDashboardPreview: true,
    showProblem: true,
    showTrustBar: true,
    sectionOrder: ['hero','problem','poster','dashboard','benefits','pricing','cta','faq','footer'],
    heroAlignment: 'center',
    heroMinHeight: 720,
    heroBackgroundMode: 'aurora'
  },
  pages: {
    dashboard: { backgroundColor: '#020617', surfaceColor: '#0F172A', radius: 18, density: 'comfortable' },
    login: { backgroundColor: '#020617', surfaceColor: '#0F172A', showLogo: true },
    pricing: { backgroundColor: '#020617', surfaceColor: '#0F172A', cardRadius: 22, highlightColor: '#2563EB' },
    public: { maxWidth: 1200, pagePadding: 24 }
  }
};