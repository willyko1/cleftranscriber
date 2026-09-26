import { copyFile, mkdir, rm } from 'node:fs/promises';

// Publish only browser assets; source, tests, and environment files stay private.
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js']) {
  await copyFile(new URL(`../${file}`, import.meta.url), new URL(`../dist/${file}`, import.meta.url));
}
