# TeacherBoard v1 Refactor Status

## Current milestone: behavior stabilized, broad browser regression passing

Branch: `refactor-v1`

`main` has not been modified.

## Architecture now in use

- `js/state.js` owns document/page normalization and the canonical schema.
- `js/storage.js` owns IndexedDB persistence and legacy cache fallback.
- `js/store-v1.js` bridges canonical IndexedDB state with the transitional synchronous runtime cache.
- IndexedDB stores canonical `raster.image` and `items`.
- The transitional `localStorage` cache exposes `image` and `objects` to active runtime modules without duplicating canonical fields.
- `js/history.js` provides bounded chronological history shared by raster and editable-object actions.
- `js/core-runtime-v1.js` owns raster drawing, backgrounds, page rendering/switching, zoom, fullscreen and laser.
- `js/objects-runtime-v2.js` owns editable text, images, curtain and geometry/math objects.
- `js/objects.js` is the integrated SVG geometry/math renderer.
- `js/pages-v1.js` owns page context actions and page-height extension.
- `js/lifecycle-v1.js` owns clear, add-page and top-level duplicate actions.
- `js/export-v1.js` composes background, raster and editable objects for PNG/PDF.
- `js/mobile.js` owns the purpose-built mobile controls and overflow menu.
- `js/accessibility-v1.js` owns accessible names, pressed/expanded state and keyboard menu behavior.

The obsolete `app.js`, `v2.js`, `v3.js`, `fixes-v5.js`, `fixes-v6.js`, `fixes-v7.js`, `compat.js` and old `objects-runtime.js` are no longer part of the branch. Their history remains available through Git.

## Stabilization fixes completed

The refactor has fixed several production defects found through real Chromium regression testing:

- existing editable objects no longer block drawing/shape creation outside Select mode;
- selection survives write-through storage updates during object manipulation;
- invalid pointer capture on rerendered object nodes was removed;
- IndexedDB hydration cannot be overwritten by a blank document during boot;
- unload autosave cannot synthesize a replacement document when the cache is intentionally absent;
- runtime cache no longer contains competing `items` and `objects` sources of truth;
- legacy text, image, curtain and shape types normalize correctly;
- text double-click editing no longer loses the browser `dblclick` event through premature DOM replacement;
- mobile shape choices meet a 44 px touch-target height;
- mobile overflow has menu semantics and keyboard navigation;
- the mobile color/thickness panel opens correctly on the first activation and its main controls use 44 px targets;
- browser page zoom is not blocked by `maximum-scale=1`.

## Automated browser verification

Run `#152` on commit `c82a983445c1595538fdb467d3fba22d2edd90c9` passed after the obsolete runtime cleanup.

The GitHub Actions workflow currently runs nine Chromium suites:

1. `tests/browser-smoke.mjs`
2. `tests/page-persistence.mjs`
3. `tests/content-regression.mjs`
4. `tests/export-regression.mjs`
5. `tests/raster-regression.mjs`
6. `tests/math-regression.mjs`
7. `tests/accessibility-regression.mjs`
8. `tests/page-lifecycle-regression.mjs`
9. `tests/storage-fallback-regression.mjs`

### Verified behavior

#### Drawing and history

- [x] Pen draws and persists.
- [x] Marker draws and persists.
- [x] Eraser removes raster strokes.
- [x] Raster arrow draws and persists.
- [x] Raster undo/redo restores the expected canvas state.
- [x] Raster and object actions remain chronological when interleaved.

#### Editable objects

- [x] Rectangle creation works through the UI.
- [x] Object Select mode works.
- [x] Object move works.
- [x] Object resize works.
- [x] Object deletion works.
- [x] Undo/redo covers object creation and manipulation scenarios exercised by the suite.
- [x] Geometry renderers produce complete SVG for line, rectangle, ellipse, triangle, right triangle, parallelogram, trapezoid, rhombus, angle and arc.
- [x] Number line -5…5 has one positive-direction arrowhead.
- [x] Number line -10…10 uses readable even-number labels.
- [x] Coordinate axes contain the intended positive x/y arrowheads.
- [x] x/y table renderer is verified.
- [x] Axes, number-line and x/y-table presets insert as editable objects through the active unified Shapes menu.

