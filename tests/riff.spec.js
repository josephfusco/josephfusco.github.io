const { test, expect } = require('./fixtures');

const RIFF = 'https://open.riffpress.com/demo/';

function track(id, title) {
  return { id: String(id), type: 'audio', locked: false, title, artist: 'A chorus', album: 'An album', duration: 75, art: [], src: `${RIFF}?riff-file=${id}` };
}

// Riff's player is the Riff's to test. This stands in for it: the same
// door (window.riff, riff:ready, riff:play), and nothing behind it.
const PLAYER = `
  const root = document.getElementById('riff');
  const say = (name) => root.dispatchEvent(new CustomEvent('riff:' + name, { bubbles: true }));
  let queue = [], at = -1, playing = false;
  const kept = JSON.parse(sessionStorage.getItem('riff:state') || 'null');
  if (kept) ({ queue, at, playing } = kept);
  const keep = () => sessionStorage.setItem('riff:state', JSON.stringify({ queue, at, playing }));
  window.riff = {
    play(tracks, i) { queue = tracks; at = i; playing = true; root.hidden = false; keep(); say('track'); say('play'); },
    toggle() { playing = !playing; keep(); say(playing ? 'play' : 'pause'); },
    current: () => queue[at] || null,
    playing: () => playing,
  };
  root.hidden = at < 0;
  say('ready');
`;

async function riff(page) {
  const asked = [];
  await page.route('https://open.riffpress.com/**', (route) => {
    const url = route.request().url();
    asked.push(url);
    if (url.includes('/riff/v1/tracks')) return route.fulfill({ json: { items: [track(17, "Lo, How a Rose E'er Blooming"), track(18, 'Joy to the World')] } });
    if (url.includes('/assets/riff.js')) return route.fulfill({ contentType: 'application/javascript', body: PLAYER });
    if (/\.css(\?|$)/.test(url)) return route.fulfill({ contentType: 'text/css', body: '' });
    return route.fulfill({ contentType: 'application/javascript', body: '' });
  });
  return asked;
}

test('a pressed row brings Riff’s player to the foot of the page and plays in it', async ({ page }) => {
  const asked = await riff(page);
  await page.goto('/projects/');
  const list = page.locator('[data-riff-tracks]');
  await expect(list).not.toHaveAttribute('aria-busy', /.*/);
  await expect(list.locator('button').first()).toHaveText('1Lo, How a Rose E’er Blooming');
  await expect(list.locator('time').first()).toHaveText('1:15');

  // a row is one line of the 1.75rem grid
  const heights = await list.locator('li').evaluateAll((lis) => lis.map((li) => li.offsetHeight));
  const unit = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.75);
  expect(heights).toEqual([unit, unit]);

  // until a row is pressed, the list is all that was asked of the Riff
  expect(asked.filter((url) => !url.includes('/riff/v1/tracks'))).toEqual([]);
  await expect(page.locator('#riff')).toHaveCount(0);

  await list.getByRole('button', { name: 'Play Joy to the World' }).click();
  await expect(page.locator('#riff .riff-bar')).toBeVisible();
  await expect(list.locator('li').nth(1)).toHaveAttribute('aria-current', 'true');
  const row = list.getByRole('button', { name: 'Pause Joy to the World' });
  await expect(row).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.riff.current().title)).toBe('Joy to the World');

  // the same row again pauses it
  await row.click();
  await expect(list.getByRole('button', { name: 'Play Joy to the World' })).toHaveAttribute('aria-pressed', 'false');
});

test('the player follows its queue to the next page', async ({ page }) => {
  const asked = await riff(page);
  await page.goto('/about/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#riff')).toHaveCount(0);
  expect(asked).toEqual([]);

  await page.evaluate(() => sessionStorage.setItem('riff:state', JSON.stringify({ queue: [{ id: '18', title: 'Joy to the World' }], at: 0, playing: true })));
  await page.goto('/writing/');
  await expect(page.locator('#riff .riff-bar')).toBeVisible();
});

test('with the Riff out of reach the list goes and the album link stays', async ({ page }) => {
  await page.goto('/projects/');
  await expect(page.locator('[data-riff-tracks]')).toHaveCount(0);
  await expect(page.locator('.work-riff h4 a')).toHaveAttribute('href', `${RIFF}?riff_album=3`);
});
