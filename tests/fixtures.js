// Every test runs offline: the live feed and the presence worker are the
// network's to break, not the page's. Lately falls back to the record
// built into the page, which is the path these tests mean to hold.
const base = require('@playwright/test');

exports.test = base.test.extend({
  page: async ({ page }, use) => {
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
    await page.routeWebSocket(/.*/, (ws) => ws.close());
    await use(page);
  },
});
exports.expect = base.expect;
