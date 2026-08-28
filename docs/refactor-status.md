# TeacherBoard v1 Refactor Status

## Current milestone: P0 implementation complete

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
- Raster and editable-object changes now use the same shared history stack.
- History restore updates storage, editable objects and the raster canvas.
- Central SVG shape renderer lives in `js/objects.js`.
- `index.html` no longer loads `js/app.js`, `js/v2.js`, `js/v3.js` or any `fixes-v*` runtime.
- `js/core-runtime-v1.js` owns raster pen/marker/eraser, raster arrow, page rendering/switching, background, zoom, fullscreen, laser and raster persistence.
- `js/ui-v1.js` owns pen controls, fit-to-screen, presentation controls and pagebar collapse.
- `js/pages-v1.js` owns rename, delete, duplicate context actions and page-height extension.
- `js/interaction-bridge-v1.js` owns the insert button, math-symbol dialog entry and math preset buttons.
- Unified object runtime lives in `js/objects-runtime-v2.js`.
- Shapes, images, text and curtain use the editable object layer.
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

### Still transitional, but outside P0 behavior

- Active modules still use synchronous `localStorage` reads/writes internally. `store-v1.js` turns those writes into IndexedDB write-through persistence. A later cleanup can replace direct calls with `TeacherBoardStore` methods.
- CSS is still layered as `style.css`, `compact.css`, `v2.css`, `v3.css`, `objects-v2.css`, `mobile.css`, `accessibility-v1.css`.
- UI icons are still mixed text symbols rather than one SVG icon system.
- Old JS files remain in the repository as inactive reference until parity verification is complete; they are not loaded by `index.html`.

## Verification status

P0 implementation is complete on `refactor-v1`, but browser verification is still required before merging into `main`.

A previous local `node --check` attempt could not be completed because the execution environment could not resolve `github.com` to clone the branch. This was an environment/network limitation, not a passed syntax check.

## Verification matrix before merge

### Drawing

- [ ] Pen draws and persists.
- [ ] Marker draws and persists.
- [ ] Eraser removes raster strokes.
- [ ] Raster arrow draws and persists.
- [ ] Undo after raster drawing restores the previous raster state.
- [ ] Redo reapplies the raster change.
- [ ] Undo/redo order remains chronological when raster and object changes are interleaved.

### Editable objects

- [ ] Rectangle can be created.
- [ ] Circle can be created.
- [ ] Triangle can be created.
- [ ] Other geometry shapes render correctly.
- [ ] Number line −5…5 has one positive-direction arrow.
- [ ] Number line −10…10 remains readable on mobile.
- [ ] Coordinate axes render correct arrowheads.
- [ ] Object can be selected.
- [ ] Object can be moved.
- [ ] Object can be resized.
- [ ] Object can be deleted with handle.
- [ ] Undo/redo works for create, move, resize, edit and delete.

### Text

- [ ] Existing legacy text migrates once without duplication.
- [ ] New text is created as an editable object.
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
- [ ] Adding a page starts clean.
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
- [ ] New writes reach IndexedDB through `store-v1.js`.
- [ ] App still works when IndexedDB is unavailable, using cache fallback.

### Responsive / accessibility

- [ ] Desktop toolbar remains usable.
- [ ] Tablet toolbar remains usable.
- [ ] Phone menu remains usable.
- [ ] Shape menu fits viewport.
- [ ] Resize/delete handles are usable by touch.
- [ ] Focus indicators are visible.
- [ ] Icon buttons have accessible names.
- [ ] Keyboard navigation is usable.
- [ ] Reduced-motion preference is respected.

## Next phase

1. Perform browser verification against this matrix.
2. Fix any regressions found during verification.
3. Consolidate CSS layers.
4. Replace text-symbol UI icons with one SVG icon system.
5. Open a merge PR only after verification passes.
