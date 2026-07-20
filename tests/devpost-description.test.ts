import assert from "node:assert/strict";
import test from "node:test";

import { splitDevpostDescription } from "../lib/devpost/description";

test("splits a flattened description into its devpost sections", () => {
  const sections = splitDevpostDescription(
    "Inspiration We love hardware. What it does Bridges the gap. How we built it A firmware shim.",
  );
  assert.deepEqual(sections, [
    { heading: "Inspiration", body: "We love hardware." },
    { heading: "What it does", body: "Bridges the gap." },
    { heading: "How we built it", body: "A firmware shim." },
  ]);
});

test("keeps leading prose that appears before the first heading", () => {
  const sections = splitDevpostDescription("A quick summary. Inspiration We love hardware.");
  assert.deepEqual(sections, [
    { heading: null, body: "A quick summary." },
    { heading: "Inspiration", body: "We love hardware." },
  ]);
});

test("returns one unlabelled section when no headings are present", () => {
  const sections = splitDevpostDescription("Just a paragraph with no structure at all.");
  assert.deepEqual(sections, [
    { heading: null, body: "Just a paragraph with no structure at all." },
  ]);
});

test("matches straight and curly apostrophes", () => {
  const straight = splitDevpostDescription("Accomplishments that we're proud of We shipped.");
  const curly = splitDevpostDescription("Accomplishments that we’re proud of We shipped.");
  assert.deepEqual(straight, [
    { heading: "Accomplishments we're proud of", body: "We shipped." },
  ]);
  assert.deepEqual(curly, [{ heading: "Accomplishments we're proud of", body: "We shipped." }]);
});

test("consumes the project name in the what's next heading", () => {
  const sections = splitDevpostDescription(
    "What's next for Patient Agent Our end goal is scale.",
    "Patient Agent",
  );
  assert.deepEqual(sections, [{ heading: "What's next", body: "Our end goal is scale." }]);
});

test("handles what's next without a trailing project name", () => {
  const sections = splitDevpostDescription("What's next We're delivering Monday.");
  assert.deepEqual(sections, [{ heading: "What's next", body: "We're delivering Monday." }]);
});

test("escapes regex characters in the project name", () => {
  const sections = splitDevpostDescription(
    "What's next for evolve(browser) Creating an extension.",
    "evolve(browser)",
  );
  assert.deepEqual(sections, [{ heading: "What's next", body: "Creating an extension." }]);
});

test("ignores a heading phrase that reappears out of order", () => {
  const sections = splitDevpostDescription(
    "Inspiration We wanted this. How we built it We used Next. Inspiration struck again later.",
  );
  assert.deepEqual(sections, [
    { heading: "Inspiration", body: "We wanted this." },
    { heading: "How we built it", body: "We used Next. Inspiration struck again later." },
  ]);
});

test("drops sections whose body is empty", () => {
  const sections = splitDevpostDescription("Inspiration We love it. What it does");
  assert.deepEqual(sections, [{ heading: "Inspiration", body: "We love it." }]);
});
