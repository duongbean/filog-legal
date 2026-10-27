// Mobile menu toggle.
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

// The site is static: the contact form opens the visitor's mail app with the message filled in.
const form = document.querySelector('#contact-form');
if (form) {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const subject = `FiLog ${data.get('topic')} — ${data.get('name')}`;
    const body = `${data.get('message')}\n\n—\nName: ${data.get('name')}\nEmail: ${data.get('email')}`;
    window.location.href = `mailto:bean272003@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

const year = document.querySelector('#year');
if (year) year.textContent = String(new Date().getFullYear());
