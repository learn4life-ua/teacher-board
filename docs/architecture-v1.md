# TeacherBoard v1 Architecture

## 1. Проблема поточного стану

Поточна версія накопичила кілька шарів реалізації:

- `app.js` — базове canvas-ядро;
- `v2.js` — додаткові функції;
- `v3.js` — окрема object model;
- `fixes-v5.js`, `fixes-v6.js`, `fixes-v7.js` — runtime-патчі;
- кілька CSS-файлів, які перевизначають один одного.

Мета рефакторингу — зберегти функціональність, але прибрати версійні нашарування.

## 2. Єдина модель сторінки

Рекомендована логічна структура:

```js
{
  id,
  name,
  background,
  height,
  raster,
  objects
}
```

де:

- `background` — `clean | grid | lines | coords`;
- `height` — висота сторінки;
- `raster` — шар ручки/маркера/гумки;
- `objects` — масив редагованих елементів.

## 3. Object model

Базова структура object:

```js
{
  id,
  type,
  x,
  y,
  width,
  height,
  rotation,
  style,
  data
}
```

Типи v1:

```text
text
image
shape
curtain
math-preset
```

Для `shape` у `data.shape`:

```text
line
arrow
rect
ellipse
triangle
rightTriangle
parallelogram
trapezoid
rhombus
angle
arc
```

Для `math-preset`:

```text
numberLine
axes
xyTable
```

## 4. Layers

Порядок шарів дошки:

```text
background
↓
raster canvas
↓
object layer
↓
selection/handles
↓
temporary tools (laser, preview)
```

Текст більше не повинен жити в окремій третій несумісній моделі. Він є object.

## 5. State

Один app state повинен бути джерелом істини:

```js
{
  pages,
  activePageId,
  tool,
  color,
  lineWidth,
  zoom,
  selection,
  history
}
```

Не читати `localStorage` безпосередньо з різних модулів під час кожної UI-дії.

Storage — persistence layer, а не state manager.

## 6. History

Undo/redo працює зі snapshot або командами єдиного page state.

Мінімальна вимога для v1: history повинна бачити одночасно raster + objects + background.

## 7. Storage

Рекомендовано:

- IndexedDB для даних заняття й зображень;
- metadata у структурованому вигляді;
- raster як Blob/WebP/PNG залежно від практичного тесту;
- migration reader для старого `teacherboard.v1`.

Не використовувати base64 PNG кожної сторінки як основний довгостроковий формат у localStorage.

## 8. Runtime modules

Цільова структура без framework:

```text
js/
  app.js
  state.js
  storage.js
  history.js
  canvas.js
  objects.js
  pages.js
  math-tools.js
  export.js
  ui.js
```

Модулі можна об'єднати, якщо дроблення не дає користі. Головне — відповідальності, а не кількість файлів.

## 9. CSS

Ціль:

```text
css/
  tokens.css
  app.css
  responsive.css
```

Прибрати `v2.css`, `v3.css` та каскад патчів після перенесення актуальних правил.

## 10. Icons

Фінальний UI використовує один SVG icon set.

Математичні символи залишаються текстовими символами, оскільки вони є змістом, а не системними UI-іконками.

## 11. Migration strategy

Рефакторинг виконувати інкрементально:

1. зафіксувати поведінку поточної версії;
2. створити новий state layer;
3. перенести objects;
4. перенести text/images/curtain до object model;
5. уніфікувати history;
6. уніфікувати storage;
7. консолідувати CSS;
8. прибрати старі runtime-файли тільки після перевірки parity.

Не видаляти стару реалізацію до того, як відповідна функція працює у новій.
