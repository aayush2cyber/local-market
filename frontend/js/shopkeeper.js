/**
 * shopkeeper.js — Shopkeeper dashboard: Products, Orders, Offers, Settings
 */

if (!requireAuth(['shopkeeper'])) { /* redirect happens inside requireAuth */ }

let allMyProducts = [];
let allMyOrders = [];
let allMyOffers = [];
const user = getUser();

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectAuthNav();
  document.getElementById('welcomeMsg').textContent = `Welcome, ${user.name}! 👋`;
  loadAll();
  setupDeliveryToggle();
  loadShopSettings();
});

async function loadAll() {
  await Promise.all([loadProducts(), loadOrders(), loadOffers()]);
  updateHeaderStats();
}

// ─── Tab Navigation ───────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.getElementById(`panel-${name}`).classList.remove('hidden');
}

// ─── Stats ────────────────────────────────────────────────────
function updateHeaderStats() {
  document.getElementById('statProducts').textContent = allMyProducts.length;
  document.getElementById('statOrders').textContent = allMyOrders.filter(o => o.status === 'pending').length;
  document.getElementById('statOffers').textContent = allMyOffers.filter(o => o.status === 'pending').length;
  const avg = allMyProducts.length > 0
    ? Math.round(allMyProducts.reduce((s, p) => s + p.price, 0) / allMyProducts.length)
    : 0;
  document.getElementById('statAvgPrice').textContent = `₹${avg}`;

  // Badges
  const pendingOrders = allMyOrders.filter(o => o.status === 'pending').length;
  const pendingOffers = allMyOffers.filter(o => o.status === 'pending').length;
  setBadge('ordersBadge', pendingOrders);
  setBadge('offersBadge', pendingOffers);
}

function setBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = count;
  el.classList.toggle('hidden', count === 0);
}

// ─── Products ─────────────────────────────────────────────────
async function loadProducts() {
  try {
    const res = await authFetch('/api/products/my');
    if (!res) return;
    allMyProducts = await res.json();
    renderProducts(allMyProducts);
  } catch (err) { console.error('Load products error:', err); }
}

