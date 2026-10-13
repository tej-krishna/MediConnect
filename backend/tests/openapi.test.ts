import { execSync } from 'child_process';
import { readFileSync, writeFileSync, rmSync, existsSync } from 'fs';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * Runs the real generator (not a mock of it) so a future schema change that `z.toJSONSchema()`
 * can't represent — the way `z.coerce.date()` couldn't until the override in the script — fails
 * this test immediately, in CI, instead of silently producing a stale or broken openapi.json that
 * nobody notices until a Flutter developer (or anyone else) tries to use it.
 */
describe('openapi generator', () => {
  const outPath = path.resolve(__dirname, '../openapi.json');
  const hadExistingFile = existsSync(outPath);
  const existingContent = hadExistingFile ? readFileSync(outPath, 'utf-8') : null;

  afterAll(() => {
    if (existingContent !== null) {
      writeFileSync(outPath, existingContent);
    } else {
      rmSync(outPath, { force: true });
    }
  });

  it('runs without throwing and produces a well-formed spec covering every module', () => {
    execSync('npx tsx scripts/generate-openapi.ts', {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
    });

    const spec = JSON.parse(readFileSync(outPath, 'utf-8'));

    expect(spec.openapi).toBe('3.0.3');
    expect(Object.keys(spec.paths).length).toBeGreaterThan(90);

    const tags = new Set<string>();
    for (const pathItem of Object.values(spec.paths) as Record<string, { tags: string[] }>[]) {
      for (const operation of Object.values(pathItem)) {
        for (const tag of operation.tags) tags.add(tag);
      }
    }
    for (const expectedTag of ['Auth', 'Providers', 'Pharmacy', 'Diagnostics', 'Home Care', 'Delivery Partners', 'Support', 'Admin', 'Medical Records']) {
      expect(tags.has(expectedTag)).toBe(true);
    }

    // Every authenticated operation must declare bearerAuth security, never rely on it implicitly.
    const authRegisterOp = spec.paths['/auth/register'].post;
    expect(authRegisterOp.security).toBeUndefined();
    const meOp = spec.paths['/auth/me'].get;
    expect(meOp.security).toEqual([{ bearerAuth: [] }]);
  }, 20000);
});
