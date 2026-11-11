const PRODUCTS = {
  'al-qamar': {
    name: 'Al Qamar',
    meta: 'Eau de parfum · 50 ml',
    price: 96,
    img: '/images/taqwi-oud.jpg',
  },
  sahra: {
    name: 'Sahra',
    meta: 'Incense holder · Ceramic',
    price: 48,
    img: '/images/taqwi-ceramic.jpg',
  },
  ghazal: {
    name: 'Ghazal',
    meta: 'Linen throw · Stone',
    price: 128,
    img: '/images/taqwi-linen.jpg',
  },
  nuhas: {
    name: 'Nuhas',
    meta: 'Brass tray · Hammered',
    price: 74,
    img: '/images/taqwi-brass.jpg',
  },
};

const STORAGE_KEY = 'taqwi:bag:v1';
const FREE_SHIPPING = 120;
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

const cartEl = $('[data-cart]');
const cartBody = $('[data-cart-body]');
const cartOverlay = $('[data-cart-overlay]');
const checkoutBtn = $('[data-checkout]');
const menuEl = $('[data-mobile-menu]');
const menuBtn = $('[data-menu-open]');
const toastEl = $('[data-toast]');

let bag = loadBag();
let lastFocused = null;
let toastTimer = 0;

function loadBag() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((item) => item && PRODUCTS[item.id] && Number.isInteger(item.qty) && item.qty > 0)
      .map((item) => ({ id: item.id, qty: Math.min(item.qty, 99) }));
  } catch {
    return [];
  }
}

function persistBag() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bag));
  } catch {
    /* storage may be unavailable */
  }
}

const bagCount = () => bag.reduce((total, item) => total + item.qty, 0);
const subtotal = () => bag.reduce((total, item) => total + PRODUCTS[item.id].price * item.qty, 0);

function renderCart() {
  const count = bagCount();
  const total = subtotal();

  $$('[data-cart-count]').forEach((el) => {
    el.textContent = String(count);
  });
  $$('[data-cart-subtotal]').forEach((el) => {
    el.textContent = money.format(total);
  });

  const shipText = $('[data-ship-text]');
  const shipBar = $('[data-ship-bar]');
  const remaining = Math.max(0, FREE_SHIPPING - total);

  if (total === 0) {
    shipText.textContent = `Complimentary shipping over ${money.format(FREE_SHIPPING)}.`;
  } else if (remaining === 0) {
    shipText.textContent = 'Complimentary shipping — unlocked.';
  } else {
    shipText.textContent = `You're ${money.format(remaining)} away from complimentary shipping.`;
  }
  shipBar.style.width = `${Math.min(100, (total / FREE_SHIPPING) * 100)}%`;

  if (checkoutBtn) checkoutBtn.disabled = count === 0;

  if (bag.length === 0) {
    cartBody.innerHTML = `
      <div class="cart-empty">
        <h3>Your bag is quiet.</h3>
        <p>Add something made slowly.</p>
        <a class="btn btn-primary" href="#edit" data-cart-close>Shop the edit</a>
      </div>`;
    return;
  }

  cartBody.innerHTML = bag
    .map((item) => {
      const product = PRODUCTS[item.id];
      return `
        <div class="cart-item" data-id="${item.id}">
          <img src="${product.img}" width="74" height="92" alt="${product.name}" loading="lazy" decoding="async">
          <div>
            <p class="cart-item-name">${product.name}</p>
            <p class="cart-item-meta">${product.meta}</p>
            <div class="qty" aria-label="Quantity for ${product.name}">
              <button type="button" data-qty="-1" aria-label="Decrease quantity of ${product.name}">−</button>
              <span aria-live="polite">${item.qty}</span>
              <button type="button" data-qty="1" aria-label="Increase quantity of ${product.name}">+</button>
            </div>
          </div>
          <div class="cart-item-side">
            <span class="cart-item-price">${money.format(product.price * item.qty)}</span>
            <button class="cart-remove" type="button" data-remove aria-label="Remove ${product.name} from bag">Remove</button>
          </div>
        </div>`;
    })
    .join('');
}

function addToBag(id) {
  const product = PRODUCTS[id];
  if (!product) return;

  const line = bag.find((item) => item.id === id);
  if (line) {
    line.qty = Math.min(99, line.qty + 1);
  } else {
    bag.push({ id, qty: 1 });
  }

  persistBag();
  renderCart();
  pulseCount();
  openCart();
}

function changeQty(id, delta) {
  const line = bag.find((item) => item.id === id);
  if (!line) return;

  line.qty += delta;
  if (line.qty <= 0) {
    bag = bag.filter((item) => item.id !== id);
  }

  persistBag();
  renderCart();
}

function removeItem(id) {
  bag = bag.filter((item) => item.id !== id);
  persistBag();
  renderCart();
}

function pulseCount() {
  $$('[data-cart-count]').forEach((el) => {
    el.classList.remove('is-pulsing');
    void el.offsetWidth;
    el.classList.add('is-pulsing');
  });
}

