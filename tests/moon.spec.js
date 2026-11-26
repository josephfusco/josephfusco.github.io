const { test, expect } = require('./fixtures');

// The note under the wire names the Moon's phase now and leads to the
// explorer, which is its own site published into /moon/.
test('the field note names the phase and leads to the Moon', async ({ page }) => {
  await page.goto('/');
  const note = page.locator('.field-note [data-moon]');
  await expect(note).toHaveAttribute('href', '/moon/');
  await expect(note).toHaveAttribute('aria-label', /^The Moon now: (new moon|first quarter|full moon|last quarter|(waxing|waning) (crescent|gibbous))\./);
  await expect(note.locator('.moon-shade')).toHaveAttribute('d', /^M0 -4\.9A/);
});
