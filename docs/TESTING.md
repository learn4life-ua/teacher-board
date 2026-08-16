# TeacherBoard Next — передрелізна перевірка

Цей чек-лист використовується перед заміною legacy `index.html` новою модульною версією.

## Контури перевірки

### Ручний Validate

`Validate TeacherBoard Next` **не запускається автоматично** після комітів. Workflow має тільки `workflow_dispatch`, щоб проміжні зміни не створювали GitHub Actions-листи. Перед релізом його запускаємо один раз вручну.

Validate перевіряє:
- синтаксис JavaScript, import-шляхи, критичні модулі та DOM-контракт `preview.html`;
- safe mathematical parser без `Function/eval`, natural notation та performance-ліміти графіка;
- graph/text SVG/HTML safety;
- прозору гумку й marker opacity;
- zoom 50–200% із кроком 25%, client→scene/drag delta та один простір 1600×900;
- resize повернутих object/instrument елементів у локальних осях;
- aspect ratio image object, коло 1:1 та resize line/arrow тільки по довжині;
- bounds-check для надмірних координат/розмірів у storage і runtime resize;
- геометрію транспортира/циркуля після rotation;
- clear → undo → redo, ізоляцію history між сторінками та ліміт 50 snapshot;
- відсутність порожніх Undo-кроків при no-op tap/select/background/update;
- multi-touch pointerId-контракт для drawing, shapes, objects та geometry tools;
- shape gesture threshold 8 px і directed line/arrow creation;
- text/graph editing через properties panel;
- page rename/destructive actions через власні dialogs та non-blocking notices;
- memory-safe обробку великих зображень через Blob URL;
- safe raster image policy PNG/JPEG/WebP/GIF/AVIF і transactional image rollback;
- content/structural caps до важкої нормалізації та runtime capacity guards;
- відновлення пошкодженого `teacherboard.v2` до безпечного runtime state;
- `saveState()` при QuotaExceededError та dedupe повторного незміненого autosave;
- legacy `number5`, `number10`, `numberBlank` → `numberLine`;
- PNG composition contract;
- keyboard focus safety;
- laser exclusivity;
- `100dvh` для видимої висоти mobile shell/pagebar;
- правило, що в режимах малювання objects/instruments не перехоплюють pointer events.

### Ручний Browser Smoke

`Browser Smoke TeacherBoard Next` також має тільки ручний запуск. Попередні успішні Chromium-прогони вже підтвердили migration/rollback, desktop/tablet/Android viewport, shape objects, curtain, text, graph scale, responsive drawer, geometry builds, autosave, pages, transparent eraser та реальне PNG download.

Після останніх touch/shape/bounds/content/image змін потрібен **один фінальний ручний прогін** обох workflow перед merge. Browser Smoke уже синхронізований із custom dialogs, 25% zoom, startup `Вибір`, directed line/circle/shape threshold і graph update з custom ranges/step 0.5.

## 1. Запуск і збереження

- [ ] `preview.html` відкривається без помилок у консолі на фізичному пристрої.
- [ ] Після reload зберігаються сторінки, фон, об'єкти, штрихи та інструменти.
- [x] Storage нормалізує нестандартний zoom при loadState.
- [x] Пошкоджений v2-state санітизується.
- [x] Надмірні object/instrument coordinates та dimensions обмежуються safe bounds.
- [x] QuotaExceededError не кидається назовні із `saveState()`.
- [x] Повторний незмінений state не створює другого `localStorage.setItem()`.
- [x] Великі image files використовують Blob URL path і max source dimension 1600 px.
- [x] Image insertion rollback відновлює object state та Undo/Redo history.
- [x] Нові image object приймають тільки PNG/JPEG/WebP/GIF/AVIF; SVG/remote sources відхиляються.
- [ ] Фізично вставити велике фото з телефона й reload сторінку.
- [ ] Перемикання сторінок не змішує їхній вміст.
- [x] Повторний tap по вже активній сторінці не скидає Undo history.
- [x] Mobile shell використовує `100dvh`, щоб pagebar залишалась у видимій області Android viewport.
- [ ] Повторно перевірити Android pagebar після останніх змін.

## 2. Малювання

