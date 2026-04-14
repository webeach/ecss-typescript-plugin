<div align="center">
  <h1>@ecss/typescript-plugin</h1>
  <br>
  <img alt="@ecss/typescript-plugin" src="./assets/logo.svg" height="240">
  <br>
  <br>
  <p style="text-decoration: none">
    <a href="https://www.npmjs.com/package/@ecss/typescript-plugin">
       <img src="https://img.shields.io/npm/v/@ecss/typescript-plugin.svg?color=646fe1&labelColor=9B7AEF" alt="npm package" />
    </a>
    <a href="https://github.com/webeach/ecss-typescript-plugin/actions">
      <img src="https://img.shields.io/github/actions/workflow/status/webeach/ecss-typescript-plugin/ci.yml?color=646fe1&labelColor=9B7AEF" alt="build" />
    </a>
    <a href="https://www.npmjs.com/package/@ecss/typescript-plugin">
      <img src="https://img.shields.io/npm/dm/@ecss/typescript-plugin.svg?color=646fe1&labelColor=9B7AEF" alt="npm downloads" />
    </a>
  </p>
  <p><a href="./README.md">🇺🇸 English version</a> | <a href="./README.ru.md">🇷🇺 Русская версия</a></p>
  <p>TypeScript Language Service Plugin для ECSS — генерирует per-file типы для .ecss-импортов.</p>
  <br>
  <p>
    <a href="https://ecss.webea.ch/ru" style="font-size: 1.5em">📖 Документация</a> | <a href="https://ecss.webea.ch/ru/reference/spec.html" style="font-size: 1.5em">📋 Спецификация</a>
  </p>
</div>

---

> **Требуется TypeScript ≥ 5.0.**

## 💎 Особенности

- 🎯 **Per-file типы** — генерирует точные TypeScript-декларации для каждого `.ecss`-файла в реальном времени
- 🔄 **Авто-обновление** — пересоздаёт типы при сохранении файла, без ручных шагов
- 📦 **Dual CJS/ESM** — `require` и `import` из коробки
- ⚙️ **Конфиг** — читает `ecss.config.json` из корня проекта; поддерживает inline-опции в `tsconfig.json`
- 🧩 **Фреймворк-независим** — поддерживает React (`className`), Vue / Svelte / Solid (`class`) и оба варианта одновременно

---

## 📦 Установка

```bash
npm install @ecss/typescript-plugin
```

или

```bash
pnpm add @ecss/typescript-plugin
```

или

```bash
yarn add @ecss/typescript-plugin
```

---

## 🚀 Быстрый старт

Добавь плагин в `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@ecss/typescript-plugin"
      }
    ]
  }
}
```

После этого каждый `import styles from './component.ecss'` получит точные типы в IDE — state-функции с перегрузками, типы параметров, формы результата и `merge`.

---

## 🛠 API

### Опции плагина

Опции можно передать inline в `tsconfig.json` в записи плагина:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@ecss/typescript-plugin",
        "classAttribute": "class",
        "classTemplate": "[name]-[hash:8]"
      }
    ]
  }
}
```

| Опция            | Тип                                    | По умолчанию        | Описание                                                       |
| ---------------- | -------------------------------------- | ------------------- | -------------------------------------------------------------- |
| `classAttribute` | `'className'` \| `'class'` \| `'both'` | `'className'`       | Какие поля включить в результат state-функции                  |
| `classTemplate`  | `string`                               | `'[name]-[hash:6]'` | Шаблон имени класса; поддерживает токены `[name]` и `[hash:N]` |

Эти опции объединяются с `ecss.config.json` — явные значения имеют приоритет.

---

## 📐 Как это работает

Плагин встраивается в Language Service TypeScript:

1. **`getExternalFiles`** — регистрирует все `.ecss`-файлы в проекте заранее, чтобы tsserver создал `scriptInfo`-записи до резолва модулей
2. **`resolveModuleNameLiterals`** — резолвит `./Foo.ecss`-импорты до реальных `.ecss`-файлов на диске, помечая их расширением `.d.ts`
3. **`getScriptSnapshot`** — парсит `.ecss`-исходник через `@ecss/parser`, трансформирует AST в `.d.ts`-строку через `@ecss/transformer` и отдаёт её как содержимое скрипта
4. **`getScriptVersion`** — возвращает `mtime` файла, чтобы TypeScript пересматривал при изменениях

Результаты кешируются по mtime — неизменённые файлы отдаются мгновенно без повторного парсинга.

---

## 📐 Генерируемые типы

Для файла вроде:

```css
@state-variant Theme {
  values: light, dark;
}

@state-def Button(--theme Theme: "light", --disabled boolean: false) {
  border-radius: 6px;
}
```

Плагин генерирует:

```ts
type Theme = 'light' | 'dark';

interface ButtonResult {
  className: string;
  'data-e-a1b2c3-theme': string;
  'data-e-a1b2c3-disabled'?: '';
}

interface ButtonParams {
  theme?: Theme;
  disabled?: boolean;
}

interface EcssStyles {
  Button: {
    (theme?: Theme, disabled?: boolean): ButtonResult;
    (params: ButtonParams): ButtonResult;
  };
  merge: (
    ...results: Record<string, string | undefined>[]
  ) => Record<string, string | undefined>;
}

declare const styles: EcssStyles;
export default styles;
```

---

## 🔧 Разработка

**Сборка:**

```bash
pnpm build    # production
pnpm dev      # watch mode
```

**Проверка типов:**

```bash
pnpm typecheck
```

**Линтинг и форматирование:**

```bash
pnpm lint         # oxlint
pnpm lint:fix     # oxlint --fix
pnpm fmt          # oxfmt
pnpm fmt:check    # oxfmt --check
```

---

## 👨‍💻 Автор

Разработка и поддержка: [Руслан Мартынов](https://github.com/ruslan-mart)

Если нашёл баг или есть предложение — открывай issue или отправляй pull request.

---

## 📄 Лицензия

Распространяется под [лицензией MIT](./LICENSE).
