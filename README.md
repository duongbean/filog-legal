# FiLog website

Static landing page, Privacy Policy and Support/FAQ for FiLog. The site runs directly on GitHub Pages: no runtime dependencies or build step.

## Languages

Use the **VN / EN / KR** buttons in the header on any page. These correspond to the standard language codes `vi`, `en`, `ko`.

The selected language updates page copy, navigation, legal/FAQ text, contact form labels/options/placeholder, the illustrated app UI, accessibility labels, title and description metadata. Names, email addresses and product brands are preserved. Existing HTML elements are retained so form drafts, focus, links, icons and FAQ state are not discarded during language changes. The form still only opens the visitor's email app.

Selection priority is `?lang=vi|en|ko` → a saved `filog.site.language` preference → browser language → English. Choices are saved locally and included in internal links, so navigation also works when browser storage is unavailable. Switching does not send a network request or reload the page. English remains readable with JavaScript disabled. Metadata is switched client-side; this is not a separate server-rendered multilingual SEO setup.

`translations.js` contains Vietnamese and Korean text keyed by the original English text. When changing English HTML, update the matching dictionary entry and run the tests. Keep legal statements equivalent across languages. Translation uses text nodes/attributes, never untrusted HTML.

## Local preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/?lang=vi`, then check Privacy and Support.

## Browser checks

Requires Node.js and Python 3. Test dependencies do not ship with the website.

```sh
npm ci
npx playwright install chromium
npm test
```

Alternatively, run with a locally installed Chrome:

```sh
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test
```

Ten Playwright tests cover complete translation of all three pages, accessibility attributes, round trips back to English, persistence, URL override/browser language, blocked storage, form/FAQ preservation and layouts at 320, 390, 768, 1024 and 1440 pixels. External Google Fonts are blocked in the tests to make them deterministic; the browser uses system fallback fonts.

Verified on 2026-10-27: all 10 tests passed in local Chrome, `node --check site.js`, `node --check translations.js` and `git diff --check` passed. The earlier sandboxed test-server attempt was blocked by socket permissions; browser verification succeeded with local server/browser access. No production deployment was performed as part of this change.
