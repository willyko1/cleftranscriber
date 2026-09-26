import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/transcribe.js';

const originalFetch = globalThis.fetch;
const originalUrl = process.env.TRANSCRIPTION_API_URL;
const originalKey = process.env.TRANSCRIPTION_API_KEY;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.TRANSCRIPTION_API_URL;
  else process.env.TRANSCRIPTION_API_URL = originalUrl;
  if (originalKey === undefined) delete process.env.TRANSCRIPTION_API_KEY;
  else process.env.TRANSCRIPTION_API_KEY = originalKey;
});
function upload({ clef = 'bass', type = 'image/png', size = 8 } = {}) {
  const form = new FormData();
  form.append('sheetMusic', new Blob([new Uint8Array(size)], { type }), 'score.png');
  form.append('clef', clef);
  return new Request('https://clef.example/api/transcribe', { method: 'POST', body: form });
}
function configure() { process.env.TRANSCRIPTION_API_URL = 'https://engine.example/convert'; }

test('unconfigured deployment gives a clear 503 instead of fake output', async () => {
  delete process.env.TRANSCRIPTION_API_URL;
  const response = await handler.fetch(upload());
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /not connected/);
});
test('rejects other methods', async () => {
  const response = await handler.fetch(new Request('https://clef.example/api/transcribe'));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
});
test('rejects invalid clefs, image types, and oversized uploads', async () => {
  configure();
  assert.equal((await handler.fetch(upload({ clef: 'invalid' }))).status, 400);
  assert.equal((await handler.fetch(upload({ type: 'image/svg+xml' }))).status, 400);
  assert.equal((await handler.fetch(upload({ size: 4 * 1024 * 1024 + 1 }))).status, 413);
});
test('forwards the image and clef, keeps credentials server-side, returns image bytes', async () => {
  configure();
  process.env.TRANSCRIPTION_API_KEY = 'test-secret';
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://engine.example/convert');
    assert.equal(options.headers.Authorization, 'Bearer test-secret');
    assert.equal(options.body.get('clef'), 'bass');
    assert.equal(options.body.get('sheetMusic').size, 8);
    assert.equal(options.redirect, 'error');
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } });
  };
  const response = await handler.fetch(upload());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [1, 2, 3]);
  assert.equal(response.headers.get('authorization'), null);
});
test('rejects HTML error pages and oversized upstream images', async () => {
  configure();
  globalThis.fetch = async () => new Response('<html>error</html>', { headers: { 'Content-Type': 'text/html' } });
  assert.equal((await handler.fetch(upload())).status, 502);
  globalThis.fetch = async () => new Response(new Uint8Array(4 * 1024 * 1024 + 1), { headers: { 'Content-Type': 'image/png' } });
  assert.equal((await handler.fetch(upload())).status, 502);
});
test('handles provider failures and timeouts without leaking provider details', async () => {
  configure();
  globalThis.fetch = async () => new Response('secret upstream error', { status: 500 });
  let response = await handler.fetch(upload());
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /secret/);
  globalThis.fetch = async () => { throw new DOMException('timed out', 'TimeoutError'); };
  assert.equal((await handler.fetch(upload())).status, 504);
});
