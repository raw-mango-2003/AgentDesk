export type HapticPattern = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 8,
  medium: 16,
  heavy: 28,
  selection: 5,
  success: [8, 30, 10],
  warning: [12, 35, 12],
  error: [24, 45, 24],
};

export function triggerHaptic(pattern: HapticPattern = 'light'): void {
  if (typeof window === 'undefined') return;
  try {
    if (typeof navigator.vibrate !== 'function') return;
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Haptics are progressive enhancement. Never block the interaction.
  }
}

export function installGlobalHaptics(): () => void {
  if (typeof document === 'undefined') return () => undefined;

  const handlePointerDown = (event: PointerEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;

    const target = event.target instanceof Element ? event.target : null;
    const interactive = target?.closest(
      'button, a, [role="button"], input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"], select, summary'
    );

    if (!interactive || interactive.getAttribute('aria-disabled') === 'true') return;

    if ('disabled' in interactive && Boolean((interactive as HTMLButtonElement | HTMLInputElement | HTMLSelectElement).disabled)) {
      return;
    }

    if (interactive.closest('[data-haptics="off"]')) return;

    triggerHaptic('light');
  };

  document.addEventListener('pointerdown', handlePointerDown, { passive: true });
  return () => document.removeEventListener('pointerdown', handlePointerDown);
}
