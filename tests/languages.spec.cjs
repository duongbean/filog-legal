const { test, expect } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { runInNewContext } = require('node:vm');
const context = { window: {} };
runInNewContext(readFileSync(resolve(__dirname, '../translations.js'), 'utf8'), context);
const messages = context.window.FiLogMessages;
const origin = process.env.SITE_URL || 'http://127.0.0.1:4173';
const pages = ['index.html', 'privacy.html', 'support.html'];

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
});

for (const filename of pages) {
  test(`${filename}: every text, accessibility label and metadata switches EN → VN → KR → EN`, async ({ page }) => {
    await page.goto(`${origin}/${filename}?lang=en`);
    await page.waitForFunction(() => window.FiLogLanguage);
    // Map positions before changing language so missing/partially translated paragraphs fail.
    const sources = await page.evaluate(() => {
      const all = [], walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (!n.parentElement.closest('script, style, noscript, [data-language]')) all.push(n.nodeValue.trim());
      }
      return all;
    });
    const neutral = /^(?:\s*|FiLog|App Store|Kodak Portra 400|Fujifilm Velvia 50|Ilford HP5 Plus 400|bean272003@gmail\.com|duongbean|©|\.|\d+)$/;
    for (const text of sources.filter(text => !neutral.test(text))) expect(messages[text], `Missing dictionary entry: ${text}`).toBeTruthy();
    for (const language of ['vi', 'ko', 'en']) {
      await page.locator(`[data-language="${language}"]`).click();
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.locator(`[data-language="${language}"]`)).toHaveAttribute('aria-pressed', 'true');
      const after = await page.evaluate(() => {
        const all = [], walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const n = walker.currentNode;
          if (!n.parentElement.closest('script, style, noscript, [data-language]')) all.push(n.nodeValue.trim());
        }
        return all;
      });
      expect(after).toEqual(sources.map(text => language === 'en' ? text : messages[text]?.[language] || text));
      const attrs = await page.locator('[placeholder], nav[aria-label], .menu-toggle, .language-switcher, meta[name="description"]').evaluateAll(elements => elements.map(el => el.getAttribute('placeholder') || el.getAttribute('aria-label') || el.getAttribute('content')));
      if (language !== 'en') for (const attribute of attrs) expect(Object.values(messages).some(entry => entry[language] === attribute), `Untranslated attribute ${attribute}`).toBeTruthy();
      expect(new URL(page.url()).searchParams.get('lang')).toBe(language);
      if (language !== 'en') expect(await page.title()).toMatch(language === 'ko' ? /FiLog|기록장/ : /FiLog/);
    }
  });
}

test('Selection persists through navigation/reload; entered form text and selected topic survive switching', async ({ page }) => {
  await page.goto(`${origin}/?lang=en`);
  await page.locator('#name').fill('Duong');
  await page.locator('#email').fill('duong@example.test');
  await page.locator('#message').fill('Keep my draft unchanged');
  await page.locator('#topic').selectOption('Feature request');
  await page.locator('[data-language="vi"]').click();
  await expect(page.locator('#name')).toHaveValue('Duong');
  await expect(page.locator('#message')).toHaveValue('Keep my draft unchanged');
  await expect(page.locator('#topic')).toHaveValue('Feature request');
  await expect(page.locator('#topic option:checked')).toHaveText('Đề xuất tính năng');
  await page.locator('.nav-links a[href*="privacy.html"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await page.locator('.nav-links a[href*="support.html"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  const first = page.locator('details').first();
  await first.locator('summary').click();
  await expect(first).not.toHaveAttribute('open', '');
  await page.locator('[data-language="ko"]').click();
  await expect(first).not.toHaveAttribute('open', '');
  await page.goto(`${origin}/index.html`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
});

test('Browser locale, URL override and blocked storage work without runtime errors', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'vi-VN' });
  const page = await context.newPage();
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw Error('blocked'); } }); });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/index.html`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await page.locator('[data-language="ko"]').click();
  await page.locator('.nav-links a[href*="support.html"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await page.goto(`${origin}/privacy.html?lang=en`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(errors).toEqual([]);
  await context.close();
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`All languages fit the ${width}px viewport and mobile menu remains usable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const filename of pages) {
      await page.goto(`${origin}/${filename}?lang=en`);
      for (const language of ['vi', 'ko', 'en']) {
        await page.locator(`[data-language="${language}"]`).click();
        await expect(page.locator('.language-switcher')).toBeVisible();
        const bounds = await page.locator('.language-switcher').boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        if (width <= 900) {
          await page.locator('.menu-toggle').click();
          await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'true');
          await expect(page.locator('.nav-links')).toBeVisible();
          await page.locator('.menu-toggle').click();
        }
      }
    }
    if (width === 390) await page.screenshot({ path: '/private/tmp/filog-legal-mobile.png', fullPage: true });
  });
}
