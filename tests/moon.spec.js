const { test, expect } = require('./fixtures');

// The Moon over the wire is drawn in its phase now, names it, and leads
// to the explorer, which is its own site published into /moon/.
test('the Moon over the wire names its phase and leads to the explorer', async ({ page }) => {
  await page.goto('/');
  const note = page.locator('.site-header .sky-moon');
  await expect(note).toHaveAttribute('href', '/moon/');
  await expect(note).toHaveAttribute('aria-label', /^The Moon now: (new moon|first quarter|full moon|last quarter|(waxing|waning) (crescent|gibbous))\./);
  await expect(note).toBeVisible();
  await expect(note.locator('.moon-shade')).toHaveAttribute('d', /^M0 -4\.9A/);
});