#### Text, curtain and images

- [x] New text is created as an editable object.
- [x] Text double-click editing works.
- [x] Legacy `page.texts` migrates to editable text without duplication.
- [x] Curtain creation is verified as editable object content.
- [x] Local image insertion is verified as editable object content.
- [x] Editable content survives the persistence scenarios covered by the suite.

#### Pages

- [x] Switching pages restores the correct state.
- [x] Duplicating a page duplicates its content and height.
- [x] Adding a page starts clean without a full application reload.
- [x] Renaming preserves page objects.
- [x] Deleting a middle page does not shift unrelated objects onto another page.
- [x] The final remaining page is protected from deletion.
- [x] Extended page height updates the page, height cache and canvas without changing existing object coordinates.

#### Clear and export

- [x] Clear removes raster and editable objects from the active page.
- [x] PNG composition includes background, raster, text, image, shape and curtain content.
- [x] PNG uses the full extended page height.
- [x] Multi-page PDF composition is verified with controlled `jsPDF` integration.
- [x] PDF preserves individual page heights in the tested scenario.

#### Persistence

- [x] New state reaches IndexedDB.
- [x] Two-page recovery from IndexedDB works after deleting the local cache.
- [x] Raster and editable text recover from IndexedDB.
- [x] Legacy localStorage text migration persists into the canonical IndexedDB schema.
- [x] Application behavior remains usable when IndexedDB is unavailable and the local cache is the fallback source.
- [x] Raster writes continue locally in fallback mode without losing editable text.

#### Responsive and accessibility

- [x] Desktop, tablet and phone startup/toolbar availability are covered.
- [x] Mobile Shapes menu fits the tested phone viewport.
- [x] Mobile shape choices meet 44 px touch height.
- [x] Mobile overflow trigger meets 44×44 px.
- [x] Mobile overflow exposes menu/menuitem semantics.
- [x] Mobile overflow supports Arrow Up/Down, Home, End and Escape.
- [x] Shapes menu exposes expanded state and menuitem semantics.
- [x] Shapes menu supports arrow-key navigation, Home, End and Escape with focus return.
- [x] Keyboard `Tab` produces a visible `:focus-visible` outline in Chromium.
- [x] Core icon buttons receive accessible names.
- [x] Browser page zoom remains available.

## Still transitional

The behavioral P0/P1 foundation is now substantially covered, but the branch is not ready to merge solely on that basis.

Remaining cleanup and product-quality work:

- active runtime modules still perform some direct synchronous `localStorage` reads/writes; `store-v1.js` currently provides write-through durability;
- CSS still has historical layering across `style.css`, `compact.css`, `v2.css`, `v3.css`, `objects-v2.css`, `mobile.css` and `accessibility-v1.css`;
- UI controls still contain mixed Unicode/text glyphs instead of one SVG icon system;
- clipboard-image insertion is implemented but does not yet have a dedicated browser regression;
- each individual geometry shape has renderer coverage, but not every shape has a separate pointer-creation scenario;
- curtain/image-specific move and resize behavior should receive explicit regression coverage even though the shared object manipulation path is already tested;
- reduced-motion CSS is present but still needs a dedicated browser assertion;
- a final desktop/tablet/mobile visual QA pass is still required after CSS/icon cleanup.

## Next phase

1. Replace UI glyphs with one consistent SVG icon system while leaving mathematical symbols as educational content.
2. Consolidate historical CSS layers without changing verified behavior.
3. Add the small remaining targeted regressions (clipboard image, curtain/image manipulation, reduced motion).
4. Perform final visual QA at desktop, tablet and phone widths.
5. Re-run the complete browser matrix after each structural cleanup.
6. Open or merge a PR only after final verification; do not write directly to `main` during this refactor.
