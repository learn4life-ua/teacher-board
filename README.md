# TeacherBoard

TeacherBoard — браузерна інтерактивна дошка для викладачів і репетиторів із математичними інструментами, сторінками, малюванням, графіками та геометричними побудовами.

## Поточна версія

Чинна GitHub Pages-версія поки працює з legacy `index.html`. Її не змінено під час перебудови.

## TeacherBoard Next

Нова модульна версія розробляється в гілці `agent/reorganize-teacher-board` і відкривається через `preview.html`.

Основні можливості Next:
- ручка, маркер і гумка;
- фігури як окремі SVG-об'єкти;
- вибір, переміщення, resize, rotate та delete;
- текст і математичні символи;
- вставка зображень із файлу та буфера;
- координатні осі, числова пряма, стрілка, таблиця x/y та шторка;
- графіки функцій із видимою шкалою та межами x/y;
- інтерактивні лінійка, транспортир і циркуль;
- тимчасова лазерна указка;
- сторінки, дублювання, перейменування та очищення;
- undo/redo та autosave;
- mobile/tablet drawer, адаптований до Android `visualViewport` і екранної клавіатури;
- повний PNG-експорт сцени 1600×900;
- міграція старих `teacherboard.v1` збережень у v2.

## Перевірки

Репозиторій має два CI-контури:

1. `Validate TeacherBoard Next` — синтаксис JavaScript, import-шляхи, модулі та DOM-контракт.
2. `Browser Smoke TeacherBoard Next` — реальний Chromium у трьох сценаріях: desktop, touch-tablet та Android/Pixel.

Browser smoke уже підтвердив:
- закрите меню фігур на старті;
- створення object-layer фігури;
- текст і графік;
- mobile drawer;
- лінійку;
- сторінки та дублювання;
- реальне завантаження PNG;
- проходження desktop, tablet та Android сценаріїв без page/console errors.

Перед заміною `index.html` залишається короткий ручний touch-тест на фізичному Android/планшеті. Детальна матриця — `docs/TESTING.md`.

## Структура Next

- `src/core/` — state, storage, history, viewport, PNG export;
- `src/drawing/` — freehand drawing;
- `src/objects/` — shapes, text, images, object manager;
- `src/math/` — graphing;
- `src/instruments/` — ruler, protractor, compass;
- `src/tools/` — laser;
- `src/ui/` — responsive/mobile UI;
- `css/next.css` — стилі нової версії;
- `preview.html` — тестовий entry point;
- `tests/` — static та browser smoke checks.

`main` і чинна GitHub Pages-версія залишаються без змін до завершення передрелізної перевірки.
