# TeacherBoard v1 Refactor Status

## Current milestone: P0 stabilized, browser smoke passing

Branch: `refactor-v1`

### Completed

- v1 product specification documented.
- Target architecture documented.
- Central document/page normalization in `js/state.js`.
- IndexedDB storage adapter in `js/storage.js`.
- Canonical write-through store in `js/store-v1.js`.
- On first run, legacy `localStorage` data is normalized and persisted into IndexedDB.
- IndexedDB is the durable source; `localStorage` remains a synchronous cache and migration fallback for transitional module reads.
- `js/compat.js` has been removed.
- Shared bounded chronological history now lives in `js/history.js`.
- `js/history-runtime-v1.js` records raster/background checkpoints and owns Undo/Redo controls and shortcuts.
- Raster and editable-object changes use the same shared history stack.
- History restore updates storage, editable objects and the raster canvas.
- Central SVG shape renderer lives in `js/objects.js`.
- Object renderer compatibility contract is explicit through `renderShapeSvg`.
- `index.html` no longer loads `js/app.js`, `js/v2.js`, `js/v3.js` or any `fixes-v*` runtime.
- Obsolete `js/objects-runtime.js` has been removed; the active object runtime is `js/objects-runtime-v2.js`.
- `js/core-runtime-v1.js` owns raster pen/marker/eraser, raster arrow, page rendering/switching, background, zoom, fullscreen, laser and raster persistence.
- `js/ui-v1.js` owns pen controls, fit-to-screen, presentation controls and pagebar collapse.
- `js/pages-v1.js` owns rename, delete, duplicate context actions and page-height extension.
- Page CRUD no longer reloads the whole application.
- Page-tab enhancement is idempotent; the previous MutationObserver feedback loop is removed.
- `js/interaction-bridge-v1.js` owns the insert button, math-symbol dialog entry and math preset buttons.
- Unified object runtime lives in `js/objects-runtime-v2.js`.
- Shapes, images, text and curtain use the editable object layer.
- Existing objects no longer intercept pointer events outside Select mode, so drawing and shape creation can pass over them.
- Legacy `page.texts` migrate into editable text objects on startup.
- Text objects can be edited by double-clicking.
- Curtain is movable and resizable instead of raster-only.
- Images inserted from file or clipboard are editable objects.
- Geometry and math presets use one renderer.
- Object movement, resize and deletion are centralized.
- `js/lifecycle-v1.js` owns safe clear, add-page and top-level duplicate-page actions.
- Clear removes raster, legacy text and editable objects from the active page.
- Adding a page starts with clean object state and matching default page height.
- Duplicating a page clones editable objects and page height.
- `js/export-v1.js` composes background, raster and editable objects for PNG/PDF.
- `js/accessibility-v1.js` adds accessible labels and pressed states.
- `css/accessibility-v1.css` adds visible focus indicators, reduced-motion support and larger touch hit areas.
- Browser zoom is no longer disabled by `maximum-scale=1`.
- GitHub Actions browser smoke workflow runs on `refactor-v1` and cancels stale runs.

### Browser smoke verification

Run `#120` (`a9444fe5155dcbbc5dd3280b73388719cbcbdbb5`) passed in Chromium after the interaction fixes.

The automated smoke scenario currently verifies:

- desktop application startup;
- usable canvas dimensions;
- raster drawing and persistence;
- editable text creation;
- shape creation over an existing text object;
- object undo and redo;
- live add-page behavior without reload;
- durable document presence in IndexedDB;
- tablet board/toolbar availability;
- mobile board/toolbar availability;
- absence of browser page errors in tested responsive scenarios.

### Still transitional, but outside P0 behavior

