# TeacherBoard v1 Refactor Status

## Current milestone: editable objects cutover

Branch: `refactor-v1`

### Completed

- v1 product specification documented.
- Target architecture documented.
- Central document/page normalization in `js/state.js`.
- IndexedDB storage adapter in `js/storage.js`.
- Bounded history helper in `js/history.js`.
- Central SVG shape renderer in `js/objects.js`.
- Legacy autosave compatibility bridge in `js/compat.js`.
- New editable object runtime in `js/objects-runtime.js`.
- `index.html` no longer loads `js/v3.js`.
- `index.html` no longer loads `fixes-v5.js` or `fixes-v6.js`.
- `fixes-v7.js` is not needed by the new renderer.
- Images inserted from file or clipboard are editable objects.
- Geometry and math presets use one renderer.
- Object movement, resize and deletion are centralized.
- PNG/PDF export includes editable objects.
- Legacy localStorage writes are mirrored to IndexedDB.

### Still legacy

- Pen, marker and eraser remain raster canvas operations in `app.js` by design.
- Text still uses the old `textLayer` implementation.
- Curtain still originates as a raster canvas tool.
- Page CRUD and page height extension still live in legacy code.
- CSS is still layered as `style.css`, `compact.css`, `v2.css`, `v3.css`, `mobile.css`.
- UI icons are still mixed text symbols rather than one SVG icon system.

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
- [ ] Object can be deleted with Delete/Backspace.

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

- [ ] Clear removes raster, text and editable objects.
- [ ] PNG contains background, raster, text and objects.
- [ ] PDF contains all pages and objects.

### Persistence

- [ ] Reload preserves pages and objects.
- [ ] Legacy localStorage data migrates without loss.
- [ ] IndexedDB mirror receives normalized document.

### Responsive

- [ ] Desktop toolbar remains usable.
- [ ] Tablet toolbar remains usable.
- [ ] Phone menu remains usable.
- [ ] Shape menu fits viewport.
- [ ] Resize/delete handles are usable by touch.

## Next implementation block

1. Move text from `textLayer` into the common object model.
2. Convert curtain to a movable/resizable object.
3. Integrate object operations into shared history.
4. Add focus-visible and keyboard accessibility.
5. Replace text-symbol UI icons with one SVG icon system.
6. Consolidate CSS layers after behavior is stable.
