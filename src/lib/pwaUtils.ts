/**
 * PWA Installation & Standalone Detection Utilities
 * Manages install state and ensures install prompts only show for website users
 * after a minimum 30-minute randomized interval.
 */

const STORAGE_KEY_INSTALLED = 'pwa_app_installed';
const STORAGE_KEY_NEXT_PROMPT = 'pwa_install_next_prompt_time';

// Minimum delay: 30 minutes (1,800,000 ms).
// Random variation: 0..15 minutes (0..900,000 ms).
// Total delay: 30 to 45 minutes.
const MIN_DELAY_MS = 30 * 60 * 1000;
const RANDOM_VARIATION_MS = 15 * 60 * 1000;

/**
 * Checks if the app is currently running in standalone PWA mode
 * (e.g. opened from home screen on mobile or standalone window on desktop).
 */
export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;

  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isFullscreenMedia = window.matchMedia('(display-mode: fullscreen)').matches;
  const isMinimalUiMedia = window.matchMedia('(display-mode: minimal-ui)').matches;
  const isNavigatorStandalone = (window.navigator as any).standalone === true;
  const isAndroidReferrer = typeof document !== 'undefined' && document.referrer.includes('android-app://');

  return isStandaloneMedia || isFullscreenMedia || isMinimalUiMedia || isNavigatorStandalone || isAndroidReferrer;
}

/**
 * Checks if the app is already installed or running as a standalone app.
 */
export function isAppAlreadyInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  if (isStandaloneApp()) return true;

  try {
    return localStorage.getItem(STORAGE_KEY_INSTALLED) === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks the app as installed in persistent storage and clears pending prompts.
 */
export function markAppInstalled(): void {
  try {
    localStorage.setItem(STORAGE_KEY_INSTALLED, 'true');
    localStorage.removeItem(STORAGE_KEY_NEXT_PROMPT);
  } catch {}
}

/**
 * Generates a random delay of at least 30 minutes (30..45 mins).
 */
export function getRandomInstallDelayMs(): number {
  return MIN_DELAY_MS + Math.floor(Math.random() * RANDOM_VARIATION_MS);
}

/**
 * Schedules the next install prompt time in localStorage.
 */
export function scheduleNextInstallPrompt(): number {
  const nextTime = Date.now() + getRandomInstallDelayMs();
  try {
    localStorage.setItem(STORAGE_KEY_NEXT_PROMPT, nextTime.toString());
  } catch {}
  return nextTime;
}

/**
 * Gets or initializes the next prompt time.
 * Ensures a website user always has at least a 30-minute grace period upon loading.
 */
export function getOrInitNextInstallPromptTime(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_NEXT_PROMPT);
    if (stored) {
      const parsed = parseInt(stored, 10);
      // If scheduled in the future, honor it
      if (!isNaN(parsed) && parsed > Date.now()) {
        return parsed;
      }
    }
  } catch {}

  // If missing or past, schedule a new 30+ min delay
  return scheduleNextInstallPrompt();
}

/**
 * Checks Chrome/Edge getInstalledRelatedApps API if supported
 */
export async function checkInstalledRelatedApps(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'getInstalledRelatedApps' in navigator) {
    try {
      const relatedApps = await (navigator as any).getInstalledRelatedApps();
      if (Array.isArray(relatedApps) && relatedApps.length > 0) {
        markAppInstalled();
        return true;
      }
    } catch {}
  }
  return false;
}
