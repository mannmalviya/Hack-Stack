import assert from "node:assert/strict";
import test from "node:test";

import { downloadProjectCover } from "../lib/scraper/project-images";

const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x00,
]);

test("downloads and validates a Devpost CDN cover image", async () => {
  const image = await downloadProjectCover(
    "https://d112y698adiu2z.cloudfront.net/photos/cover.png",
    async () => new Response(pngBytes, {
      headers: { "content-type": "image/png", "content-length": String(pngBytes.length) },
    }),
  );

  assert.equal(image.contentType, "image/png");
  assert.equal(image.extension, "png");
  assert.deepEqual(image.bytes, pngBytes);
});

test("rejects cover images from unapproved hosts before fetching", async () => {
  let fetched = false;
  await assert.rejects(
    downloadProjectCover("https://example.com/cover.png", async () => {
      fetched = true;
      return new Response(pngBytes, { headers: { "content-type": "image/png" } });
    }),
    /unexpected Devpost image URL/,
  );
  assert.equal(fetched, false);
});

test("rejects content that does not match its declared image type", async () => {
  await assert.rejects(
    downloadProjectCover(
      "https://d112y698adiu2z.cloudfront.net/photos/cover.jpg",
      async () => new Response(pngBytes, { headers: { "content-type": "image/jpeg" } }),
    ),
    /did not match its declared type/,
  );
});
