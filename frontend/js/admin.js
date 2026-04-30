/**
 * admin.js — Admin dashboard: Users, Products, Orders, Offers
 */

if (!requireAuth(['admin'])) { /* redirect happens inside requireAuth */ }

let allUsers = [], allAdminProducts = [], allAdminOrders = [], allAdminOffers = [];
let revenueChart, statusChart;

document.addEventListener('DOMContentLoaded', () => {
  injectAuthNav();
  loadAnalytics();
  loadUsers();
  loadAdminProducts();
  loadAdminOrders();
  loadAdminOffers();
});

// ─── Tab Navigation ───────────────────────────────────────────
function switchAdminTab(name) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.add('hidden'));
  event.currentTarget.classList.add('active');
  document.getElementById(`panel-${name}`).classList.remove('hidden');
}

// ─── Analytics ────────────────────────────────────────────────
async function loadAnalytics() {
  try {
    const res = await authFetch('/api/admin/analytics');
    if (!res) return;
    const data = await res.json();

    document.getElementById('statUsers').textContent = data.users.total;
    document.getElementById('statShops').textContent = data.users.shopkeepers;
    document.getElementById('statProducts').textContent = data.products.total;
    document.getElementById('statOrders').textContent = data.orders.total;
    document.getElementById('statRevenue').textContent = `₹${data.revenue.total}`;

    renderRevenueChart(data.last7Days);
    renderStatusChart(data.orders);
  } catch (err) { console.error('Analytics error:', err); }
}

function renderRevenueChart(days) {
  const ctx = document.getElementById('revenueChart');
  if (!ctx) return;
  if (revenueChart) revenueChart.destroy();
  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days.map(d => {
        const dt = new Date(d.date);
        return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }),
      datasets: [{
        label: 'Revenue (₹)',
        data: days.map(d => d.revenue),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102,126,234,0.15)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#667eea',
        pointRadius: 5
      }, {
        label: 'Orders',
        data: days.map(d => d.orders),
        borderColor: '#43e97b',
        backgroundColor: 'rgba(67,233,123,0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#43e97b',
        pointRadius: 4,
        yAxisID: 'y1'
      }]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#e2e8f0' } } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8', callback: v => `₹${v}` }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y1: { position: 'right', ticks: { color: '#94a3b8' }, grid: { display: false } }
      }
    }
  });
}

function renderStatusChart(orders) {
  const ctx = document.getElementById('statusChart');
  if (!ctx) return;
  if (statusChart) statusChart.destroy();
  statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'Accepted', 'Completed', 'Rejected'],
      datasets: [{
        data: [orders.pending, orders.accepted || 0, orders.completed, orders.rejected || 0],
        backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#e2e8f0', padding: 16 } }
      }
    }
  });
}

// ─── Users ────────────────────────────────────────────────────
async function loadUsers() {
  try {
    const res = await authFetch('/api/admin/users');
    if (!res) return;
    allUsers = await res.json();
    renderUsers(allUsers);
  } catch (err) { console.error('Load users error:', err); }
}

function renderUsers(users) {
  const tbody = document.getElementById('usersBody');
  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No users found.</td></tr>`;
    return;
  }
  const me = getUser();
  tbody.innerHTML = users.map(u => {
    const date = new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const roleColor = { admin: '#f59e0b', shopkeeper: '#3b82f6', customer: '#10b981' }[u.role] || '#64748b';
    
    let statusHtml = '<span style="color:var(--text-muted);">-</span>';
    if (u.role === 'shopkeeper') {
      if (u.isApproved === false) {
        statusHtml = `<span class="status-badge" style="background:#f59e0b20;color:#f59e0b;">Pending</span>`;
      } else {
        statusHtml = `<span class="status-badge" style="background:#10b98120;color:#10b981;">Approved</span>`;
      }
    }

    return `<tr>
      <td><strong>${escH(u.name)}</strong></td>
      <td style="color:var(--text-muted);font-size:0.9rem;">${escH(u.email)}</td>
      <td><span class="role-badge" style="background:${roleColor}20;color:${roleColor};">${u.role}</span></td>
      <td>${statusHtml}</td>
      <td style="color:var(--text-muted);font-size:0.9rem;">${date}</td>
      <td class="actions-cell">
        ${u.role === 'shopkeeper' && u.isApproved === false ? `<button class="btn-icon" style="color:#10b981;" title="Approve shopkeeper" onclick="approveUser('${u.id}','${escH(u.name)}')"><i class="fa-solid fa-check"></i></button>` : ''}
        ${u.id !== me.id ? `<button class="btn-icon btn-delete" title="Delete user" onclick="deleteUser('${u.id}','${escH(u.name)}')"><i class="fa-solid fa-trash"></i></button>` : '<span style="color:var(--text-muted);font-size:0.8rem;">You</span>'}
      </td>
    </tr>`;
  }).join('');
}

function filterUsers() {
  const term = document.getElementById('userSearch').value.toLowerCase();
  renderUsers(allUsers.filter(u =>
    u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || u.role.toLowerCase().includes(term)
  ));
}

async function deleteUser(id, name) {
  if (!confirm(`Delete user "${name}"? This will also remove their products.`)) return;
  try {
    const res = await authFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (!res) return;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await loadUsers();
    await loadAdminProducts();
    await loadAnalytics();
  } catch (err) { alert('Failed: ' + err.message); }
}

async function approveUser(id, name) {
  if (!confirm(`Approve shopkeeper "${name}"? They will now be able to log in.`)) return;
  try {
    const res = await authFetch(`/api/admin/users/${id}/approve`, { method: 'PUT' });
    if (!res) return;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await loadUsers();
  } catch (err) { alert('Failed: ' + err.message); }
}

// ─── Products ─────────────────────────────────────────────────
async function loadAdminProducts() {
  try {
    const res = await authFetch('/api/admin/products');
    if (!res) return;
    allAdminProducts = await res.json();
    renderAdminProducts(allAdminProducts);
  } catch (err) { console.error('Load products error:', err); }
}

function renderAdminProducts(products) {
  const tbody = document.getElementById('adminProductsBody');
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No products found.</td></tr>`;
    return;
  }
  tbody.innerHTML = products.map(p => `<tr>
    <td>${p.image ? `<img src="${escH(p.image)}" alt="${escH(p.name)}" class="table-product-img">` : `<div class="table-product-img-placeholder"><i class="fa-solid fa-image"></i></div>`}</td>
    <td><strong>${escH(p.name)}</strong></td>
    <td><span class="category-badge">${escH(p.category)}</span></td>
    <td class="price-cell">₹${p.price}</td>
    <td style="color:var(--text-muted);font-size:0.9rem;">${escH(p.shopkeeperName)}</td>
    <td class="actions-cell">
      <button class="btn-icon btn-delete" title="Delete" onclick="deleteAdminProduct('${p.id}')"><i class="fa-solid fa-trash"></i></button>
    </td>
  </tr>`).join('');
}

