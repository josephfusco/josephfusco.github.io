const { test, expect } = require('./fixtures');

test('the labels post draws its labels in their colors', async ({ page }) => {
  await page.goto('/labels');
  await expect(page.locator('.label-set .label-row')).toHaveCount(8);
  const bare = await page.locator('.gh-label').evaluateAll((els) =>
    els.filter((el) => getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)').map((el) => el.textContent));
  expect(bare).toEqual([]);
});
