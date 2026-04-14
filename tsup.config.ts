import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    noExternal: ['@ecss/transformer'],
    external: ['@ecss/parser'],
    footer: {
      // tsserver loads plugins via require() and expects
      // the result to be the init function directly
      js: 'if (module.exports.default) module.exports = module.exports.default;',
    },
  },
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    sourcemap: true,
    noExternal: ['@ecss/transformer'],
    external: ['@ecss/parser'],
  },
]);
