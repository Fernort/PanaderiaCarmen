/* ═══════════════════════════════════════════════
   PANADERÍA DEL HOGAR — funciones.js
   Lógica del carrito, productos, pago y compras
═══════════════════════════════════════════════ */

const STORAGE_CARRITO = 'panaderia_carrito';
const STORAGE_COMPRAS = 'panaderia_compras';

/* ──────────────────────────────────────────────
   DATOS: Catálogo de productos
────────────────────────────────────────────── */
const PRODUCTOS = [
  {
    id: 1,
    nombre: 'Pan de Molde',
    categoria: 'Clásicos',
    descripcion: 'Suave y esponjoso, ideal para el desayuno y loncheras de toda la familia.',
    precio: 8.50,
    emoji: '🍞',
  },
  {
    id: 2,
    nombre: 'Croissant de Mantequilla',
    categoria: 'Especiales',
    descripcion: 'Hojaldrado y dorado, elaborado con mantequilla de primera calidad.',
    precio: 4.50,
    emoji: '🥐',
  },
  {
    id: 3,
    nombre: 'Pan Ciabatta',
    categoria: 'Clásicos',
    descripcion: 'Textura rústica con corteza dorada. Ideal para sándwiches gourmet.',
    precio: 6.00,
    emoji: '🫓',
  },
  {
    id: 4,
    nombre: 'Pan Integral',
    categoria: 'Saludable',
    descripcion: 'Rico en fibra. Elaborado con harina integral, semillas de linaza y avena.',
    precio: 9.00,
    emoji: '🌾',
  },
  {
    id: 5,
    nombre: 'Pan de Yema',
    categoria: 'Clásicos',
    descripcion: 'Dulce y esponjoso, una receta tradicional peruana que enamora.',
    precio: 1.00,
    emoji: '🫶',
  },
  {
    id: 6,
    nombre: 'Budin',
    categoria: 'Dulces',
    descripcion: 'Un postre para el peruano trabajador.',
    precio: 7.50,
    emoji: '🍰',
  },
  {
    id: 7,
    nombre: 'Pan frances',
    categoria: 'Clásicos',
    descripcion: 'Pan perfecto para el té.',
    precio: 1.50,
    emoji: '🥖',
  },
  {
    id: 8,
    nombre: 'Pan de leña',
    categoria: 'Clásicos',
    descripcion: 'Pan perfecto para el desayuno',
    precio: 1.50,
    emoji: '🥖',
  },
];

/* ──────────────────────────────────────────────
   ESTADO GLOBAL
────────────────────────────────────────────── */
let carrito = {};
let compras = [];
let filtroActivo = 'todos';

/* ──────────────────────────────────────────────
   REFERENCIAS DOM (pueden ser null en historial/index)
────────────────────────────────────────────── */
const productsGrid = document.getElementById('productsGrid');
const cartBadge = document.getElementById('cartBadge');
const cartBody = document.getElementById('cartBody');
const cartFooter = document.getElementById('cartFooter');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartTotalText = document.getElementById('cartTotal');
const cartOverlay = document.getElementById('cartOverlay');
const cartSidebar = document.getElementById('cartSidebar');
const cartTrigger = document.getElementById('cartTrigger');
const cartClose = document.getElementById('cartClose');
const payBtn = document.getElementById('payBtn');
const payModal = document.getElementById('payModal');
const payModalClose = document.getElementById('payModalClose');
const comprasList = document.getElementById('comprasList');
const comprasEmpty = document.getElementById('comprasEmpty');
const toastEl = document.getElementById('toast');
const filtrosBtns = document.querySelectorAll('.filtro');
const navBurger = document.getElementById('navBurger');
const navBackdrop = document.getElementById('navBackdrop');
const navMobilePanel = document.getElementById('navMobilePanel');

const esPaginaTienda = Boolean(productsGrid);
const NAV_MOBILE_MAX_PX = 768;

