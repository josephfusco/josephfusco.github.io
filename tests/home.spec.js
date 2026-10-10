const { test, expect } = require('./fixtures');

test('Now lists the current projects', async ({ page }) => {
  await page.goto('/');
  const names = await page.locator('.work h3 a').allTextContents();
  expect(names).toEqual(['Presence API', 'LexGrade', 'LexBunker', 'WPGraphQL IDE', 'VennyD']);
  await expect(page.locator('.work a[href*="sync-storage"]')).toHaveCount(0);
});

test('Lately reads as days, one line per repository', async ({ page }) => {
  await page.goto('/');
  const list = page.locator('[data-lately]');
  await expect(list).not.toHaveAttribute('aria-busy', /.*/);

  const rows = await list.locator('li').evaluateAll((lis) => lis.map((li) => ({
    day: li.classList.contains('lately-day'),
    text: li.textContent.replace(/\s+/g, ' ').trim(),
    href: li.querySelector('.lately-line > a')?.href || '',
  })));

  const days = rows.filter((r) => r.day);
  const lines = rows.filter((r) => !r.day);
  expect(days.length).toBeGreaterThan(1);
  expect(lines.length).toBeGreaterThan(0);
  expect(lines.length).toBeLessThanOrEqual(12);

  for (const l of lines) {
    expect(l.text, 'release bookkeeping').not.toMatch(/release \d|Update to version .* from GitHub/i);
    expect(l.text, 'commit-type prefix').not.toMatch(/^[a-z][\w-]*(\([^)]*\))?!?:\s/);
  }

  // within a day, a repository gets one line
  let day = '';
  const seen = new Set();
  for (const r of rows) {
    if (r.day) { day = r.text; continue; }
    const repo = (r.href.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)/) || [])[1];
    if (!repo) continue;
    expect(seen.has(day + repo), `${repo} twice on ${day}`).toBe(false);
    seen.add(day + repo);
  }
});
