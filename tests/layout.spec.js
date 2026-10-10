const { test, expect } = require('./fixtures');

const PAGES = ['/', '/about/', '/design/', '/labels', '/lexbunker', '/lexgrade', '/blog/'];

// the y of an element's first baseline, measured, not assumed
const baseline = (el) => {
  const probe = document.createElement('span');
  probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
  el.insertBefore(probe, el.firstChild);
  const y = probe.getBoundingClientRect().top;
  probe.remove();
  return y;
};

for (const path of PAGES) {
  test(`${path} does not scroll sideways`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test.describe('in the margins', () => {
  test.skip(({ viewport }) => viewport.width < 1200, 'the margins fold into the page below 75rem');

  for (const path of ['/labels', '/lexbunker', '/about/']) {
    test(`${path}: title, trail and note share one baseline`, async ({ page }) => {
      await page.goto(path);
      const y = await page.evaluate((fn) => {
        const at = new Function(`return (${fn})`)();
        return {
          title: at(document.querySelector('h1')),
          trail: at(document.querySelector('.crumb-back')),
          note: at(document.querySelector('[data-presence-count]')),
        };
      }, baseline.toString());
      expect(Math.abs(y.trail - y.title), 'trail').toBeLessThanOrEqual(1);
      expect(Math.abs(y.note - y.title), 'note').toBeLessThanOrEqual(1);
    });
  }
});

for (const path of ['/labels', '/lexbunker']) {
  test(`${path}: every paragraph stays on the 1.75rem grid`, async ({ page }) => {
    await page.goto(path);
    const off = await page.evaluate(() => {
      const unit = parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.75;
      return [...document.querySelectorAll('.prose > p')]
        .map((p) => ({ text: p.textContent.slice(0, 40), rest: Math.round(p.getBoundingClientRect().height) % unit }))
        .filter((p) => p.rest !== 0);
    });
    expect(off).toEqual([]);
  });
}

test('categories are written, not boxed', async ({ page }) => {
  for (const path of ['/', '/design/']) {
    await page.goto(path);
    const tags = page.locator('.work .tag, .components .tag');
    expect(await tags.count()).toBeGreaterThan(0);
    const boxed = await tags.evaluateAll((els) => els.filter((el) => {
      const cs = getComputedStyle(el);
      return cs.borderStyle !== 'none' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.fontStyle !== 'italic';
    }).map((el) => el.textContent));
    expect(boxed, path).toEqual([]);
  }
});
