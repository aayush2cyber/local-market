/**
 * auth.js — Shared authentication utilities for all frontend pages.
 * Handles token storage, user state, and API helpers.
 */

const API_BASE = window.location.origin;

/** Get stored JWT token */
function getToken() {
  return localStorage.getItem('nmo_token');
}

/** Get stored user object */
function getUser() {
  try {
    const raw = localStorage.getItem('nmo_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Check if logged in */
function isLoggedIn() {
  return !!getToken();
}

/** Save auth data after login/signup */
function saveAuth(token, user) {
  localStorage.setItem('nmo_token', token);
  localStorage.setItem('nmo_user', JSON.stringify(user));
}

/** Logout and redirect to home */
function logout() {
  localStorage.removeItem('nmo_token');
  localStorage.removeItem('nmo_user');
  window.location.href = '/';
}

/**
 * Authenticated fetch wrapper — automatically adds JWT header.
 */
async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Only set Content-Type for non-FormData bodies
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  // Auto-logout on 401
  if (res.status === 401) {
    logout();
    return null;
  }
  return res;
}

/**
 * Redirect user based on role after login.
 */
function redirectByRole(role) {
  switch (role) {
    case 'admin': window.location.href = '/admin.html'; break;
    case 'shopkeeper': window.location.href = '/shopkeeper.html'; break;
    default: window.location.href = '/'; break;
  }
}

/**
 * Guard a page — redirect if not logged in or wrong role.
 */
function requireAuth(allowedRoles = []) {
  if (!isLoggedIn()) {
    window.location.href = '/login.html';
    return false;
  }
  const user = getUser();
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    window.location.href = '/';
    return false;
  }
  return true;
}

/**
 * Inject auth-aware navbar buttons (login/profile) into any page.
 * Looks for an element with class "nav-links" to append to.
 */
function injectAuthNav() {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;

  if (isLoggedIn()) {
    const user = getUser();
    // Dashboard link
    let dashLink = '/';
    if (user.role === 'shopkeeper') dashLink = '/shopkeeper.html';
    if (user.role === 'admin') dashLink = '/admin.html';
    if (user.role === 'customer') dashLink = '/customer.html';

    const dashEl = document.createElement('a');
    dashEl.href = dashLink;
    dashEl.className = 'nav-link';
    dashEl.innerHTML = '<i class="fa-solid fa-gauge"></i> Dashboard';
    navLinks.appendChild(dashEl);

    const profileEl = document.createElement('div');
    profileEl.className = 'nav-profile';
    profileEl.innerHTML = `
      <button class="nav-profile-btn" id="navProfileBtn">
        <span class="nav-avatar">${user.name.charAt(0).toUpperCase()}</span>
        <span class="nav-username">${user.name}</span>
        <i class="fa-solid fa-chevron-down"></i>
      </button>
      <div class="nav-dropdown hidden" id="navDropdown">
        <div class="nav-dropdown-header">
          <strong>${user.name}</strong>
          <small>${user.email}</small>
          <span class="nav-role-badge">${user.role}</span>
        </div>
        <a href="${dashLink}"><i class="fa-solid fa-gauge"></i> Dashboard</a>
        ${user.role === 'customer' ? '<a href="/customer.html"><i class="fa-solid fa-clock-rotate-left"></i> My Orders</a>' : ''}
        <button onclick="logout()" class="nav-dropdown-logout"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
      </div>
    `;
    navLinks.appendChild(profileEl);

    // Toggle dropdown
    const btn = document.getElementById('navProfileBtn');
    const dropdown = document.getElementById('navDropdown');
    if (btn && dropdown) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
      });
      document.addEventListener('click', () => dropdown.classList.add('hidden'));
    }
  } else {
    const loginEl = document.createElement('a');
    loginEl.href = '/login.html';
    loginEl.className = 'nav-link nav-login-btn';
    loginEl.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Login';
    navLinks.appendChild(loginEl);
  }
}

// Make logout available globally for onclick handlers
window.logout = logout;
