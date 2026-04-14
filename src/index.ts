import { parseEcss } from '@ecss/parser';
import { generateDts, loadConfig, mergeConfig } from '@ecss/transformer';
import type { EcssConfig, EcssStylesheet } from '@ecss/transformer';
import type ts from 'typescript/lib/tsserverlibrary';

import { statSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// ─── Constants ────────────────────────────────────────────────────────────────

const ECSS_EXT = '.ecss';

/** Fallback declaration emitted when a `.ecss` file cannot be parsed. */
const FALLBACK_DTS = [
  'declare const styles: Record<',
  '  string,',
  '  (...args: any[]) => Record<string, string | undefined>',
  '> & {',
  '  merge: (...objects: Record<string, string | undefined>[]) => Record<string, string | undefined>;',
  '};',
  'export default styles;',
  '',
].join('\n');

// ─── Types ────────────────────────────────────────────────────────────────────

/** Cached script snapshot together with the file's last-modified timestamp. */
interface CacheEntry {
  /** `mtime` of the `.ecss` file when the snapshot was generated. */
  mtimeMs: number;
  /** Pre-computed TypeScript script snapshot containing the `.d.ts` text. */
  snapshot: ts.IScriptSnapshot;
}

// ─── Plugin init ──────────────────────────────────────────────────────────────

/**
 * TypeScript Language Service Plugin entry point.
 *
 * Called by tsserver when it loads the plugin; receives the TS module and
 * must return a {@link ts.server.PluginModule} with `create` and optionally
 * `getExternalFiles`.
 */
function init(modules: { typescript: typeof ts }): ts.server.PluginModule {
  const tsModule = modules.typescript;

  /**
   * Creates a decorated Language Service that intercepts `.ecss` imports and
   * serves on-the-fly generated `.d.ts` declarations for them.
   */
  function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
    const projectRoot = info.project.getCurrentDirectory();
    const fileConfig = loadConfig(projectRoot);
    const pluginConfig: EcssConfig = info.config ?? {};
    const config = mergeConfig(fileConfig, pluginConfig);

    const cache = new Map<string, CacheEntry>();

    function isEcssFile(fileName: string): boolean {
      return fileName.endsWith(ECSS_EXT);
    }

    /**
     * Reads a `.ecss` file, parses it, generates a `.d.ts` string and wraps
     * it in a {@link ts.IScriptSnapshot}. Results are cached by mtime so that
     * unchanged files are not re-parsed on every keystroke.
     */
    function getEcssDtsSnapshot(fileName: string): ts.IScriptSnapshot {
      let mtimeMs: number;
      try {
        mtimeMs = statSync(fileName).mtimeMs;
      } catch {
        return tsModule.ScriptSnapshot.fromString(FALLBACK_DTS);
      }

      const cached = cache.get(fileName);
      if (cached && cached.mtimeMs === mtimeMs) {
        return cached.snapshot;
      }

      let dtsContent: string;
      try {
        const source = readFileSync(fileName, 'utf-8');
        const ast = parseEcss(source) as EcssStylesheet;
        dtsContent = generateDts(ast, {
          filePath: fileName,
          classTemplate: config.classTemplate,
          classAttribute: config.classAttribute,
        });
      } catch {
        dtsContent = FALLBACK_DTS;
      }

      const snapshot = tsModule.ScriptSnapshot.fromString(dtsContent);
      cache.set(fileName, { mtimeMs, snapshot });
      return snapshot;
    }

    // ── Host proxy ──────────────────────────────────────────────────────────

    const host = info.languageServiceHost;

    /**
     * A Proxy around the original `LanguageServiceHost` that overrides three
     * methods to make tsserver treat `.ecss` files as if they were `.d.ts`:
     *
     * - `getScriptVersion` — returns the file's mtime so TS re-checks on change
     * - `getScriptSnapshot` — serves the generated `.d.ts` content
     * - `resolveModuleNameLiterals` — resolves `./Foo.ecss` imports to `.ecss`
     *   files on disk, marking them as `.d.ts` extension
     */
    const hostProxy = new Proxy(host, {
      get(target, prop: string, receiver) {
        if (prop === 'getScriptVersion') {
          return (fileName: string): string => {
            if (isEcssFile(fileName)) {
              try {
                return String(statSync(fileName).mtimeMs);
              } catch {
                return '0';
              }
            }
            return target.getScriptVersion(fileName);
          };
        }

        if (prop === 'getScriptSnapshot') {
          return (fileName: string): ts.IScriptSnapshot | undefined => {
            if (isEcssFile(fileName)) {
              return getEcssDtsSnapshot(fileName);
            }
            return target.getScriptSnapshot(fileName);
          };
        }

        if (prop === 'resolveModuleNameLiterals') {
          return (
            literals: readonly ts.StringLiteralLike[],
            containingFile: string,
            redirectedReference: ts.ResolvedProjectReference | undefined,
            options: ts.CompilerOptions,
            containingSourceFile: ts.SourceFile,
            reusedNames: readonly ts.StringLiteralLike[] | undefined,
          ): readonly ts.ResolvedModuleWithFailedLookupLocations[] => {
            const originalFn = target.resolveModuleNameLiterals;
            const results = originalFn
              ? originalFn.call(
                  target,
                  literals,
                  containingFile,
                  redirectedReference,
                  options,
                  containingSourceFile,
                  reusedNames,
                )
              : literals.map(() => ({
                  resolvedModule: undefined,
                }));

            return results.map((result, idx) => {
              const moduleName = literals[idx].text;
              if (!moduleName.endsWith(ECSS_EXT)) {
                return result;
              }

              const resolvedFileName = resolve(
                dirname(containingFile),
                moduleName,
              );

              try {
                statSync(resolvedFileName);
              } catch {
                return result;
              }

              return {
                resolvedModule: {
                  resolvedFileName,
                  extension: tsModule.Extension.Dts,
                  isExternalLibraryImport: false,
                },
              };
            });
          };
        }

        return Reflect.get(target, prop, receiver);
      },
    });

    return tsModule.createLanguageService(hostProxy);
  }

  // ── External files ────────────────────────────────────────────────────────

  /**
   * Tells tsserver about all `.ecss` files in the project upfront so it can
   * create `scriptInfo` entries for them before module resolution runs.
   *
   * Without this, `resolveModuleNameLiterals` returns a `resolvedFileName`
   * that has no corresponding `scriptInfo`, causing a runtime crash.
   */
  function getExternalFiles(project: ts.server.Project): string[] {
    try {
      const host = project.projectService.host;
      const projectDir = project.getCurrentDirectory();
      const files = host.readDirectory(
        projectDir,
        [ECSS_EXT],
        ['node_modules', 'dist', '.git'],
        ['**/*'],
      );
      return files;
    } catch {
      return [];
    }
  }

  return { create, getExternalFiles };
}

export default init;