/* ──────────────────────────────────────────────
   Persistencia (comparte carrito e historial entre páginas)
────────────────────────────────────────────── */
function cargarEstado() {
  try {
    const rawC = localStorage.getItem(STORAGE_CARRITO);
    if (rawC) carrito = JSON.parse(rawC);
    const rawCo = localStorage.getItem(STORAGE_COMPRAS);
    if (rawCo) compras = JSON.parse(rawCo);
  } catch {
    carrito = {};
    compras = [];
  }
}

function guardarCarrito() {
  try {
    localStorage.setItem(STORAGE_CARRITO, JSON.stringify(carrito));
  } catch { /* ignore */ }
}

function guardarCompras() {
  try {
    localStorage.setItem(STORAGE_COMPRAS, JSON.stringify(compras));
  } catch { /* ignore */ }
}

function fechaCompra(compra) {
  if (!compra.fecha) return new Date();
  return compra.fecha instanceof Date ? compra.fecha : new Date(compra.fecha);
}

/* ──────────────────────────────────────────────
   RENDERIZAR PRODUCTOS
────────────────────────────────────────────── */
function renderProductos() {
  if (!productsGrid) return;

  const lista = filtroActivo === 'todos'
    ? PRODUCTOS
    : PRODUCTOS.filter(p => p.categoria === filtroActivo);

  productsGrid.innerHTML = lista.map((p, i) => {
    const qty = carrito[p.id] ? carrito[p.id].qty : 0;
    return `
      <div class="product-card" style="animation-delay:${i * 0.06}s">
        <div class="product-thumb">${p.emoji}</div>
        <div class="product-body">
          <span class="product-cat">${p.categoria}</span>
          <h3 class="product-name">${p.nombre}</h3>
          <p class="product-desc">${p.descripcion}</p>
          <div class="product-row">
            <span class="product-price">S/ ${p.precio.toFixed(2)}</span>
            ${qty > 0
              ? `<div class="qty-inline">
                   <button class="qty-btn" onclick="cambiarQtyCard(${p.id}, -1)">−</button>
                   <span class="qty-num">${qty}</span>
                   <button class="qty-btn" onclick="cambiarQtyCard(${p.id}, 1)">+</button>
                 </div>`
              : `<button class="add-to-cart-btn" onclick="agregarAlCarrito(${p.id})">
                   + Agregar
                 </button>`
            }
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ──────────────────────────────────────────────
   CARRITO: Agregar producto
────────────────────────────────────────────── */
function agregarAlCarrito(id) {
  const producto = PRODUCTOS.find(p => p.id === id);
  if (!producto) return;

  if (carrito[id]) {
    carrito[id].qty++;
  } else {
    carrito[id] = { ...producto, qty: 1 };
  }

  actualizarCarrito();
  renderProductos();
  animarBadge();
  mostrarToast(`🎉 ${producto.nombre} agregado`);
}

/* ──────────────────────────────────────────────
   CARRITO: Cambiar cantidad desde la card
────────────────────────────────────────────── */
function cambiarQtyCard(id, delta) {
  if (!carrito[id]) return;
  carrito[id].qty += delta;
  if (carrito[id].qty <= 0) delete carrito[id];
  actualizarCarrito();
  renderProductos();
}

/* ──────────────────────────────────────────────
   CARRITO: Cambiar cantidad desde el sidebar
────────────────────────────────────────────── */
function cambiarQtyCarrito(id, delta) {
  if (!carrito[id]) return;
  carrito[id].qty += delta;
  if (carrito[id].qty <= 0) delete carrito[id];
  actualizarCarrito();
  renderCarritoBody();
  renderProductos();
}

/* ──────────────────────────────────────────────
   CARRITO: Recalcular totales y badge
────────────────────────────────────────────── */
function actualizarCarrito() {
  const items = Object.values(carrito);
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalPrecio = items.reduce((s, i) => s + i.precio * i.qty, 0);

  if (cartBadge) cartBadge.textContent = totalQty;

  if (cartSubtotal && cartTotalText && cartFooter) {
    if (items.length > 0) {
      cartSubtotal.textContent = `S/ ${totalPrecio.toFixed(2)}`;
      cartTotalText.textContent = `S/ ${totalPrecio.toFixed(2)}`;
      cartFooter.style.display = 'block';
    } else {
      cartFooter.style.display = 'none';
    }
  }
  guardarCarrito();
}

/* ──────────────────────────────────────────────
   CARRITO: Renderizar items en el sidebar
────────────────────────────────────────────── */
function renderCarritoBody() {
  if (!cartBody) return;

  const items = Object.values(carrito);

  if (items.length === 0) {
    cartBody.innerHTML = `
      <div class="cart-empty-state">
        <span>🧺</span>
        <p>Tu canasta está vacía.<br/>¡Agrega panes fresquitos!</p>
      </div>
    `;
    return;
  }

  cartBody.innerHTML = items.map(item => `
    <div class="cart-item" id="cart-item-${item.id}">
      <div class="cart-item-emoji">${item.emoji}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.nombre}</div>
        <div class="cart-item-price">S/ ${item.precio.toFixed(2)} c/u</div>
      </div>
      <div class="cart-item-controls">
        <button class="cart-qty-btn" onclick="cambiarQtyCarrito(${item.id}, -1)">−</button>
        <span class="cart-qty-num">${item.qty}</span>
        <button class="cart-qty-btn" onclick="cambiarQtyCarrito(${item.id}, 1)">+</button>
      </div>
      <div class="cart-item-total">S/ ${(item.precio * item.qty).toFixed(2)}</div>
    </div>
  `).join('');
}

/* ──────────────────────────────────────────────
   CARRITO: Abrir / Cerrar
────────────────────────────────────────────── */
function syncNavbarHeight() {
  const nav = document.querySelector('.navbar');
  if (nav) {
    const h = Math.round(nav.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--navbar-h', `${h}px`);
  }
}

function syncBodyScrollLock() {
  const cartAbierto = cartSidebar?.classList.contains('open');
  const modalAbierto = payModal?.classList.contains('open');
  const menuAbierto = document.body.classList.contains('nav-mobile-open');
  document.body.style.overflow = cartAbierto || modalAbierto || menuAbierto ? 'hidden' : '';
}

function cerrarMenuMobile() {
  document.body.classList.remove('nav-mobile-open');
  navBurger?.setAttribute('aria-expanded', 'false');
  navBurger?.setAttribute('aria-label', 'Abrir menú');
  navMobilePanel?.setAttribute('aria-hidden', 'true');
  navBackdrop?.setAttribute('aria-hidden', 'true');
  syncBodyScrollLock();
}

function abrirMenuMobile() {
  cerrarCarrito();
  syncNavbarHeight();
  document.body.classList.add('nav-mobile-open');
  navBurger?.setAttribute('aria-expanded', 'true');
  navBurger?.setAttribute('aria-label', 'Cerrar menú');
  navMobilePanel?.setAttribute('aria-hidden', 'false');
  navBackdrop?.setAttribute('aria-hidden', 'false');
  syncBodyScrollLock();
}

function toggleMenuMobile() {
  if (document.body.classList.contains('nav-mobile-open')) cerrarMenuMobile();
  else abrirMenuMobile();
}

function abrirCarrito() {
  cerrarMenuMobile();
  renderCarritoBody();
  cartOverlay?.classList.add('open');
  cartSidebar?.classList.add('open');
  syncBodyScrollLock();
}

function cerrarCarrito() {
  cartOverlay?.classList.remove('open');
  cartSidebar?.classList.remove('open');
  syncBodyScrollLock();
}

/* ──────────────────────────────────────────────
   PAGO: Confirmar y registrar compra
────────────────────────────────────────────── */
function confirmarPago() {
  const items = Object.values(carrito);
  if (items.length === 0) return;

  const total = items.reduce((s, i) => s + i.precio * i.qty, 0);
  const ahora = new Date();

  compras.unshift({
    id: Date.now(),
    fecha: ahora.toISOString(),
    items: items.map(i => ({ nombre: i.nombre, qty: i.qty, subtotal: i.precio * i.qty })),
    total,
  });

  guardarCompras();

  carrito = {};
  guardarCarrito();
  actualizarCarrito();
  renderCarritoBody();
  renderProductos();
  renderCompras();

  cerrarCarrito();
  abrirModalPago();
}

/* ──────────────────────────────────────────────
   MODAL DE PAGO: Animación check
────────────────────────────────────────────── */
function abrirModalPago() {
  const circle = document.querySelector('.check-circle');
  const mark = document.querySelector('.check-mark');

  if (circle && mark) {
    circle.style.animation = 'none';
    mark.style.animation = 'none';
    void circle.offsetWidth;
    void mark.offsetWidth;
    circle.style.animation = '';
    mark.style.animation = '';
  }

  payModal?.classList.add('open');
  syncBodyScrollLock();
}

function cerrarModalPago() {
  payModal?.classList.remove('open');
  syncBodyScrollLock();
}

/* ──────────────────────────────────────────────
   HISTORIAL DE COMPRAS: Renderizar
────────────────────────────────────────────── */
function renderCompras() {
  if (!comprasList || !comprasEmpty) return;

  if (compras.length === 0) {
    comprasEmpty.style.display = 'block';
    comprasList.innerHTML = '';
    return;
  }

  comprasEmpty.style.display = 'none';

  comprasList.innerHTML = compras.map((compra, i) => {
    const fecha = fechaCompra(compra).toLocaleDateString('es-PE', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const itemsTexto = compra.items
      .map(it => `${it.nombre} x${it.qty} (S/ ${it.subtotal.toFixed(2)})`)
      .join(' · ');

    return `
      <div class="compra-card" style="animation-delay:${i * 0.08}s">
        <div class="compra-left">
          <div class="compra-fecha">${fecha}</div>
          <div class="compra-items">${itemsTexto}</div>
        </div>
        <div class="compra-total">
          <span class="compra-total-label">Total</span>
          <span class="compra-total-val">S/ ${compra.total.toFixed(2)}</span>
          <span class="compra-badge">✓ Pagado</span>
        </div>
      </div>
    `;
  }).join('');
}

/* ──────────────────────────────────────────────
   FILTROS DE CATEGORÍA
────────────────────────────────────────────── */
function inicializarFiltros() {
  filtrosBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filtroActivo = btn.dataset.cat;
      filtrosBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProductos();
    });
  });
}

/* ──────────────────────────────────────────────
   BADGE: Animación pop
────────────────────────────────────────────── */
function animarBadge() {
  cartBadge?.classList.add('pop');
  setTimeout(() => cartBadge?.classList.remove('pop'), 300);
}

/* ──────────────────────────────────────────────
   TOAST: Notificación temporal
────────────────────────────────────────────── */
let toastTimer;
function mostrarToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

/* ──────────────────────────────────────────────
   EVENT LISTENERS
────────────────────────────────────────────── */
cartTrigger?.addEventListener('click', abrirCarrito);
cartClose?.addEventListener('click', cerrarCarrito);
cartOverlay?.addEventListener('click', cerrarCarrito);

navBurger?.addEventListener('click', toggleMenuMobile);
navBackdrop?.addEventListener('click', cerrarMenuMobile);
document.querySelectorAll('a.nav-mobile-link').forEach(a => {
  a.addEventListener('click', cerrarMenuMobile);
});

payBtn?.addEventListener('click', confirmarPago);

payModalClose?.addEventListener('click', () => {
  cerrarModalPago();
  if (esPaginaTienda) {
    window.location.href = 'historial.html';
  } else {
    document.getElementById('comprasSection')?.scrollIntoView({ behavior: 'smooth' });
    renderCompras();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    cerrarMenuMobile();
    cerrarCarrito();
    cerrarModalPago();
  }
});

window.addEventListener('resize', () => {
  syncNavbarHeight();
  if (window.innerWidth > NAV_MOBILE_MAX_PX) cerrarMenuMobile();
});

/* ──────────────────────────────────────────────
   INIT
────────────────────────────────────────────── */
(function init() {
  cargarEstado();
  syncNavbarHeight();
  if (filtrosBtns.length) inicializarFiltros();
  renderProductos();
  actualizarCarrito();
  renderCompras();
})();