function renderProducts(products) {
  const tbody = document.getElementById('productsBody');
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">
      <i class="fa-solid fa-box-open" style="font-size:2rem;opacity:0.3;margin-bottom:10px;display:block;"></i>
      No products yet. Click "Add Product" to get started!
    </td></tr>`;
    return;
  }
  tbody.innerHTML = products.map(p => {
    const imgSrc = p.image || '';
    const date = new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `
      <tr>
        <td>${imgSrc
          ? `<img src="${imgSrc}" alt="${escH(p.name)}" class="table-product-img">`
          : `<div class="table-product-img-placeholder"><i class="fa-solid fa-image"></i></div>`}
        </td>
        <td><strong>${escH(p.name)}</strong><div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">${escH(p.description||'')}</div></td>
        <td><span class="category-badge">${escH(p.category)}</span></td>
        <td class="price-cell">₹${p.price}</td>
        <td>${escH(p.unit || 'piece')}</td>
        <td>${date}</td>
        <td class="actions-cell">
          <button class="btn-icon btn-edit" title="Edit" onclick="openEditModal('${p.id}')">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-icon btn-delete" title="Delete" onclick="deleteProduct('${p.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
}

function filterProducts() {
  const term = document.getElementById('productSearch').value.toLowerCase();
  renderProducts(allMyProducts.filter(p =>
    p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
  ));
}

function openAddModal() {
  document.getElementById('editProductId').value = '';
  document.getElementById('productModalTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> Add Product';
  document.getElementById('productForm').reset();
  document.getElementById('pUnit').value = 'piece';
  document.getElementById('pCategory').value = 'General';
  document.getElementById('imagePreview').classList.add('hidden');
  document.getElementById('uploadPlaceholder').style.display = '';
  document.getElementById('productFormBtn').innerHTML = '<span>Add Product</span><i class="fa-solid fa-check"></i>';
  document.getElementById('productFormError').classList.add('hidden');
  document.getElementById('productModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function openEditModal(id) {
  const p = allMyProducts.find(x => x.id === id);
  if (!p) return;
  document.getElementById('editProductId').value = p.id;
  document.getElementById('productModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Product';
  document.getElementById('pName').value = p.name;
  document.getElementById('pPrice').value = p.price;
  document.getElementById('pUnit').value = p.unit || 'piece';
  document.getElementById('pCategory').value = p.category;
  document.getElementById('pDesc').value = p.description || '';
  document.getElementById('productFormBtn').innerHTML = '<span>Save Changes</span><i class="fa-solid fa-check"></i>';
  document.getElementById('productFormError').classList.add('hidden');
  if (p.image) {
    document.getElementById('imagePreview').src = p.image;
    document.getElementById('imagePreview').classList.remove('hidden');
    document.getElementById('uploadPlaceholder').style.display = 'none';
  } else {
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('uploadPlaceholder').style.display = '';
  }
  document.getElementById('productModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
  document.body.style.overflow = '';
}

function previewImage(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('imagePreview');
      preview.src = e.target.result;
      preview.classList.remove('hidden');
      document.getElementById('uploadPlaceholder').style.display = 'none';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('productFormError');
  const btn = document.getElementById('productFormBtn');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  const editId = document.getElementById('editProductId').value;
  const isEdit = !!editId;
  const formData = new FormData();
  formData.append('name', document.getElementById('pName').value);
  formData.append('price', document.getElementById('pPrice').value);
  formData.append('unit', document.getElementById('pUnit').value);
  formData.append('category', document.getElementById('pCategory').value);
  formData.append('description', document.getElementById('pDesc').value);
  const imageFile = document.getElementById('pImage').files[0];
  if (imageFile) formData.append('image', imageFile);

  try {
    const url = isEdit ? `/api/products/${editId}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    closeProductModal();
    await loadProducts();
    updateHeaderStats();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = isEdit
      ? '<span>Save Changes</span><i class="fa-solid fa-check"></i>'
      : '<span>Add Product</span><i class="fa-solid fa-check"></i>';
  }
});

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  try {
    const res = await authFetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!res) return;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await loadProducts();
    updateHeaderStats();
  } catch (err) { alert('Delete failed: ' + err.message); }
}

// ─── Orders ───────────────────────────────────────────────────
async function loadOrders() {
  try {
    const res = await authFetch('/api/orders/shop');
    if (!res) return;
    allMyOrders = await res.json();
    renderOrders(allMyOrders);
  } catch (err) { console.error('Load orders error:', err); }
}

function filterOrders() {
  const filter = document.getElementById('orderStatusFilter').value;
  const filtered = filter ? allMyOrders.filter(o => o.status === filter) : allMyOrders;
  renderOrders(filtered);
}

function renderOrders(orders) {
  const container = document.getElementById('ordersContainer');
  if (orders.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-receipt" style="font-size:2.5rem;opacity:0.2;margin-bottom:16px;"></i>
      <h3>No orders yet</h3><p>Orders from customers will appear here.</p>
    </div>`;
    return;
  }
  container.innerHTML = orders.map(order => {
    const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const deliveryIcon = order.deliveryType === 'pickup' ? 'fa-person-walking' : 'fa-truck';
    const deliveryLabel = order.deliveryType === 'pickup' ? 'Pickup' : 'Delivery';
    return `
      <div class="order-card glass-card">
        <div class="order-card-header">
          <div class="order-meta">
            <span class="order-id">#${order.id.slice(0,8).toUpperCase()}</span>
            <span class="order-date">${date}</span>
            <span class="delivery-badge"><i class="fa-solid ${deliveryIcon}"></i> ${deliveryLabel}</span>
          </div>
          <span class="status-badge status-${order.status}">${statusLabel(order.status)}</span>
        </div>
        <div class="order-customer-info">
          <i class="fa-solid fa-user"></i> ${escH(order.customerName)}
          ${order.phone ? `<span style="margin-left:12px;"><i class="fa-solid fa-phone"></i> ${escH(order.phone)}</span>` : ''}
        </div>
        <div class="order-items">
          ${order.items.map(item => `
            <div class="order-item">
              ${item.image ? `<img src="${item.image}" alt="${escH(item.name)}" class="order-item-img">` : `<div class="order-item-img-placeholder"><i class="fa-solid fa-image"></i></div>`}
              <div class="order-item-info">
                <span class="order-item-name">${escH(item.name)}</span>
                <span class="order-item-qty">Qty: ${item.quantity} × ₹${item.price}</span>
              </div>
              <span class="order-item-total">₹${item.price * item.quantity}</span>
            </div>`).join('')}
        </div>
        <div class="order-card-footer">
          ${order.address ? `<span class="order-address"><i class="fa-solid fa-location-dot"></i> ${escH(order.address)}</span>` : '<span class="order-address"><i class="fa-solid fa-person-walking"></i> Pickup</span>'}
          <span class="order-total">Total: <strong>₹${order.total}</strong></span>
        </div>
        ${order.status === 'pending' ? `
          <div class="order-actions">
            <button class="btn-accept" onclick="updateOrderStatus('${order.id}','accepted')">
              <i class="fa-solid fa-check"></i> Accept
            </button>
            <button class="btn-reject" onclick="updateOrderStatus('${order.id}','rejected')">
              <i class="fa-solid fa-xmark"></i> Reject
            </button>
          </div>` : ''}
        ${order.status === 'accepted' ? `
          <div class="order-actions">
            <button class="btn-complete" onclick="updateOrderStatus('${order.id}','completed')">
              <i class="fa-solid fa-check-double"></i> Mark Completed
            </button>
          </div>` : ''}
      </div>`;
  }).join('');
}

async function updateOrderStatus(orderId, status) {
  try {
    const res = await authFetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    if (!res) return;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await loadOrders();
    updateHeaderStats();
  } catch (err) { alert('Failed: ' + err.message); }
}

// ─── Offers ───────────────────────────────────────────────────
async function loadOffers() {
  try {
    const res = await authFetch('/api/offers/shop');
    if (!res) return;
    allMyOffers = await res.json();
    renderOffers(allMyOffers);
  } catch (err) { console.error('Load offers error:', err); }
}

function filterOffers() {
  const filter = document.getElementById('offerStatusFilter').value;
  renderOffers(filter ? allMyOffers.filter(o => o.status === filter) : allMyOffers);
}

function renderOffers(offers) {
  const container = document.getElementById('offersContainer');
  if (offers.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-handshake" style="font-size:2.5rem;opacity:0.2;margin-bottom:16px;"></i>
      <h3>No offers yet</h3><p>Customer price offers will appear here.</p>
    </div>`;
    return;
  }
  container.innerHTML = offers.map(offer => {
    const date = new Date(offer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const savings = offer.originalPrice - offer.offeredPrice;
    const pct = Math.round((savings / offer.originalPrice) * 100);
    return `
      <div class="order-card glass-card offer-card">
        <div class="order-card-header">
          <div class="order-meta">
            <span class="order-id">${escH(offer.productName)}</span>
            <span class="order-date">${date}</span>
          </div>
          <span class="status-badge status-${offer.status}">${offerStatusLabel(offer.status)}</span>
        </div>
        <div class="offer-price-row">
          <div class="offer-price-block">
            <span class="offer-label">Listed Price</span>
            <span class="offer-original-price">₹${offer.originalPrice}</span>
          </div>
          <i class="fa-solid fa-arrow-right" style="color:var(--text-muted);align-self:center;"></i>
          <div class="offer-price-block">
            <span class="offer-label">Customer's Offer</span>
            <span class="offer-offered-price">₹${offer.offeredPrice}</span>
          </div>
          <div class="offer-price-block">
            <span class="offer-label">Discount</span>
            <span class="offer-discount">-₹${savings.toFixed(0)} (${pct}%)</span>
          </div>
        </div>
        <div class="offer-customer">
          <i class="fa-solid fa-user"></i> ${escH(offer.customerName)}
        </div>
        ${offer.status === 'pending' ? `
          <div class="order-actions">
            <button class="btn-accept" onclick="respondToOffer('${offer.id}','accepted')">
              <i class="fa-solid fa-check"></i> Accept Offer
            </button>
            <button class="btn-reject" onclick="respondToOffer('${offer.id}','rejected')">
              <i class="fa-solid fa-xmark"></i> Decline
            </button>
          </div>` : ''}
      </div>`;
  }).join('');
}

async function respondToOffer(offerId, status) {
  try {
    const res = await authFetch(`/api/offers/${offerId}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    if (!res) return;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await loadOffers();
    updateHeaderStats();
  } catch (err) { alert('Failed: ' + err.message); }
}

// ─── Shop Settings ────────────────────────────────────────────
function loadShopSettings() {
  const u = getUser();
  if (!u) return;
  document.getElementById('settingShopName').value = u.shopName || '';
  document.getElementById('settingShopAddress').value = u.shopAddress || '';
  const delivAvail = !!u.deliveryAvailable;
  document.getElementById('settingDeliveryAvailable').checked = delivAvail;
  document.getElementById('settingDeliveryCharge').value = u.deliveryCharge || 0;
  document.getElementById('deliveryChargeGroup').style.display = delivAvail ? '' : 'none';
  document.getElementById('deliveryToggleLabel').textContent = delivAvail ? 'Delivery available' : 'Delivery not available';
}

function setupDeliveryToggle() {
  const toggle = document.getElementById('settingDeliveryAvailable');
  toggle.addEventListener('change', () => {
    const on = toggle.checked;
    document.getElementById('deliveryChargeGroup').style.display = on ? '' : 'none';
    document.getElementById('deliveryToggleLabel').textContent = on ? 'Delivery available' : 'Delivery not available';
  });
}

document.getElementById('shopSettingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('settingsError');
  const successEl = document.getElementById('settingsSuccess');
  const btn = document.getElementById('settingsBtn');
  errEl.classList.add('hidden');
  successEl.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  try {
    const res = await authFetch('/api/auth/shop-profile', {
      method: 'PUT',
      body: JSON.stringify({
        shopName: document.getElementById('settingShopName').value,
        shopAddress: document.getElementById('settingShopAddress').value,
        deliveryAvailable: document.getElementById('settingDeliveryAvailable').checked,
        deliveryCharge: parseFloat(document.getElementById('settingDeliveryCharge').value) || 0
      })
    });
    if (!res) return;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // Update stored user object
    const stored = getUser();
    stored.shopName = data.shop.shopName;
    stored.shopAddress = data.shop.shopAddress;
    stored.deliveryAvailable = data.shop.deliveryAvailable;
    stored.deliveryCharge = data.shop.deliveryCharge;
    localStorage.setItem('nmo_user', JSON.stringify(stored));

    successEl.textContent = '✅ Shop settings saved!';
    successEl.classList.remove('hidden');
    setTimeout(() => successEl.classList.add('hidden'), 3000);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Save Settings</span><i class="fa-solid fa-check"></i>';
  }
});

// ─── Helpers ──────────────────────────────────────────────────
function escH(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function statusLabel(s) {
  const map = { pending: '⏳ Pending', accepted: '✅ Accepted', completed: '🎉 Completed', rejected: '❌ Rejected' };
  return map[s] || s;
}

function offerStatusLabel(s) {
  const map = { pending: '⏳ Pending', accepted: '✅ Accepted', rejected: '❌ Declined' };
  return map[s] || s;
}
