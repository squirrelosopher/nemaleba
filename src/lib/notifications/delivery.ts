export const DeliverySetup = {
  NeedsHomeScreen: 'needs-home-screen',
  Installed: 'installed',
  SurvivesBrowserClose: 'survives-browser-close',
  RequiresOpenBrowser: 'requires-open-browser'
} as const;

export type DeliverySetup = (typeof DeliverySetup)[keyof typeof DeliverySetup];

type AppleNavigator = Navigator & { standalone?: boolean };
type HintedNavigator = Navigator & { userAgentData?: { platform?: string } };

const ANDROID = 'Android';

function isApplePhoneOrTablet(): boolean {
  const touchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  return /iPad|iPhone|iPod/.test(navigator.userAgent) || touchMac;
}

function runsAsInstalledApp(): boolean {
  return (
    (navigator as AppleNavigator).standalone === true ||
    matchMedia('(display-mode: standalone)').matches
  );
}

function wakesWithoutTheBrowser(): boolean {
  const platform = (navigator as HintedNavigator).userAgentData?.platform;

  return platform ? platform === ANDROID : matchMedia('(pointer: coarse)').matches;
}

export function detectDeliverySetup(): DeliverySetup {
  if (runsAsInstalledApp()) {
    return DeliverySetup.Installed;
  }

  if (isApplePhoneOrTablet()) {
    return DeliverySetup.NeedsHomeScreen;
  }

  return wakesWithoutTheBrowser()
    ? DeliverySetup.SurvivesBrowserClose
    : DeliverySetup.RequiresOpenBrowser;
}

export function canInstallFromBrowserMenu(): boolean {
  return (navigator as HintedNavigator).userAgentData !== undefined;
}

export function allowsSubscribing(setup: DeliverySetup): boolean {
  return setup !== DeliverySetup.NeedsHomeScreen;
}
