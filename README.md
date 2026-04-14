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
  <p>TypeScript Language Service Plugin for ECSS — provides per-file types for .ecss imports.</p>
  <br>
  <p>
    <a href="https://ecss.webea.ch" style="font-size: 1.5em">📖 Documentation</a> | <a href="https://ecss.webea.ch/reference/spec.html" style="font-size: 1.5em">📋 Specification</a>
  </p>
</div>

---

> **Requires TypeScript ≥ 5.0.**

## 💎 Features

- 🎯 **Per-file types** — generates accurate TypeScript declarations for each `.ecss` file in real time
- 🔄 **Auto-refresh** — re-generates types on file save, no manual step required
- 📦 **Dual CJS/ESM** — `require` and `import` out of the box
- ⚙️ **Config** — reads `ecss.config.json` from the project root; supports inline plugin options in `tsconfig.json`
- 🧩 **Framework-agnostic** — supports React (`className`), Vue / Svelte / Solid (`class`) and both at once

---

## 📦 Installation

```bash
npm install @ecss/typescript-plugin
```

or

```bash
pnpm add @ecss/typescript-plugin
```

or

```bash
yarn add @ecss/typescript-plugin
```

---

## 🚀 Quick start

Add the plugin to `tsconfig.json`:

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

After that every `import styles from './component.ecss'` will get accurate types in the IDE — state functions with overloads, parameter types, result shapes and `merge`.

---

## 🛠 API

### Plugin options

Options can be passed inline in `tsconfig.json` under the plugin entry:

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

| Option           | Type                                   | Default             | Description                                                  |
| ---------------- | -------------------------------------- | ------------------- | ------------------------------------------------------------ |
| `classAttribute` | `'className'` \| `'class'` \| `'both'` | `'className'`       | Which field(s) to include in the state function result       |
| `classTemplate`  | `string`                               | `'[name]-[hash:6]'` | Class name template; supports `[name]` and `[hash:N]` tokens |

These options are merged with `ecss.config.json` — explicit values take precedence.

---

## 📐 How it works

The plugin hooks into TypeScript's Language Service:

1. **`getExternalFiles`** — registers all `.ecss` files in the project upfront so tsserver creates `scriptInfo` entries before module resolution
2. **`resolveModuleNameLiterals`** — resolves `./Foo.ecss` imports to the actual `.ecss` files on disk, marking them with a `.d.ts` extension
3. **`getScriptSnapshot`** — parses the `.ecss` source via `@ecss/parser`, transforms the AST to a `.d.ts` string via `@ecss/transformer`, and serves it as the script content
4. **`getScriptVersion`** — returns the file's `mtime` so TypeScript re-checks when the file changes

Results are cached by mtime — unchanged files are served instantly without re-parsing.

---

## 📐 Generated types

For a file like:

```css
@state-variant Theme {
  values: light, dark;
}

@state-def Button(--theme Theme: "light", --disabled boolean: false) {
  border-radius: 6px;
}
```

The plugin generates:

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

## 🔧 Development

**Build:**

```bash
pnpm build    # production
pnpm dev      # watch mode
```

**Type check:**

```bash
pnpm typecheck
```

**Lint and format:**

```bash
pnpm lint         # oxlint
pnpm lint:fix     # oxlint --fix
pnpm fmt          # oxfmt
pnpm fmt:check    # oxfmt --check
```

---

## 👨‍💻 Author

Developed and maintained by [Ruslan Martynov](https://github.com/ruslan-mart).

Found a bug or have a suggestion? Open an issue or submit a pull request.

---

## 📄 License

Distributed under the [MIT License](./LICENSE).