function filterAdminProducts() {
  const term = document.getElementById('adminProductSearch').value.toLowerCase();
  renderAdminProducts(allAdminProducts.filter(p =>
    p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term) || (p.shopkeeperName || '').toLowerCase().includes(term)
  ));
}

async function deleteAdminProduct(id) {
  if (!confirm('Delete this product?')) return;
  try {
    const res = await authFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (!res) return;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await loadAdminProducts();
  } catch (err) { alert('Failed: ' + err.message); }
}

// ─── Orders ───────────────────────────────────────────────────
async function loadAdminOrders() {
  try {
    const res = await authFetch('/api/admin/orders');
    if (!res) return;
    allAdminOrders = await res.json();
    renderAdminOrders(allAdminOrders);
  } catch (err) { console.error('Load orders error:', err); }
}

function filterAdminOrders() {
  const filter = document.getElementById('adminOrderFilter').value;
  renderAdminOrders(filter ? allAdminOrders.filter(o => o.status === filter) : allAdminOrders);
}

function renderAdminOrders(orders) {
  const tbody = document.getElementById('adminOrdersBody');
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">No orders found.</td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map(o => {
    const date = new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const delivIcon = o.deliveryType === 'pickup' ? '🚶' : '🚚';
    const statusColor = { pending: '#f59e0b', accepted: '#3b82f6', completed: '#10b981', rejected: '#ef4444' }[o.status] || '#64748b';
    return `<tr>
      <td style="font-family:monospace;font-size:0.8rem;">${o.id.slice(0,8).toUpperCase()}</td>
      <td><strong>${escH(o.customerName)}</strong><div style="font-size:0.78rem;color:var(--text-muted);">${escH(o.phone||'')}</div></td>
      <td>${o.items.length} item${o.items.length !== 1 ? 's' : ''}</td>
      <td class="price-cell">₹${o.total}</td>
      <td>${delivIcon} ${o.deliveryType === 'pickup' ? 'Pickup' : 'Delivery'}</td>
      <td><span class="status-badge" style="background:${statusColor}20;color:${statusColor};">${capFirst(o.status)}</span></td>
      <td style="color:var(--text-muted);font-size:0.85rem;">${date}</td>
      <td class="actions-cell">
        <select class="dash-select-sm" onchange="updateAdminOrderStatus('${o.id}', this.value)" title="Update status">
          <option value="">Update</option>
          <option value="pending" ${o.status==='pending'?'selected':''}>Pending</option>
          <option value="accepted" ${o.status==='accepted'?'selected':''}>Accepted</option>
          <option value="completed" ${o.status==='completed'?'selected':''}>Completed</option>
          <option value="rejected" ${o.status==='rejected'?'selected':''}>Rejected</option>
        </select>
      </td>
    </tr>`;
  }).join('');
}

async function updateAdminOrderStatus(orderId, status) {
  if (!status) return;
  try {
    const res = await authFetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    if (!res) return;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await loadAdminOrders();
    await loadAnalytics();
  } catch (err) { alert('Failed: ' + err.message); }
}

// ─── Offers ───────────────────────────────────────────────────
async function loadAdminOffers() {
  try {
    const res = await authFetch('/api/admin/offers');
    if (!res) return;
    allAdminOffers = await res.json();
    renderAdminOffers(allAdminOffers);
  } catch (err) { console.error('Load offers error:', err); }
}

function renderAdminOffers(offers) {
  const tbody = document.getElementById('adminOffersBody');
  if (offers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No offers yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = offers.map(o => {
    const date = new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const savings = o.originalPrice - o.offeredPrice;
    const pct = Math.round((savings / o.originalPrice) * 100);
    const statusColor = { pending: '#f59e0b', accepted: '#10b981', rejected: '#ef4444' }[o.status] || '#64748b';
    return `<tr>
      <td><strong>${escH(o.productName)}</strong></td>
      <td>${escH(o.customerName)}</td>
      <td class="price-cell">₹${o.originalPrice}</td>
      <td class="price-cell" style="color:#43e97b;">₹${o.offeredPrice}</td>
      <td style="color:#f59e0b;">-${pct}%</td>
      <td><span class="status-badge" style="background:${statusColor}20;color:${statusColor};">${capFirst(o.status)}</span></td>
      <td style="color:var(--text-muted);font-size:0.85rem;">${date}</td>
    </tr>`;
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
