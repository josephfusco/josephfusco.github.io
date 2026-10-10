const { test, expect } = require('./fixtures');

// Where each page should leave the nav. Only the page you are on is
// marked; the rest stay muted, whatever they link to.
const PAGES = [
  { path: '/', current: null },
  { path: '/about/', current: 'About' },
  { path: '/design/', current: 'Design' },
  { path: '/labels', current: 'Writing' },
];

const MUTED = 'rgb(111, 103, 88)';
const INK = 'rgb(35, 32, 26)';

for (const { path, current } of PAGES) {
  test(`nav on ${path} marks ${current || 'nothing'}`, async ({ page }) => {
    await page.goto(path);
    const links = page.locator('.site-nav a');
    await expect(links).toHaveCount(3);

    for (const link of await links.all()) {
      const name = (await link.textContent()).trim();
      const style = await link.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { color: cs.color, line: cs.textDecorationLine };
      });
      if (name === current) {
        await expect(link).toHaveAttribute('aria-current', 'page');
        expect(style).toEqual({ color: INK, line: 'underline' });
      } else {
        await expect(link).not.toHaveAttribute('aria-current', /.*/);
        expect(style, `${name} looks current on ${path}`).toEqual({ color: MUTED, line: 'none' });
      }
    }
  });
}
