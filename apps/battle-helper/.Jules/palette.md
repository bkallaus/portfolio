## 2024-05-18 - Input Association Accessibility
**Learning:** Found that custom search inputs (like 'Species', 'Nature', and Move filter) and deeply nested control structures lacking direct `<label>` tags created a significant barrier for screen readers in complex forms (VGC Tactical HUD). This was noticeable since many input fields function effectively as comboboxes or search boxes and rely purely on visual proximity and placeholder text for context.
**Action:** Always ensure that every `<input>` uses a direct `id` referenced by a `<label htmlFor="id">` or explicitly has an `aria-label` when a visible label isn't practical or lacks one. Ensure icon-only clear buttons ("✕") provide full context via `aria-label` (e.g., "Clear species" instead of "Clear").

## 2025-05-24 - Grouping Toggle Button Clusters
**Learning:** In applications with grids of custom interactive toggle buttons (like the Type Chart calculator), individual buttons lack collective context for screen reader users. The relationship between the label (e.g., "Attacking Type") and the buttons is lost without proper grouping.
**Action:** When working with clusters of custom interactive buttons (e.g., UI toggle grids), group them semantically using `role="group"` and reference them with `aria-labelledby` on their container so screen readers understand the collective action. Add `aria-pressed` to individual toggle buttons to indicate active state.## 2024-05-31 - [Adding Semantic Roles to Tablists and Form Control Groups]
**Learning:** When standard HTML buttons and divs are used to build interactive components like tab navigations or clustered stat controls, adding semantic roles (`role="tablist"`, `role="tab"`, `role="group"`) and dynamic ARIA attributes drastically improves screen reader context.
**Action:** I will proactively look for opportunities to upgrade custom structural components with semantic ARIA roles and labels, especially in complex dashboards.

## 2026-06-06 - Dynamic Empty States and Live Regions
**Learning:** When filtering dynamic lists (like the move filter) yields no displayed results but the underlying dataset is non-empty, the resulting visual emptiness lacks clear affordance, and screen readers fail to announce the lack of results. This breaks user recovery flow.
**Action:** Always render a distinct empty state UI with a clear call-to-action (like 'Clear Filter') when filtering yields no results. Apply `role="status"` and `aria-live="polite"` to the container so that screen readers announce the state automatically without focus loss.
## 2025-06-12 - Ephemeral Feedback State
**Learning:** Adding a temporary "Saved!" visual state significantly reduces user uncertainty after clicking inline buttons, and implementing it via standard React `useState` and `setTimeout` is extremely effective without any new dependencies.
**Action:** Default to providing a temporary visual confirmation state combined with `aria-live="polite"` for non-navigating actions like Save or Copy.

## 2026-07-08 - Focus Management for Unmounting Elements & Removing Destructive onFocus Actions
**Learning:** Clearing values on `onFocus` causes severe accessibility and data-loss issues for keyboard users tabbing through inputs. Additionally, when a conditionally rendered element (like a 'clear input' button) is clicked and subsequently unmounts, focus is lost to the document body, breaking keyboard navigation flow.
**Action:** Never bind destructive state-clearing actions to `onFocus`. Always explicitly manage focus by attaching a `useRef` to the associated persistent input element and invoking `.focus()` within the event handler of any conditionally rendered button that unmounts upon interaction.

## 2024-06-25 - Copy Calculation Functionality Added
**Learning:** Added an inline CopyCalcButton to the damage calculator to handle sharing calculations. Adding immediate ephemeral visual feedback ("✅ Copied") upon clicking significantly enhances the user experience and confidence without requiring toast notifications or context loss.
**Action:** Used standard React state with `setTimeout` and `aria-live="polite"` to ensure accessibility and a clear UX flow for copy actions.
## 2025-02-24 - Accessible TypeChartPanel Results
**Learning:** Dynamically updated results in TypeChartPanel were not announced by screen readers when users toggled types. Also, clearing the defending species input left keyboard users with focus loss.
**Action:** Applied `role="status"` and `aria-live="polite"` to the result container. Managed focus with a `useRef` to restore focus to the input when the clear button unmounts upon interaction.