- [x] Pointer→scene math покриває всі zoom presets.
- [x] Marker використовує `globalAlpha = 0.24`.
- [x] Eraser використовує `destination-out`.
- [x] Freehand зберігає один active `pointerId`; другий палець не перехоплює stroke.
- [x] Freehand відсікає майже однакові точки ближче 0,5 logical px і має runtime caps.
- [x] Objects та geometry tools не перехоплюють pointer events, коли активна ручка/маркер/гумка/shape tool.
- [ ] Фізично перевірити ручку на 75%, 100%, 125%, 150%.
- [ ] Намалювати поверх існуючої фігури та біля видимої лінійки.
- [ ] На grid/coords перевірити, що гумка відкриває фон, а не залишає білу смугу.
- [ ] Двома пальцями переконатися, що другий pointer не завершує stroke першого.
- [ ] Undo/redo після кількох реальних штрихів.

## 3. Фігури та object layer

- [x] Фігури — окремі scene objects, а не raster drawing.
- [x] Меню фігур закрите на старті; стартовий інструмент — «Вибір».
- [x] Shape gesture має мінімальний поріг 8 logical px.
- [x] Shape gesture зберігає pointerId і type від pointerdown до pointerup.
- [x] «Лінія» створює реальний directed segment від start до end.
- [x] «Стрілка» зберігає довжину й напрямок gesture.
- [x] Preview line/arrow показує напрямлений відрізок; arrow preview має вістря.
- [x] «Коло» й «Еліпс» — окремі інструменти.
- [x] Коло створюється й resize-иться тільки 1:1; persisted circle також нормалізується до square bounds.
- [x] `circleArc` циркуля також зберігає square bounds після resize/reload.
- [x] Line/arrow resize змінює довжину по локальній осі й не розтягує висоту.
- [x] Image resize зберігає aspect ratio після rotation.
- [x] Object manipulation зберігає один active pointerId.
- [x] Простий tap/select без руху не створює Undo snapshot.
- [x] Повторний updateSelected без фактичної зміни не створює Undo snapshot.
- [x] Шторка є окремим редагованим object.
- [x] Legacy number lines мігрують у новий `numberLine`.
- [ ] Фізично перевірити circle/ellipse, line/arrow, triangle/rect та curtain.
- [ ] Фізично перевірити move/resize/rotate/delete пальцем.
- [ ] Перевірити, що короткий випадковий tap у shape mode нічого не створює.
- [ ] Другий палець не завершує/не змінює активний shape/object gesture.
- [ ] Стрілка, axes, numberLine і x/y table виглядають правильно після resize.

## 4. Текст, зображення та математичні символи

- [x] Text/graph мають touch-friendly кнопку ✎ і panel editing.
- [x] Text markup escape-ить HTML та санітизує inline color.
- [x] Text object обмежений 20 000 символів, graph expression — 300 символів на UI/object/parser/storage рівнях.
- [x] Математичні символи вставляються через `setRangeText` у позицію курсора.
- [x] Global Ctrl/Cmd+Z/Delete/Backspace не перехоплюються під час введення у form fields.
- [x] Clipboard підтримує `files` і `items/getAsFile()`.
- [ ] Вставити image з file picker на фізичному пристрої.
- [ ] Вставити screenshot через paste.
- [ ] Спробувати SVG і переконатися, що з'являється зрозуміле повідомлення без вставки.
- [ ] Resize/rotate image і reload без втрати пропорцій.
- [ ] Перевірити символи √ π ± ≤ ≥ ∠ ° ² ³ ∑ ∫ у середині тексту.

## 5. Графіки

- [x] Parser підтримує `x^2`, `-x^2`, `2^-2`, `2x-3`, `3(x+1)`, `πx`, `sin`, `sqrt`, `abs`, decimal comma, `×`, `÷`.
- [x] Parser не використовує `new Function` або `eval`.
- [x] Сторонні JS identifiers відхиляються.
- [x] Graph SVG escape-ить title/ARIA та санітизує curve color.
- [x] Grid/sample performance guards обмежують DOM-навантаження.
- [x] Числові labels і назви x/y присутні.
- [x] Browser Smoke підготовлений до перевірки `2x-3`, ranges −5…5/−8…8 і step 0.5.
- [ ] UI ranges x/y змінюють масштаб графіка у фінальному ручному прогоні.
- [ ] Крок 0.5, 1, 2 візуально коректний.
- [ ] ✎ відкриває поточну expression/ranges і Update працює.
- [ ] Graph move/resize/rotate працює пальцем.

## 6. Геометричні інструменти