- Active modules still use synchronous `localStorage` reads/writes internally. `store-v1.js` turns those writes into IndexedDB write-through persistence. A later cleanup can replace direct calls with `TeacherBoardStore` methods.
- CSS is still layered as `style.css`, `compact.css`, `v2.css`, `v3.css`, `objects-v2.css`, `mobile.css`, `accessibility-v1.css`.
- UI icons are still mixed text symbols rather than one SVG icon system.
- Some old inactive JS files remain in the repository as reference; they are not loaded by `index.html`.

## Verification matrix before merge

Automated smoke coverage is marked `[x]`. Items that still require broader automated or manual verification remain `[ ]`.

### Drawing

- [x] Pen draws and persists.
- [ ] Marker draws and persists.
- [ ] Eraser removes raster strokes.
- [ ] Raster arrow draws and persists.
- [ ] Undo after raster drawing restores the previous raster state.
- [ ] Redo reapplies the raster change.
- [ ] Undo/redo order remains chronological when raster and object changes are interleaved.

### Editable objects

- [x] Rectangle can be created.
- [ ] Circle can be created.
- [ ] Triangle can be created.
- [ ] Other geometry shapes render correctly.
- [ ] Number line −5…5 has one positive-direction arrow.
- [ ] Number line −10…10 remains readable on mobile.
- [ ] Coordinate axes render correct arrowheads.
- [x] Object can enter Select mode after creation.
- [ ] Object can be moved.
- [ ] Object can be resized.
- [ ] Object can be deleted with handle.
- [x] Undo/redo works for object creation.
- [ ] Undo/redo works for move, resize, edit and delete.

### Text

- [ ] Existing legacy text migrates once without duplication.
- [x] New text is created as an editable object.
- [ ] Double-click edits text.
- [ ] Text can be moved and resized.
- [ ] Text persists after raster drawing and reload.

### Curtain

- [ ] Curtain is created as an object.
- [ ] Curtain can be moved.
- [ ] Curtain can be resized.
- [ ] Curtain survives reload.

### Images

- [ ] File picker inserts image as editable object.
- [ ] Clipboard image inserts as editable object.
- [ ] Image can be moved and resized.
- [ ] Image survives drawing a raster stroke afterward.

### Pages

- [ ] Switching pages shows the correct raster and editable objects.
- [ ] Duplicating a page duplicates its raster, objects and height.
- [x] Adding a page starts clean and updates without full-page reload.
- [ ] Deleting a page does not shift wrong objects onto another page.
- [ ] Renaming a page does not lose objects.
- [ ] Extended page height keeps raster/object coordinates correct.

### Clear / export

- [ ] Clear removes raster and all editable objects.
- [ ] PNG contains background, raster, text, images, shapes and curtain.
- [ ] PDF contains all pages and editable objects.
- [ ] Extended pages export at their full height.

### Persistence

- [ ] Reload preserves pages and objects.
- [ ] Legacy localStorage data migrates without loss.
- [ ] Migrated legacy state is persisted into IndexedDB.
- [x] New document state reaches IndexedDB.
- [ ] App still works when IndexedDB is unavailable, using cache fallback.

### Responsive / accessibility

- [x] Desktop toolbar remains usable in smoke scenario.
- [x] Tablet toolbar remains usable in smoke scenario.
- [x] Phone toolbar remains usable in smoke scenario.
- [ ] Phone overflow menu actions are fully verified.
- [ ] Shape menu fits all target viewports.
- [ ] Resize/delete handles are usable by touch.
- [ ] Focus indicators are visually verified.
- [x] Core icon buttons receive accessible names.
- [ ] Keyboard navigation is fully verified.
- [x] Browser page zoom is allowed.
- [ ] Reduced-motion preference is visually verified.

## Next phase

1. Expand browser tests from smoke coverage to the remaining v1 verification matrix.
2. Fix regressions discovered by those tests.
3. Consolidate CSS layers.
4. Replace text-symbol UI icons with one SVG icon system.
5. Perform final desktop/tablet/mobile visual review.
6. Open a merge PR only after verification is broad enough for v1.
