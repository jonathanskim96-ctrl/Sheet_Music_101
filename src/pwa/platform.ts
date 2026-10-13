/** True on iPhone, iPad and iPod (iPadOS can pose as a Mac, but a Mac has no touch screen). */
export function isIosDevice(
  nav: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> = navigator,
): boolean {
  return (
    /iPhone|iPad|iPod/.test(nav.userAgent) ||
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
  );
}
