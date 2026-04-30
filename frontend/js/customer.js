/**
 * customer.js — Customer dashboard: Orders + My Offers
 */

if (!requireAuth(['customer'])) { /* redirect happens inside requireAuth */ }

let allOrders = [];
let allOffers = [];

document.addEventListener('DOMContentLoaded', () => {
  injectAuthNav();
  const user = getUser();
  document.getElementById('welcomeMsg').textContent = `Welcome, ${user.name}! 👋`;
  loadAll();
});

async function loadAll() {
  await Promise.all([loadOrders(), loadOffers()]);
  updateStats();
}

// ─── Tabs ─────────────────────────────────────────────────────
function switchCustomerTab(name) {
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.getElementById(`panel-${name}`).classList.remove('hidden');
}

// ─── Stats ────────────────────────────────────────────────────
function updateStats() {
  document.getElementById('statOrders').textContent = allOrders.length;
  document.getElementById('statPending').textContent = allOrders.filter(o => o.status === 'pending').length;
  document.getElementById('statCompleted').textContent = allOrders.filter(o => o.status === 'completed').length;
  document.getElementById('statOffers').textContent = allOffers.length;

  // Offers badge
  const pendingOffers = allOffers.filter(o => o.status === 'pending').length;
  const badge = document.getElementById('offersBadge');
  if (badge) {
    badge.textContent = pendingOffers;
    badge.classList.toggle('hidden', pendingOffers === 0);
  }
}

// ─── Orders ───────────────────────────────────────────────────
async function loadOrders() {
  try {
    const res = await authFetch('/api/orders/my');
    if (!res) return;
    allOrders = await res.json();
    renderOrders(allOrders);
  } catch (err) { console.error('Load orders error:', err); }
}

function renderOrders(orders) {
  const container = document.getElementById('ordersContainer');

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-bag-shopping" style="font-size:3rem;opacity:0.2;margin-bottom:16px;"></i>
        <h3>No orders yet</h3>
        <p>Browse our products and place your first order!</p>
        <a href="/" class="btn-primary" style="margin-top:16px;display:inline-flex;">
          <i class="fa-solid fa-store"></i> Browse Products
        </a>
      </div>`;
    return;
  }

  container.innerHTML = orders.map(order => {
    const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const deliveryIcon = order.deliveryType === 'pickup' ? 'fa-person-walking' : 'fa-truck';
    const deliveryLabel = order.deliveryType === 'pickup' ? 'Pickup' : 'Delivery';
    const statusIcon = {
      pending: 'fa-clock', accepted: 'fa-circle-check',
      completed: 'fa-check-double', rejected: 'fa-circle-xmark'
    }[order.status] || 'fa-clock';

    return `
      <div class="order-card glass-card">
        <div class="order-card-header">
          <div class="order-meta">
            <span class="order-id">#${order.id.slice(0, 8).toUpperCase()}</span>
            <span class="order-date">${date}</span>
            <span class="delivery-badge"><i class="fa-solid ${deliveryIcon}"></i> ${deliveryLabel}</span>
          </div>
          <span class="status-badge status-${order.status}">
            <i class="fa-solid ${statusIcon}"></i> ${capFirst(order.status)}
          </span>
        </div>
        <div class="order-items">
          ${order.items.map(item => `
            <div class="order-item">
              ${item.image
                ? `<img src="${item.image}" alt="${escH(item.name)}" class="order-item-img">`
                : `<div class="order-item-img-placeholder"><i class="fa-solid fa-image"></i></div>`}
              <div class="order-item-info">
                <span class="order-item-name">${escH(item.name)}</span>
                <span class="order-item-qty">Qty: ${item.quantity} × ₹${item.price}</span>
              </div>
              <span class="order-item-total">₹${item.price * item.quantity}</span>
            </div>`).join('')}
        </div>
        <div class="order-card-footer">
          ${order.address
            ? `<span class="order-address"><i class="fa-solid fa-location-dot"></i> ${escH(order.address)}</span>`
            : `<span class="order-address"><i class="fa-solid fa-person-walking"></i> Pickup</span>`}
          <span class="order-total">Total: <strong>₹${order.total}</strong></span>
        </div>
      </div>`;
  }).join('');
}

// ─── Offers ───────────────────────────────────────────────────
async function loadOffers() {
  try {
    const res = await authFetch('/api/offers/my');
    if (!res) return;
    allOffers = await res.json();
    renderOffers(allOffers);
  } catch (err) { console.error('Load offers error:', err); }
}

function renderOffers(offers) {
  const container = document.getElementById('offersContainer');

  if (offers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-handshake" style="font-size:3rem;opacity:0.2;margin-bottom:16px;"></i>
        <h3>No offers yet</h3>
        <p>Use the "Make Offer" button on any product to negotiate a price!</p>
        <a href="/" class="btn-primary" style="margin-top:16px;display:inline-flex;">
          <i class="fa-solid fa-store"></i> Browse Products
        </a>
      </div>`;
    return;
  }

  container.innerHTML = offers.map(offer => {
    const date = new Date(offer.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const savings = offer.originalPrice - offer.offeredPrice;
    const pct = Math.round((savings / offer.originalPrice) * 100);
    const statusMsg = {
      pending: '⏳ Waiting for shopkeeper response...',
      accepted: '🎉 Your offer was accepted! Contact the shop to place the order.',
      rejected: '❌ Your offer was declined. Try a higher price.'
    }[offer.status] || '';

    return `
      <div class="order-card glass-card offer-card">
        <div class="order-card-header">
          <div class="order-meta">
            <span class="order-id">${escH(offer.productName)}</span>
            <span class="order-date">${date}</span>
          </div>
          <span class="status-badge status-${offer.status}">${capFirst(offer.status)}</span>
        </div>
        <div class="offer-price-row">
          <div class="offer-price-block">
            <span class="offer-label">Listed Price</span>
            <span class="offer-original-price">₹${offer.originalPrice}</span>
          </div>
          <i class="fa-solid fa-arrow-right" style="color:var(--text-muted);align-self:center;"></i>
          <div class="offer-price-block">
            <span class="offer-label">Your Offer</span>
            <span class="offer-offered-price">₹${offer.offeredPrice}</span>
          </div>
          <div class="offer-price-block">
            <span class="offer-label">Savings</span>
            <span class="offer-discount">-₹${savings.toFixed(0)} (${pct}%)</span>
          </div>
        </div>
        <div class="offer-status-msg">${statusMsg}</div>
      </div>`;
  }).join('');
}

// ─── Helpers ──────────────────────────────────────────────────
function escH(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function capFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