function openCart() {
  lastFocused = document.activeElement;
  cartEl.removeAttribute('inert');
  cartEl.setAttribute('aria-hidden', 'false');
  cartEl.classList.add('is-open');
  cartOverlay.classList.add('is-open');
  document.body.classList.add('no-scroll');
  $('[data-cart-close]', cartEl)?.focus({ preventScroll: true });
}

function closeCart() {
  cartEl.classList.remove('is-open');
  cartOverlay.classList.remove('is-open');
  cartEl.setAttribute('aria-hidden', 'true');
  cartEl.setAttribute('inert', '');
  document.body.classList.remove('no-scroll');
  lastFocused?.focus?.({ preventScroll: true });
}

function openMenu() {
  lastFocused = document.activeElement;
  menuEl.removeAttribute('inert');
  menuEl.setAttribute('aria-hidden', 'false');
  menuEl.classList.add('is-open');
  menuBtn.setAttribute('aria-expanded', 'true');
  document.body.classList.add('no-scroll');
  $('[data-menu-close]', menuEl)?.focus({ preventScroll: true });
}

function closeMenu({ restoreFocus = true } = {}) {
  menuEl.classList.remove('is-open');
  menuEl.setAttribute('aria-hidden', 'true');
  menuEl.setAttribute('inert', '');
  menuBtn.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('no-scroll');
  if (restoreFocus) lastFocused?.focus?.({ preventScroll: true });
}

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('is-visible'), 2600);
}

function keepFocusInside(event, container) {
  if (event.key !== 'Tab') return;
  const focusable = $$(
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    container,
  ).filter((el) => el.offsetParent !== null);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/* ---------- events ---------- */

document.addEventListener('click', (event) => {
  const add = event.target.closest('[data-add]');
  if (add) {
    addToBag(add.dataset.add);
    return;
  }

  const qty = event.target.closest('[data-qty]');
  if (qty) {
    changeQty(qty.closest('[data-id]')?.dataset.id, Number(qty.dataset.qty));
    return;
  }

  const remove = event.target.closest('[data-remove]');
  if (remove) {
    removeItem(remove.closest('[data-id]')?.dataset.id);
    return;
  }

  if (event.target.closest('[data-cart-open]')) {
    openCart();
    return;
  }

  if (event.target.closest('[data-cart-close]')) {
    closeCart();
    return;
  }

  if (event.target.closest('[data-menu-open]')) {
    openMenu();
    return;
  }

  if (event.target.closest('[data-menu-close]')) {
    closeMenu();
    return;
  }

  if (event.target.closest('[data-menu-link]')) {
    closeMenu({ restoreFocus: false });
    return;
  }

  if (event.target.closest('[data-checkout]')) {
    if (bag.length > 0) toast('Preview store — checkout is not connected');
    return;
  }
});

cartOverlay.addEventListener('click', closeCart);
menuEl.addEventListener('click', (event) => {
  if (event.target === menuEl) closeMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (cartEl.classList.contains('is-open')) closeCart();
    else if (menuEl.classList.contains('is-open')) closeMenu();
    return;
  }
  if (cartEl.classList.contains('is-open')) keepFocusInside(event, cartEl);
  else if (menuEl.classList.contains('is-open')) keepFocusInside(event, menuEl);
});

/* ---------- newsletter ---------- */

const newsletter = $('[data-newsletter]');
if (newsletter) {
  newsletter.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $('input[type="email"]', newsletter);
    const value = input.value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

    if (!valid) {
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      toast('Please enter a valid email address');
      return;
    }

    input.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
    newsletter.hidden = true;
    const note = $('.newsletter-note');
    if (note) note.hidden = true;
    const success = $('[data-newsletter-success]');
    if (success) success.hidden = false;
    toast('You are on the quiet list');
  });
}

/* ---------- sticky header ---------- */

const header = $('[data-header]');
const onScrollHeader = () => {
  header.classList.toggle('is-scrolled', window.scrollY > 8);
};
onScrollHeader();
window.addEventListener('scroll', onScrollHeader, { passive: true });

/* ---------- scroll reveals ---------- */

const revealEls = $$('[data-reveal]');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-in'));
}

/* ---------- hero parallax ---------- */

const heroImg = $('.hero-frame img');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let parallaxTick = false;

function updateParallax() {
  parallaxTick = false;
  if (!heroImg) return;
  if (reducedMotion.matches || window.innerWidth < 900) {
    heroImg.style.removeProperty('--py');
    return;
  }
  const top = heroImg.parentElement.getBoundingClientRect().top;
  const offset = Math.max(-12, Math.min(12, (top - 120) * -0.05));
  heroImg.style.setProperty('--py', `${offset.toFixed(2)}px`);
}

window.addEventListener(
  'scroll',
  () => {
    if (parallaxTick) return;
    parallaxTick = true;
    requestAnimationFrame(updateParallax);
  },
  { passive: true },
);
updateParallax();

/* ---------- init ---------- */

renderCart();
