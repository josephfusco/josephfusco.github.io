const { test, expect } = require('./fixtures');

test('the writing index lists every post once by year and at least once by subject', async ({ page }) => {
  // the front page's list is the record of what has been published
  await page.goto('/');
  const published = await page.locator('#writing .posts-year li:not(.posts-year-label) a').evaluateAll((as) => as.map((a) => a.pathname));
  expect(published.length).toBeGreaterThan(10);

  await page.goto('/writing/');
  const byYear = await page.locator('.by-year .posts-year li:not(.posts-year-label) a').evaluateAll((as) => as.map((a) => a.pathname));
  expect(byYear).toEqual(published);

  const bySubject = await page.locator('.by-subject .lately-line a').evaluateAll((as) => as.map((a) => a.pathname));
  expect(new Set(bySubject)).toEqual(new Set(byYear));

  // the subjects run in a book index's order
  const terms = await page.locator('.by-subject .term').allTextContents();
  expect(terms).toEqual([...terms].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
});

// ruled rows are a unit and a half: halves are allowed, drift is not
test('the writing index keeps the grid by year, to the half unit', async ({ page }) => {
  await page.goto('/writing/');
  const off = await page.evaluate(() => {
    const unit = parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.875;
    const h2 = document.querySelector('.by-year > h2');
    return [...document.querySelectorAll('.by-year li, .by-year .posts-year')]
      .map((el) => ({ text: el.textContent.trim().slice(0, 24), top: (el.offsetTop - h2.offsetTop) % unit, height: el.offsetHeight % unit }))
      .filter((r) => r.top !== 0 || r.height !== 0);
  });
  expect(off).toEqual([]);
});
