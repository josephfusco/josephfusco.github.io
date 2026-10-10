const { test, expect } = require('@playwright/test');

// Old addresses are repaired, never dropped: every page the sitemap
// names still answers, and so do the feeds and the redirects.
test('every address still answers', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  const paths = [...xml.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)].map((m) => m[1]);
  expect(paths.length).toBeGreaterThan(10);
  paths.push('/feed.xml', '/atom.xml', '/archive/');

  const broken = [];
  for (const path of paths) {
    const res = await request.get(path);
    if (res.status() !== 200) broken.push(`${res.status()} ${path}`);
  }
  expect(broken).toEqual([]);
});
