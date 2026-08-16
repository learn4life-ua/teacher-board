# TeacherBoard `src`

Ця папка містить нову модульну реалізацію TeacherBoard. Вона розробляється окремо від legacy-коду у `js/`; кандидат для перевірки — `preview.html`.

## Структура

### Core
- `core/state.js` — єдиний runtime state дошки та сторінок;
- `core/storage.js` — `teacherboard.v2`, sanitization, v1 migration і transactional rollback;
- `core/history.js` — page-level undo/redo з лімітом snapshot та memory budget;
- `core/scene.js` — logical scene 1600×900 і спільний zoom/coordinate transform;
- `core/content-limits.js` — спільні text/graph/collection capacity limits;
- `core/image-format.js` — єдина raster image policy для runtime і storage;
- `core/export-png.js` / `core/export-bind.js` — PNG 1600×900.

### Drawing / objects / math
- `drawing/freehand.js` — pen, marker, transparent eraser, pointerId protection і stroke caps;
- `objects/shapes.js` — SVG shapes, axes, number line, x/y table, curtain;
- `objects/object-manager.js` — selection, move/resize/rotate/delete, object caps і transactional image rollback;
- `objects/text.js` — safe text markup;
- `objects/images.js` — raster file/paste insertion, large-image compression, safe DataURL policy;
- `math/graph.js` — safe expression parser, scale/labels, graph performance guards.

### Instruments / tools / UI
- `instruments/geometry-tools.js` — ruler, protractor, compass, local-axis transforms і constructions;
- `tools/laser.js` — temporary presentation overlay;
- `ui/mobile-drawer.js` — responsive properties drawer + `visualViewport`;
- `ui/dialogs.js` — non-browser confirmation dialogs;
- `ui/notices.js` — non-blocking status/error messages;
- `ui/input-limits.js` — UI enforcement for text/formula limits;
- `ui/capacity-guards.js` — runtime page/instrument/object/stroke capacity notices;
- `app.js` — orchestration та bindings між state, scene, modules і UI.

## Поточні гарантії preview

- після reload активний тільки `Вибір`, shape menu закрите;
- фігури, text, image, graph і curtain — окремі editable objects;
- line/arrow зберігають реальний напрямок gesture; circle і compass arc лишаються 1:1;
- drawing/shapes/objects/geometry використовують один active pointerId для touch;
- у non-select режимах objects/instruments не перехоплюють малювання;
- pen/marker/eraser, undo/redo, pages, backgrounds, fullscreen, symbols, laser;
- graph scale/ranges/step і parser без `eval`/`new Function`;
- ruler/protractor/compass після rotation працюють у локальних координатах;
- coordinate background має центральні осі; те саме відтворює PNG;
- image file/paste приймає тільки PNG/JPEG/WebP/GIF/AVIF, великі фото стискаються до max source dimension 1600 px;
- QuotaExceededError не ламає runtime; невдала image insertion повністю відкочується разом з Undo/Redo;
- v1 migration переносить raster/texts і повертає старий state при невдалому v2 write;
- structural/content limits відсікають аварійні або надмірні persisted/runtime дані.

## Перевірка та реліз

`Validate TeacherBoard Next` і `Browser Smoke TeacherBoard Next` навмисно мають тільки `workflow_dispatch`. Вони запускаються вручну на фінальному candidate head, щоб проміжні коміти не генерували зайві GitHub Actions-сповіщення.

Детальний передрелізний чек-лист: `docs/TESTING.md`.

`main` і чинний GitHub Pages не змінюємо до ручного Validate, Browser Smoke, фізичного touch-тесту, перевірки complex PNG та однієї реальної legacy-дошки.
