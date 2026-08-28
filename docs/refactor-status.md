# TeacherBoard v1 Refactor Status

## Current milestone: legacy runtime cutover

Branch: `refactor-v1`

### Completed

- v1 product specification documented.
- Target architecture documented.
- Central document/page normalization in `js/state.js`.
- IndexedDB storage adapter in `js/storage.js`.
- Bounded history helper in `js/history.js`.
- Central SVG shape renderer in `js/objects.js`.
- `index.html` no longer loads `js/app.js`, `js/v2.js`, `js/v3.js` or any `fixes-v*` runtime.
- `js/core-runtime-v1.js` now owns raster pen/marker/eraser, raster arrow, page rendering/switching, background, zoom, fullscreen, laser and raster persistence.
- `js/ui-v1.js` owns pen controls, fit-to-screen, presentation controls and pagebar collapse.
- `js/pages-v1.js` owns rename, delete, duplicate context actions and page-height extension.
- `js/interaction-bridge-v1.js` owns the insert button, math-symbol dialog entry and math preset buttons.
- Unified object runtime lives in `js/objects-runtime-v2.js`.
- Shapes, images, text and curtain use the editable object layer.
- Legacy `page.texts` are migrated into editable text objects on startup.
- Text objects can be edited by double-clicking.
- Curtain is movable and resizable instead of raster-only.
- Images inserted from file or clipboard are editable objects.
- Geometry and math presets use one renderer.
- Object movement, resize and deletion are centralized.
- Object operations are connected to bounded history.
- `js/lifecycle-v1.js` owns safe clear, add-page and top-level duplicate-page actions.
- Clear removes raster, legacy text and editable objects from the active page.
- Adding a page starts with clean object state and matching default page height.
- Duplicating a page clones editable objects and page height.
- `js/export-v1.js` composes background, raster and editable objects for PNG/PDF.
- `js/accessibility-v1.js` adds accessible labels and pressed states.
- `css/accessibility-v1.css` adds visible focus indicators, reduced-motion support and larger touch hit areas.
- Legacy localStorage writes are still mirrored into IndexedDB during the transition.

### Still transitional

- `compat.js` is no longer needed to protect objects from `app.js`, because `app.js` is not active, but it is still temporarily used to mirror direct localStorage writes from transitional modules into IndexedDB.
- IndexedDB is not yet the canonical live source. The active runtime still reads/writes `teacherboard.v1` in localStorage and mirrors normalized state to IndexedDB.
- Raster and object history are still separate/partially chronological. A fully shared history requires the canonical state/storage cutover.
- CSS is still layered as `style.css`, `compact.css`, `v2.css`, `v3.css`, `objects-v2.css`, `mobile.css`, `accessibility-v1.css`. The `v2.css` / `v3.css` names are styling legacy only; their JS counterparts are not active.
- UI icons are still mixed text symbols rather than one SVG icon system.

## Verification status

The refactor branch now runs without the old `app.js`, `v2.js`, `v3.js` and `fixes-v*` JavaScript layers, but browser verification is still required before merging into `main`.

A local `node --check` attempt could not be completed because the execution environment could not resolve `github.com` to clone the branch. This is an environment/network limitation, not a passed syntax check.

## Verification matrix before merge

### Drawing

- [ ] Pen draws and persists.
- [ ] Marker draws and persists.
- [ ] Eraser removes raster strokes.
- [ ] Raster arrow draws and persists.
- [ ] Undo/redo behavior remains coherent after the runtime cutover.

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
- [ ] IndexedDB mirror receives normalized document.

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

## Next implementation block

1. Make IndexedDB the canonical storage and remove the `Storage.prototype.setItem` compatibility patch.
2. Consolidate raster + object history into one chronological undo/redo model.
3. Consolidate CSS layers after behavior is stable.
4. Replace text-symbol UI icons with one SVG icon system.
5. Perform browser verification before opening a merge PR.
