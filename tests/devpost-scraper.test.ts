import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeHackathonUrl,
  parseGalleryPage,
  parseHackathonPage,
  parseProjectPage,
} from "../lib/scraper/devpost";

const galleryHtml = `
  <script type="application/ld+json" id="challenge-json-ld">
    {"@type":"Event","name":"Example Hack","description":"&lt;p&gt;Build useful things.&lt;/p&gt;","organizer":{"name":"Example Org"},"startDate":"2026-01-01T10:00:00Z","endDate":"2026-01-02T10:00:00Z"}
  </script>
  <a class="link-to-software" href="https://devpost.com/software/example-project">
    <img class="software_thumbnail_image" src="//cdn.example.com/gallery-cover.jpg">
    <div class="software-entry-name"><h5>Example Project</h5><p class="tagline">A useful project.</p></div>
  </a>
  <div class="pagination-info"><span class="items_info">1–1 of 42</span>
    <a rel="next" href="/project-gallery?page=2">Next</a>
  </div>`;

const projectHtml = `
  <meta property="og:image" content="https://cdn.example.com/project-cover.jpg">
  <header id="software-header"><h1 id="app-title">Example Project</h1><p class="large">A useful project.</p></header>
  <article id="app-details"><div id="app-details-left">
    <div id="gallery"><iframe class="video-embed" src="https://youtube.com/embed/123"></iframe></div>
    <div><h2>What it does</h2><p>It helps judges.</p></div>
    <div id="built-with"><span class="cp-tag">TypeScript</span><span class="cp-tag">Supabase</span></div>
    <nav class="app-links"><a href="https://github.com/acme/example">Code</a><a href="https://example.com/demo">Demo</a></nav>
  </div><aside id="app-details-right">
    <div id="submissions"><ul><li><a href="https://example-hack.devpost.com/">Example Hack</a><ul><li><span class="winner">Winner</span> Best Overall</li></ul></li></ul></div>
    <section id="app-team"><li class="software-team-member"><div class="bubble">Backend</div><a class="user-profile-link" href="https://devpost.com/alex">Alex Doe</a></li></section>
  </aside></article>`;

test("normalizes only Devpost hackathon URLs", () => {
  assert.deepEqual(normalizeHackathonUrl("https://example-hack.devpost.com/project-gallery?page=2"), {
    devpostUrl: "https://example-hack.devpost.com/",
    devpostSlug: "example-hack",
    galleryUrl: "https://example-hack.devpost.com/project-gallery",
  });
  assert.throws(() => normalizeHackathonUrl("https://example.com/project-gallery"));
  assert.throws(() => normalizeHackathonUrl("http://example-hack.devpost.com"));
});

test("parses event metadata and gallery cards", () => {
  assert.deepEqual(parseHackathonPage(galleryHtml), {
    name: "Example Hack",
    organizer: "Example Org",
    description: "Build useful things.",
    startsAt: "2026-01-01T10:00:00.000Z",
    endsAt: "2026-01-02T10:00:00.000Z",
    projectCount: 42,
  });
  assert.deepEqual(parseGalleryPage(galleryHtml), {
    projects: [{
      devpostUrl: "https://devpost.com/software/example-project",
      devpostSlug: "example-project",
      name: "Example Project",
      tagline: "A useful project.",
      coverImageSourceUrl: "https://cdn.example.com/gallery-cover.jpg",
    }],
    nextHref: "/project-gallery?page=2",
  });
});

test("parses project evidence fields", () => {
  const card = parseGalleryPage(galleryHtml).projects[0];
  const project = parseProjectPage(projectHtml, card, "https://example-hack.devpost.com/");
  assert.equal(project.description, "What it does It helps judges.");
  assert.equal(project.githubUrl, "https://github.com/acme/example");
  assert.equal(project.demoUrl, "https://example.com/demo");
  assert.equal(project.videoUrl, "https://youtube.com/embed/123");
  assert.equal(project.coverImageSourceUrl, "https://cdn.example.com/project-cover.jpg");
  assert.equal(
    parseProjectPage(
      projectHtml.replace(/<meta property="og:image"[^>]+>/, ""),
      card,
      "https://example-hack.devpost.com/",
    ).coverImageSourceUrl,
    "https://cdn.example.com/gallery-cover.jpg",
  );
  assert.deepEqual(project.builtWithData, ["TypeScript", "Supabase"]);
  assert.deepEqual(project.teamData, [{
    name: "Alex Doe",
    devpostUrl: "https://devpost.com/alex",
    contribution: "Backend",
  }]);
  assert.equal(project.isWinner, true);
  assert.equal(project.winningTrack, "Best Overall");
});
