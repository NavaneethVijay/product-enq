/**
 * Brings an element into view: smooth scrolling unless the user prefers reduced motion.
 * 'nearest' means nothing moves if the element is already visible (typical on desktop).
 */
export function revealElement(element: HTMLElement | null): void {
  if (!element?.scrollIntoView) return; // not available in some test environments
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
}
