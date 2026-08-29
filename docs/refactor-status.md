# TeacherBoard v1 Refactor Status

## Current milestone: merge candidate ready for PR review

Branch: `refactor-v1`

`main` has not been modified.

## Architecture now in use

- `js/state.js` owns document/page normalization and the canonical schema.
- `js/storage.js` owns IndexedDB persistence and legacy cache fallback.
- `js/store-v1.js` bridges canonical IndexedDB state with the transitional synchronous runtime cache.
- IndexedDB stores canonical `raster.image` and `items`.
- The transitional `localStorage` cache exposes runtime `image` and `objects` aliases without duplicating canonical fields in IndexedDB.
- `js/history.js` provides bounded chronological history shared by raster and editable-object actions.
- `js/core-runtime-v1.js` owns raster drawing, backgrounds, page rendering/switching, zoom, fullscreen and laser.
- `js/objects-runtime-v2.js` currently owns editable text, images, curtain and geometry/math objects. The filename is a remaining naming artifact only; the obsolete v2 application runtime is gone.
- `js/object-keyboard-v1.js` adds focusable editable objects, keyboard movement, keyboard deletion and text editing entry while preserving shared Undo/Redo history.
- `js/objects.js` is the integrated SVG geometry/math renderer.
- `js/pages-v1.js` owns page context actions and page-height extension.
- `js/lifecycle-v1.js` owns clear, add-page and top-level duplicate actions.
- `js/export-v1.js` composes background, raster and editable objects for PNG/PDF.
- `js/mobile.js` owns the purpose-built mobile controls and overflow menu.
- `js/accessibility-v1.js` owns accessible names, pressed/expanded state and keyboard menu behavior.
- `js/icons-v1.js` converts interface glyphs to one consistent inline SVG icon system. Mathematical symbols remain text because they are educational content.

The obsolete `app.js`, `v2.js`, `v3.js`, `fixes-v5.js`, `fixes-v6.js`, `fixes-v7.js`, `compat.js` and old `objects-runtime.js` are no longer part of the branch. Their history remains available through Git.

## CSS structure

The historical base cascade has been consolidated into `css/base-v1.css` while preserving the previous rule order during the first consolidation step.

Active stylesheets are now:

1. `css/base-v1.css`
2. `css/objects-v2.css`
3. `css/mobile.css`
4. `css/accessibility-v1.css`
5. `css/icons-v1.css`
6. `css/layout-fixes-v1.css`

The superseded `style.css`, `compact.css`, `v2.css` and `v3.css` files have been removed from the branch.

## Stabilization fixes completed

The refactor fixed production defects found through Chromium regression testing, including:

- editable objects blocking drawing/shape creation outside Select mode;
- selection loss during write-through storage updates;
- invalid pointer capture on rerendered object nodes;
- IndexedDB hydration being overwritten by a blank document during boot;
- unload autosave synthesizing a replacement document when the runtime cache was absent;
- competing canonical/runtime object fields in the cache;
- incorrect legacy text/curtain normalization;
- broken text double-click editing caused by premature DOM replacement;
- a page-tab MutationObserver feedback loop;
- mobile shape choices below the preferred touch target;
- mobile overflow accessibility and keyboard gaps;
- the mobile color/thickness panel requiring a second activation;
- object controls intercepting drawing gestures in non-select modes;
- browser zoom being blocked by the viewport configuration;
- desktop topbar compression hiding the PDF action at 1440 px. The PDF action now collapses to an accessible icon at the squeeze breakpoint instead of becoming partially clipped.

## Automated browser verification

Run `#174` on commit `25d6f1ff38073d5d575407117acec15b9e07d84e` passed completely in Chromium after the final responsive topbar fix.

The workflow runs eleven functional/accessibility browser suites plus one responsive visual-QA capture:

1. `tests/browser-smoke.mjs`
2. `tests/page-persistence.mjs`
3. `tests/content-regression.mjs`
4. `tests/export-regression.mjs`
5. `tests/raster-regression.mjs`
6. `tests/math-regression.mjs`
7. `tests/accessibility-regression.mjs`
8. `tests/page-lifecycle-regression.mjs`
9. `tests/storage-fallback-regression.mjs`
10. `tests/icons-regression.mjs`
11. `tests/advanced-interaction-regression.mjs`
12. `tests/visual-qa.mjs`

The CI test dependency uses Playwright `1.62.1`.

## Verified behavior

### Drawing and shared history

- [x] Pen draws and persists.
- [x] Marker draws and persists.
- [x] Eraser removes raster strokes.
- [x] Raster arrow draws and persists.
- [x] Raster undo/redo restores the expected canvas state.
- [x] Raster and editable-object actions remain chronological when interleaved.

### Editable objects

