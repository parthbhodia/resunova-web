/**
 * Should the Template Builder open on the templates instead of the editor?
 *
 * Founder: "template builder should show templates first when users sign in."
 * A bare /template-builder/ used to drop you into an editor already holding a
 * demo résumé you did not write, with the real choice buried in the Design
 * tab.
 *
 * ⚠️ THE WHOLE DESIGN IS IN WHEN IT DOES *NOT* SHOW. A picker that interrupts
 * someone mid-document is worse than the problem it fixes, so it appears only
 * when there is genuinely nothing to resume. Each condition names a different
 * way of already having made the choice:
 *
 *   presetFromUrl      they picked on /templates or the landing gallery
 *   builderIdFromUrl   they are opening a saved résumé from Resume Hub
 *   hasPendingPrefill  an Analyze hand-off is inbound with their real content
 *   hasStoredResume    they have work in progress in this browser
 *   hasChosenTemplate  they already picked or skipped once
 *
 * That last one is what makes this a first run rather than a toll gate:
 * someone who picks a look, writes nothing, and comes back lands in the
 * editor.
 *
 * It is a pure function rather than a condition inline in a 2,000-line
 * component for the same reason `tailorResultHeadline` is: this is the rule
 * that decides whether an interruption is honest, and it should be readable
 * and testable on its own.
 */
export interface FirstRunPickerInput {
  /** ?preset= from the gallery deep link. */
  presetFromUrl: string;
  /** ?builder= for a saved Resume Hub résumé. */
  builderIdFromUrl: string;
  /** An Analyze → Builder hand-off waiting in sessionStorage. */
  hasPendingPrefill: boolean;
  /** Meaningful work already saved in this browser. */
  hasStoredResume: boolean;
  /** A template was already picked or skipped here. */
  hasChosenTemplate: boolean;
}

export function shouldShowFirstRunPicker(input: FirstRunPickerInput): boolean {
  return (
    !input.presetFromUrl &&
    !input.builderIdFromUrl &&
    !input.hasPendingPrefill &&
    !input.hasStoredResume &&
    !input.hasChosenTemplate
  );
}
