import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const srcRoot = path.join(process.cwd(), 'src');

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

const listSourceFiles = (directory: string): string[] => {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return sourceExtensions.has(path.extname(entryPath)) ? [entryPath] : [];
  });
};

const importSpecifierPattern =
  /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

const getImportSpecifiers = (filePath: string): string[] => {
  const source = readFileSync(filePath, 'utf8');

  return Array.from(source.matchAll(importSpecifierPattern), (match) => match[1] ?? match[2]);
};

const referencesFeaturePath = (specifier: string, featurePath: string): boolean =>
  specifier === featurePath || specifier.includes(`/${featurePath}`);

const auditedFeatureNames = ['automation', 'dashboard', 'mentions', 'metrics', 'threats', 'users'];

describe('frontend architecture boundaries', () => {
  it('allows only implemented domain folders and keeps future domains unmaterialized', () => {
    for (const featureName of auditedFeatureNames) {
      expect(existsSync(path.join(srcRoot, 'features', featureName))).toBe(true);
    }

    const futureFeaturePaths = [
      'features/alerts',
      'features/keywords',
      'features/executions',
      'features/n8n',
    ];

    expect(
      futureFeaturePaths.filter((featurePath) => existsSync(path.join(srcRoot, featurePath))),
    ).toEqual([]);
  });

  it('ensures every audited feature has a public barrel (index.ts)', () => {
    const missingBarrels = auditedFeatureNames.filter(
      (featureName) => !existsSync(path.join(srcRoot, 'features', featureName, 'index.ts')),
    );

    expect(missingBarrels).toEqual([]);
  });

  it('keeps shared modules independent from feature modules', () => {
    const sharedFilesImportingFeatures = listSourceFiles(path.join(srcRoot, 'shared')).filter((filePath) =>
      getImportSpecifiers(filePath).some((specifier) => referencesFeaturePath(specifier, 'features')),
    );

    expect(sharedFilesImportingFeatures.map((filePath) => path.relative(srcRoot, filePath))).toEqual([]);
  });

  it('does not keep stale imports to the old n8n feature path', () => {
    const staleFeaturePath = ['features', 'n8n'].join('/');
    const filesImportingOldN8nFeature = listSourceFiles(srcRoot).filter((filePath) =>
      getImportSpecifiers(filePath).some((specifier) => referencesFeaturePath(specifier, staleFeaturePath)),
    );

    expect(filesImportingOldN8nFeature.map((filePath) => path.relative(srcRoot, filePath))).toEqual([]);
  });

  it('keeps audited feature consumption on public barrels instead of deep imports', () => {
    const auditedFeaturePaths = auditedFeatureNames.map((featureName) => ['features', featureName].join('/'));
    const externalDeepImports = listSourceFiles(srcRoot).filter((filePath) => {
      const relativePath = path.relative(srcRoot, filePath);

      return auditedFeaturePaths.some(
        (featurePath) =>
          !relativePath.startsWith(`${featurePath}/`) &&
          getImportSpecifiers(filePath).some(
            (specifier) => specifier.startsWith(`${featurePath}/`) || specifier.includes(`/${featurePath}/`),
          ),
      );
    });

    expect(externalDeepImports.map((filePath) => path.relative(srcRoot, filePath))).toEqual([]);
  });
});
