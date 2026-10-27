// Keep English in HTML for no-script visitors; translate existing text nodes in place.
// Never replace whole elements: icons, links, form input and open FAQ state survive switching.
(() => {
  const messages = window.FiLogMessages || {};
  const supported = ['vi', 'en', 'ko'];
  const normalize = value => {
    const code = String(value || '').toLowerCase().split('-')[0];
    return code === 'vn' ? 'vi' : code === 'kr' ? 'ko' : code;
  };
  const storageKey = 'filog.site.language';
  let saved;
  try { saved = localStorage.getItem(storageKey); } catch { /* Private browsing can block storage. */ }
  const requested = normalize(new URL(window.location.href).searchParams.get('lang'));
  const preferred = [requested, normalize(saved), ...(navigator.languages || [navigator.language]).map(normalize)];
  let language = preferred.find(code => supported.includes(code)) || 'en';
  const sources = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement.closest('script, style, noscript, [data-language]')) continue;
    const original = node.nodeValue;
    if (messages[original.trim()]) sources.push({ node, original, key: original.trim() });
  }
  const attributes = [];
  document.querySelectorAll('[aria-label], [placeholder], meta[name="description"], meta[property="og:title"], meta[property="og:description"]').forEach(element => {
    // Each language button keeps its native name and lang attribute in every locale.
    if (element.hasAttribute('data-language')) return;
    for (const attribute of ['aria-label', 'placeholder', 'content']) {
      const original = element.getAttribute(attribute);
      if (original && messages[original]) attributes.push({ element, attribute, original });
    }
  });
  const title = document.title;
  const translate = key => language === 'en' ? key : messages[key]?.[language] || key;
  function setLanguage(value, updateURL = true) {
    const next = normalize(value);
    if (!supported.includes(next)) return;
    language = next;
    document.documentElement.lang = language;
    for (const { node, original, key } of sources) {
      node.nodeValue = original.replace(key, () => translate(key));
    }
    for (const { element, attribute, original } of attributes) element.setAttribute(attribute, translate(original));
    document.title = translate(title);
    document.querySelectorAll('[data-language]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
    });
    try { localStorage.setItem(storageKey, language); } catch { /* URL keeps selection between pages. */ }
    // Preserve hashes and other parameters; copyable URLs also work without storage.
    document.querySelectorAll('a[href]').forEach(link => {
      const url = new URL(link.getAttribute('href'), window.location.href);
      if (url.origin !== window.location.origin || !['http:', 'https:'].includes(url.protocol)) return;
      url.searchParams.set('lang', language);
      link.setAttribute('href', url.pathname + url.search + url.hash);
    });
    if (updateURL) {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', language);
      try { history.replaceState(null, '', url); } catch { /* file:// previews may restrict history. */ }
    }
  }
  document.querySelectorAll('[data-language]').forEach(button => {
    button.addEventListener('click', () => setLanguage(button.dataset.language));
  });
  window.FiLogLanguage = { set: setLanguage, get: () => language, translate };
  setLanguage(language);

  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  if (header && toggle) {
    toggle.addEventListener('click', () => {
      const open = header.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    header.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => {
      header.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  // A static mailto form, not a server submission. Keep visitor-entered text unchanged.
  const form = document.querySelector('#contact-form');
  if (form) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      const topic = form.querySelector('#topic').selectedOptions[0].textContent;
      const subject = `FiLog ${topic} — ${data.get('name')}`;
      const body = `${data.get('message')}\n\n—\n${translate('Name')}: ${data.get('name')}\n${translate('Email')}: ${data.get('email')}`;
      window.location.href = `mailto:bean272003@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }
  const year = document.querySelector('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
