# TeacherBoard v1 Refactor Status

## Current milestone: unified editable object model

Branch: `refactor-v1`

### Completed

- v1 product specification documented.
- Target architecture documented.
- Central document/page normalization in `js/state.js`.
- IndexedDB storage adapter in `js/storage.js`.
- Bounded history helper in `js/history.js`.
- Central SVG shape renderer in `js/objects.js`.
- Legacy autosave compatibility bridge in `js/compat.js`.
- `index.html` no longer loads `js/v3.js` or `fixes-v5.js` / `fixes-v6.js`.
- `fixes-v7.js` is not needed by the new SVG renderer.
- Unified runtime v2 added in `js/objects-runtime-v2.js`.
- Shapes, images, text and curtain use the editable object layer.
- Legacy `page.texts` are migrated into editable text objects on startup.
- Text objects can be edited by double-clicking.
- Curtain is movable and resizable instead of being raster-only.
- Images inserted from file or clipboard are editable objects.
- Geometry and math presets use one renderer.
- Object movement, resize and deletion are centralized.
- Object operations are connected to bounded history.
- Legacy localStorage writes are mirrored to IndexedDB.
- Dedicated object styles live in `css/objects-v2.css`.

### Still legacy / transitional

- Pen, marker and eraser remain raster canvas operations in `app.js` by design.
- Page CRUD and page height extension still live in legacy code.
- `compat.js` temporarily protects object data from old `app.js` autosave.
- IndexedDB is currently a mirror while legacy localStorage remains the live source for old code.
- CSS is still layered as `style.css`, `compact.css`, `v2.css`, `v3.css`, `objects-v2.css`, `mobile.css`.
- UI icons are still mixed text symbols rather than one SVG icon system.
- History is only partially chronological across legacy raster actions and new object actions. Full shared history requires the raster runtime to move onto the central state layer.

## Verification status

The runtime v2 is connected on the refactor branch, but browser verification is still required before merging.

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
- [ ] PNG contains background, raster, text and objects.
- [ ] PDF contains all pages and objects.

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

## Next implementation block

1. Add focus-visible and accessibility labels across the existing UI.
2. Improve touch hit areas without making handles visually oversized.
3. Consolidate clear/export handling around the object model.
4. Move page CRUD onto the central state layer.
5. Remove compatibility bridge after page/state cutover.
6. Consolidate CSS layers after behavior is stable.
7. Replace text-symbol UI icons with one SVG icon system after functional stabilization.
