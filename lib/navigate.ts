/**
 * Replace the current page with another, without adding a history entry, so the
 * Back button returns to wherever the visitor came from (usually a search
 * result) and not to a page that only redirects.
 *
 * One function in its own module so tests can replace it: jsdom does not
 * implement navigation.
 */
export function goTo(href: string): void {
  window.location.replace(href);
}
