import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const temp = await mkdtemp(join(tmpdir(), 'verifi-check-'));
try {
  const outfile = join(temp, 'verify.cjs');
  await build({
    entryPoints: ['scripts/verify.tsx'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile,
  });
  execFileSync(process.execPath, [outfile], { stdio: 'inherit' });
} finally {
  await rm(temp, { recursive: true, force: true });
}
