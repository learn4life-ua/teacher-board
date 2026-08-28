# TeacherBoard v1 Refactor Status

## Current milestone: legacy runtime reduction

Branch: `refactor-v1`

### Completed

- v1 product specification documented.
- Target architecture documented.
- Central document/page normalization in `js/state.js`.
- IndexedDB storage adapter in `js/storage.js`.
- Bounded history helper in `js/history.js`.
- Central SVG shape renderer in `js/objects.js`.
- Legacy autosave compatibility bridge in `js/compat.js`.
- `index.html` no longer loads `js/v2.js`, `js/v3.js` or `fixes-v5.js` / `fixes-v6.js`.
- `fixes-v7.js` is not needed by the new SVG renderer.
- `js/ui-v1.js` now owns pen controls, fit-to-screen, presentation controls and pagebar collapse.
- `js/pages-v1.js` now owns rename, delete, duplicate context actions and page-height extension.
- Unified object runtime lives in `js/objects-runtime-v2.js`.
- Shapes, images, text and curtain use the editable object layer.
- Legacy `page.texts` are migrated into editable text objects on startup.
- Text objects can be edited by double-clicking.
- Curtain is movable and resizable instead of raster-only.
- Images inserted from file or clipboard are editable objects.
- Geometry and math presets use one renderer.
- Object movement, resize and deletion are centralized.
- Object operations are connected to bounded history.
- Legacy localStorage writes are mirrored to IndexedDB.
- Dedicated object styles live in `css/objects-v2.css`.
- `js/lifecycle-v1.js` owns safe clear, add-page and top-level duplicate-page actions.
- Clear removes raster, legacy text and editable objects from the active page.
- Adding a page starts with clean object state and matching default page height.
- Duplicating a page clones editable objects and page height.
- `js/export-v1.js` composes background, raster and editable objects for PNG/PDF.
- `js/accessibility-v1.js` adds accessible labels and pressed states.
- `css/accessibility-v1.css` adds visible focus indicators, reduced-motion support and larger touch hit areas.

### Still legacy / transitional

- `app.js` remains the last large legacy runtime and still owns raster drawing, background selection, zoom, fullscreen, laser, the old in-memory page state and legacy autosave.
- `compat.js` is still required because `app.js` can otherwise overwrite editable-object data during autosave.
- IndexedDB is currently a mirror while legacy localStorage remains the live source for `app.js`.
- CSS is still layered as `style.css`, `compact.css`, `v2.css`, `v3.css`, `objects-v2.css`, `mobile.css`, `accessibility-v1.css`. The `v2.css` / `v3.css` names are now styling legacy only; their JS counterparts are not active.
- UI icons are still mixed text symbols rather than one SVG icon system.
- History is only partially chronological across legacy raster actions and new object actions. Full shared history requires raster drawing to move off the old `app.js` state.

## Verification status

The refactor branch contains the new runtime layers, but browser verification is still required before merging into `main`.

A local `node --check` attempt could not be completed because the execution environment could not resolve `github.com` to clone the branch. This is an environment/network limitation, not a passed syntax check.

## Verification matrix before deleting old files

### Drawing

- [ ] Pen draws and persists.
- [ ] Marker draws and persists.
- [ ] Eraser removes raster strokes.
- [ ] Undo/redo still work for raster drawing.

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

- [ ] Switching pages shows only that page's objects.
- [ ] Duplicating a page duplicates its objects.
- [ ] Adding a page starts without unrelated objects.
- [ ] Deleting a page does not shift wrong objects onto another page.
- [ ] Renaming a page does not lose objects.
- [ ] Extended page height keeps object coordinates correct.

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

1. Replace legacy `app.js` with a focused raster/background/view runtime.
2. Remove `compat.js` after the old in-memory autosave is gone.
3. Make IndexedDB the canonical storage and keep localStorage only as migration input/fallback metadata if needed.
4. Consolidate raster + object history into one chronological undo/redo model.
5. Consolidate CSS layers after behavior is stable.
6. Replace text-symbol UI icons with one SVG icon system.
7. Perform browser verification before opening a merge PR.