- [x] Rectangle creation works through the UI.
- [x] Geometry and mathematical presets render through the integrated SVG renderer.
- [x] Select mode works.
- [x] Object move works.
- [x] Object resize works.
- [x] Object deletion works.
- [x] Undo/redo covers creation, move, resize and deletion scenarios exercised by the suite.
- [x] Editable objects are keyboard focusable and receive accessible names.
- [x] Arrow keys move a focused object in small steps.
- [x] Shift+Arrow uses a larger movement step.
- [x] Keyboard movement participates in shared Undo/Redo history.
- [x] Delete/Backspace can remove a focused editable object.
- [x] Undo restores a keyboard-deleted object.

### Text, curtain and images

- [x] New text is created as an editable object.
- [x] Text double-click editing works.
- [x] Enter on a focused text object opens editing.
- [x] The text/formula textarea has an explicit `<label>` rather than relying on placeholder text.
- [x] Legacy `page.texts` migrates to editable text without duplication.
- [x] Curtain creation is verified.
- [x] Curtain keyboard movement is verified.
- [x] Local file image insertion is verified.
- [x] Clipboard image insertion is verified through a bubbling clipboard event.
- [x] Image resize is verified.
- [x] Keyboard image deletion and Undo restoration are verified.

### Mathematics

- [x] Line, rectangle, ellipse, triangle, right triangle, parallelogram, trapezoid, rhombus, angle and arc render complete SVG output.
- [x] Number line -5…5 has one positive-direction arrowhead.
- [x] Number line -10…10 uses readable labels.
- [x] Coordinate axes contain the intended positive x/y arrowheads.
- [x] x/y table renderer is verified.
- [x] Axes, number-line and x/y-table presets insert through the active Shapes menu.
- [x] Mathematical symbols in the teaching panel remain text content rather than decorative UI icons.

### Pages

- [x] Switching pages restores correct state.
- [x] Duplicating a page duplicates content and height.
- [x] Adding a page starts clean without full application reload.
- [x] Renaming preserves page objects.
- [x] Deleting a middle page does not shift unrelated objects.
- [x] The final remaining page is protected from deletion.
- [x] Extended height updates the page, height cache and canvas without changing existing object coordinates.

### Clear and export

- [x] Clear removes raster and editable objects from the active page.
- [x] PNG composition includes background, raster, text, image, shape and curtain content.
- [x] PNG uses the full extended page height.
- [x] Multi-page PDF composition is verified with controlled `jsPDF` integration.
- [x] PDF preserves individual page heights in the tested scenario.

### Persistence

- [x] New state reaches IndexedDB.
- [x] Multi-page recovery works after deleting the local cache.
- [x] Raster and editable text recover from IndexedDB.
- [x] Legacy localStorage migration persists into canonical IndexedDB state.
- [x] The application remains usable when IndexedDB is unavailable and local cache fallback is required.
- [x] Raster writes continue in fallback mode without losing editable objects.

### Responsive, accessibility and motion

- [x] Desktop, tablet and phone startup/toolbar availability are covered.
- [x] Mobile Shapes menu fits the tested phone viewport.
- [x] Main mobile touch controls meet the preferred 44 px target in tested paths.
- [x] Mobile overflow exposes menu/menuitem semantics.
- [x] Mobile overflow supports Arrow Up/Down, Home, End and Escape.
- [x] Shapes menu exposes expanded state and menuitem semantics.
- [x] Shapes menu supports arrow navigation, Home, End and Escape with focus return.
- [x] Keyboard `Tab` produces a visible `:focus-visible` outline in Chromium.
- [x] Core controls receive accessible names.
- [x] Browser page zoom remains available.
- [x] `prefers-reduced-motion: reduce` suppresses tested transitions.
- [x] Interface controls use the unified SVG icon layer in desktop and mobile tests.

## Visual QA

Run `#174` captures full-page screenshots and layout metrics for:

- desktop `1440×1000`;
- tablet `900×1100`;
- phone `390×844`.

The visual-QA assertions confirm that the document does not develop unintended horizontal overflow, the toolbar/topbar/pagebar remain visible and the board retains a usable area in all three viewports.

The screenshots were manually inspected after the automated run. A desktop topbar issue was found during the first pass: `Заняття PDF` became partially hidden as the action row compressed. The responsive action layout was corrected and the final screenshot now shows the PDF action as a clean icon-only control at 1440 px, with its accessible name retained. Tablet and phone layouts remained stable after the fix.

The run uploads a `teacherboard-visual-qa` artifact containing PNG screenshots and JSON layout metrics for 14 days.

## Merge readiness

This branch is now a v1 merge candidate for review.

Non-blocking follow-up work after v1 may include:

- renaming the remaining `objects-runtime-v2.js` / `objects-v2.css` filenames to v1 naming in a mechanical cleanup;
- replacing transitional direct synchronous `localStorage` reads/writes with store methods;
- further internal deduplication inside `base-v1.css` now that the cascade has been consolidated and behavior is protected by regression tests.

Do not merge directly into `main` without reviewing the PR diff and checks.
