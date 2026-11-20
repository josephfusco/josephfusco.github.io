const { test, expect } = require('./fixtures');

// The wire can be taken hold of: an open hand over it, a closed hand on
// it, a refusal at the end of its give, and it lets go when you do.
test('the wire is grabbed, pulled to its limit, and let go', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a finger on the wire is scrolling the page');
  await page.goto('/about/');
  const grip = page.locator('.powerline .wire-grip');
  await expect(grip).toHaveCSS('cursor', 'grab');

  const wire = page.locator('.powerline');
  const box = await page.locator('.powerline .wire-svg').boundingBox();
  const x = box.x + box.width * 0.3;
  const y = box.y + box.height / 2;
  const rest = await page.locator('.powerline .wire-svg path').first().evaluate((p) => p.style.d);

  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(wire).toHaveClass(/held/);
  await expect(grip).toHaveCSS('cursor', 'grabbing');

  await page.mouse.move(x, y + 8);
  const pulled = await page.locator('.powerline .wire-svg path').first().evaluate((p) => p.style.d);
  expect(pulled).not.toEqual(rest);

  await page.mouse.move(x, y + 90);
  await expect(wire).toHaveClass(/at-limit/);
  await expect(grip).toHaveCSS('cursor', 'not-allowed');

  await page.mouse.up();
  await expect(wire).not.toHaveClass(/held/);
  // it hangs under the middle of the span again
  const after = await page.locator('.powerline .wire-svg path').first().evaluate((p) => p.style.d);
  expect(after).toMatch(/Q 50 /);
});
