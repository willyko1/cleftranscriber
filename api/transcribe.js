const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const CLEFS = new Set(['treble', 'alto', 'tenor', 'bass']);

function error(message, status, headers = {}) {
  return Response.json({ error: message }, {
    status, headers: { 'Cache-Control': 'no-store', ...headers }
  });
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return error('Use POST to upload sheet music.', 405, { Allow: 'POST' });
    }
    // No engine is bundled in this repository. Never fabricate a converted image.
    if (!process.env.TRANSCRIPTION_API_URL) {
      return error('Sheet-music conversion is not connected yet. Image previews work, but transcription is not available.', 503);
    }
    let endpoint;
    try {
      endpoint = new URL(process.env.TRANSCRIPTION_API_URL);
      if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) throw new Error();
    } catch {
      return error('The transcription service is not configured correctly.', 503);
    }
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      return error('Upload an image using multipart/form-data.', 415);
    }
    if (Number(request.headers.get('content-length')) > MAX_IMAGE_BYTES + 64 * 1024) {
      return error('Images must be 4 MB or smaller.', 413);
    }
    let form;
    try { form = await request.formData(); }
    catch { return error('The upload could not be read. Please choose the image again.', 400); }
    const file = form.get('sheetMusic');
    const clef = form.get('clef');
    if (!file || typeof file === 'string' || !IMAGE_TYPES.has(file.type)) {
      return error('Please upload a PNG, JPEG, or WebP image.', 400);
    }
    if (!file.size || file.size > MAX_IMAGE_BYTES) return error('Images must be nonempty and 4 MB or smaller.', 413);
    if (!CLEFS.has(clef)) return error('Please choose a valid clef.', 400);

    const body = new FormData();
    body.append('sheetMusic', file, file.name);
    body.append('clef', clef);
    const headers = {};
    if (process.env.TRANSCRIPTION_API_KEY) headers.Authorization = `Bearer ${process.env.TRANSCRIPTION_API_KEY}`;
    try {
      const upstream = await fetch(endpoint, {
        method: 'POST', body, headers, redirect: 'error', signal: AbortSignal.timeout(50_000)
      });
      if (!upstream.ok) return error('The transcription service could not process this image. Please try again.', 502);
      const type = upstream.headers.get('content-type')?.split(';')[0].trim();
      if (!IMAGE_TYPES.has(type)) return error('The transcription service did not return a supported image.', 502);
      // Bound output below the Vercel response limit, even without Content-Length.
      const reader = upstream.body?.getReader();
      if (!reader) return error('The transcription service returned an empty image.', 502);
      const chunks = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_IMAGE_BYTES) {
          await reader.cancel();
          return error('The converted image is too large. Try a smaller input image.', 502);
        }
        chunks.push(value);
      }
      if (!size) return error('The transcription service returned an empty image.', 502);
      return new Response(new Blob(chunks, { type }), {
        headers: { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
      });
    } catch (failure) {
      return error(failure.name === 'TimeoutError'
        ? 'Transcription took too long. Please try a smaller image.'
        : 'The transcription service could not be reached. Please try again later.',
      failure.name === 'TimeoutError' ? 504 : 502);
    }
  }
};