- [x] Ruler/protractor/compass працюють у локальних координатах після rotation.
- [x] Protractor angle handle працює в діапазоні 0–180°.
- [x] Compass radius змінюється по локальній осі.
- [x] Visual needle→pencil distance прив'язана до radius.
- [x] Compass circle використовує окремий `circle` object.
- [x] Побудована arc успадковує rotation compass.
- [x] Geometry gesture зберігає active pointerId.
- [x] Повторний click на вже активний compass mode не створює Undo snapshot.
- [x] Geometry tools не можна повністю втягнути за межі сцени: щонайменше 40 px лишаються доступними.
- [x] Runtime resize обмежений до 1600×900; ruler height — до 240 px.
- [ ] Ruler move/rotate/resize пальцем; «Провести» збігається з робочим краєм.
- [ ] Protractor move/rotate та angle handle фізично.
- [ ] Compass move/rotate/radius; circle/arc збігаються з needle/pencil.
- [ ] Другий палець не перехоплює активний geometry gesture.

## 7. Laser

- [x] Laser — temporary overlay і не записує object/stroke.
- [x] Laser не використовує pointer capture.
- [x] Вибір ручки, shape, text, image або geometry tool автоматично вимикає laser.
- [x] Toolbar visual active-state синхронізований з internal laser state.
- [ ] Фізично перевірити pointer movement і завершення жесту поза дошкою.
- [ ] Перемкнути Laser → Pen і Laser → Ruler: новий tool має одразу працювати.

## 8. Zoom і координати

- [x] Scene, canvas, objects та instruments використовують один logical space 1600×900.
- [x] Presets: 50%, 75%, 100%, 125%, 150%, 175%, 200%.
- [x] client→scene та drag delta перевіряються на presets.
- [x] Rotated resize працює в local axes.
- [x] Координатний фон має minor/major grid і central axes; PNG відтворює ті самі осі.
- [ ] Візуально перевірити, що background/canvas/objects/instruments не роз'їжджаються.
- [ ] Перетягування на 75%, 100%, 125%, 150%.
- [ ] Graph/axes labels залишаються читабельними після resize.

## 9. PNG

- [x] Export contract: 1600×900, background → drawing → objects → instruments.
- [x] Exporter не збирає service handles/buttons.
- [x] Координатний background у PNG містить central axes x=800/y=450.
- [x] Попередній Browser Smoke підтвердив real Chromium download.
- [ ] Складна сторінка: grid/coords + handwriting + shapes + text + image + graph + geometry tools.
- [ ] PNG містить усі потрібні шари.
- [ ] PNG не містить selection outline, resize/rotate/edit/delete controls.
- [ ] Візуально звірити rotation text/image/graph/instruments і переноси довгого тексту.

## 10. Legacy migration

- [x] Попередній Chromium smoke підтвердив `teacherboard.v1` → v2.
- [x] Старий raster canvas → locked lower image 1600×900.
- [x] Legacy texts → text objects із координатами/кольором.
- [x] Migration не дублюється після reload.
- [x] Transactional rollback відновлює v1 при невдалому записі v2.
- [x] Великий safe legacy raster не відкидається image cap до спроби migration; при quota лишається v1.
- [x] Legacy number line aliases підтримуються у v1 та старому v2.
- [ ] Перевірити одну реальну велику стару дошку перед merge.

## 11. Фізичний touch-тест перед merge

### Desktop
- [ ] Pen → eraser → line/arrow → circle/ellipse → graph → ruler/protractor/compass → image → laser → PNG.

### Tablet
- [ ] Object/instrument drag + local resize + rotate.
- [ ] Multi-touch: другий палець не ламає активний gesture.
- [ ] Drawer + keyboard.
- [ ] Pagebar.
- [ ] Laser → інший tool.

### Android phone
- [ ] Drawer + visualViewport + keyboard.
- [ ] Pagebar: add → duplicate → rename → delete; перевірити `100dvh` при видимих browser bars.
- [ ] Pen/eraser поверх object layer.
- [ ] Shape threshold і line/arrow direction.
- [ ] Multi-touch pointerId protection.
- [ ] Laser.

## 12. Перед merge

- [ ] Один ручний запуск `Validate TeacherBoard Next` на фінальному head.
- [ ] Один ручний запуск `Browser Smoke TeacherBoard Next` на фінальному head.
- [x] `preview.html` не підключає legacy `v2.js`, `v3.js` або `fixes-*`.
- [ ] Пройти короткий physical desktop/tablet/Android test.
- [ ] Перевірити одну real legacy board після migration.
- [ ] Перевірити complex PNG.
- [ ] Лише після цього окремим commit замінити `index.html`.
- [ ] Legacy-файли видаляти тільки після перевірки опублікованої нової версії.
