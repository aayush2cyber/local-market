/* ═══════════════════════════════════════════════════════════
   Nirjuli Market Online — Frontend Application (v2)
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof injectAuthNav === 'function') injectAuthNav();

  // ─── DOM References ──────────────────────────────────────
  const shopsGrid         = document.getElementById('shopsGrid');
  const searchInput       = document.getElementById('searchInput');
  const searchClear       = document.getElementById('searchClear');
  const categoryContainer = document.getElementById('categoryContainer');
  const shopCount         = document.getElementById('shopCount');
  const modal             = document.getElementById('shopModal');
  const closeModalBtn     = document.getElementById('closeModal');
  const modalOverlay      = document.getElementById('modalOverlay');
  const modalBody         = document.getElementById('modalBody');
  const cartOverlay       = document.getElementById('cartOverlay');
  const cartSidebar       = document.getElementById('cartSidebar');
  const cartItemsContainer = document.getElementById('cartItemsContainer');
  const closeCartBtn      = document.getElementById('closeCartBtn');
  const statShops         = document.getElementById('statShops');
  const statCategories    = document.getElementById('statCategories');

  // ─── State ───────────────────────────────────────────────
  let allShops = [];
  let allMarketProducts = [];
  let marketCart = JSON.parse(localStorage.getItem('nmo_cart') || '[]');
  let selectedDeliveryType = 'pickup';  // 'pickup' | 'delivery'
  let currentOfferProduct  = null;      // product being offered on

  // ─── Utility: Sanitize ───────────────────────────────────
  const sanitize = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  };

  const debounce = (fn, delay) => {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  };

  // ─── Particles ───────────────────────────────────────────
  const initParticles = () => {
    const container = document.getElementById('heroParticles');
    if (!container) return;
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left  = Math.random() * 100 + '%';
      p.style.top   = Math.random() * 100 + '%';
      p.style.animationDelay    = Math.random() * 6 + 's';
      p.style.animationDuration = 4 + Math.random() * 4 + 's';
      p.style.width = p.style.height = (2 + Math.random() * 3) + 'px';
      container.appendChild(p);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // MARKETPLACE PRODUCTS
  // ═══════════════════════════════════════════════════════════

  const loadMarketProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) return;
      allMarketProducts = await res.json();
      renderMarketProducts(allMarketProducts);
      updateFloatingCart();
    } catch (err) { console.error('Market products err:', err); }
  };

  const renderMarketProducts = (products) => {
    const grid = document.getElementById('marketProductsGrid');
    if (!grid) return;
    if (products.length === 0) {
      grid.innerHTML = '<div class="empty-state"><p>No products available yet. Check back soon!</p></div>';
      return;
    }
    grid.innerHTML = products.map(p => {
      const inCart = marketCart.find(c => c.productId === p.id);
      // Check if there are multiple sellers for price comparison
      const sameNameCount = products.filter(x => x.name.toLowerCase() === p.name.toLowerCase()).length;
      return `
        <div class="browse-product-card">
          ${p.image
            ? `<img src="${sanitize(p.image)}" alt="${sanitize(p.name)}" class="browse-product-img" loading="lazy">`
            : `<div class="browse-product-img-placeholder"><i class="fa-solid fa-image"></i></div>`}
          <div class="browse-product-info">
            <div class="browse-product-category">${sanitize(p.category)}</div>
            <div class="browse-product-name">${sanitize(p.name)}</div>
            <div class="browse-product-seller"><i class="fa-solid fa-store"></i> ${sanitize(p.shopkeeperName || 'Shop')}</div>
            <div class="browse-product-footer">
              <span class="browse-product-price">₹${p.price}</span>
              ${inCart
                ? `<div class="cart-controls" style="margin-top:0;">
                    <button onclick="window.__mUpdateQty('${p.id}',-1)"><i class="fa-solid fa-minus"></i></button>
                    <span>${inCart.quantity}</span>
                    <button onclick="window.__mUpdateQty('${p.id}',1)"><i class="fa-solid fa-plus"></i></button>
                  </div>`
                : `<button class="browse-add-btn" onclick="window.__mAddToCart('${p.id}')" title="Add to cart"><i class="fa-solid fa-plus"></i></button>`}
            </div>
            <div class="browse-product-card-actions">
              <button class="browse-offer-btn" onclick="window.__openOfferModal('${p.id}')">
                <i class="fa-solid fa-handshake"></i> Offer
              </button>
              ${sameNameCount > 1 ? `
                <button class="compare-btn-inline" onclick="window.__openCompareModal('${sanitize(p.name)}')">
                  <i class="fa-solid fa-scale-balanced"></i> Compare
                </button>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');
  };

  // ─── Cart Actions ─────────────────────────────────────────
  window.__mAddToCart = (productId) => {
    const product = allMarketProducts.find(p => p.id === productId);
    if (!product) return;
    const existing = marketCart.find(c => c.productId === productId);
    if (!existing) {
      marketCart.push({
        productId,
        name: product.name,
        price: product.price,
        image: product.image || '',
        quantity: 1,
        shopkeeperId: product.shopkeeperId
      });
    }
    saveMarketCart();
    renderMarketProducts(allMarketProducts);
    updateFloatingCart();
  };

  window.__mUpdateQty = (productId, change) => {
    const item = marketCart.find(c => c.productId === productId);
    if (!item) return;
    item.quantity += change;
    if (item.quantity <= 0) marketCart = marketCart.filter(c => c.productId !== productId);
    saveMarketCart();
    renderMarketProducts(allMarketProducts);
    updateFloatingCart();
  };

  const saveMarketCart = () => localStorage.setItem('nmo_cart', JSON.stringify(marketCart));

  const updateFloatingCart = () => {
    const fab      = document.getElementById('floatingCart');
    const itemsEl  = document.getElementById('floatingCartItems');
    const totalEl  = document.getElementById('floatingCartTotal');
    const total    = marketCart.reduce((s, i) => s + i.price * i.quantity, 0);
    const count    = marketCart.reduce((s, i) => s + i.quantity, 0);
    if (count > 0) {
      fab.classList.add('visible');
      fab.onclick = () => openCheckout();
      itemsEl.textContent = `${count} item${count > 1 ? 's' : ''}`;
      totalEl.textContent = `₹${total}`;
    } else {
      fab.classList.remove('visible');
    }
  };

  // ─── Cart Sidebar ─────────────────────────────────────────
  window.__openCart = () => {
    cartOverlay.classList.remove('hidden');
    cartSidebar.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderCartSidebar();
  };

  const closeCart = () => {
    cartOverlay.classList.add('hidden');
    cartSidebar.classList.add('hidden');
    document.body.style.overflow = '';
  };

  if (closeCartBtn)  closeCartBtn.addEventListener('click', closeCart);
  if (cartOverlay)   cartOverlay.addEventListener('click', closeCart);

  const renderCartSidebar = () => {
    const cartOptions = document.getElementById('cartOptions');
    if (marketCart.length === 0) {
      cartItemsContainer.innerHTML = `<div class="empty-cart-msg"><i class="fa-solid fa-cart-arrow-down"></i><p>Your cart is empty.</p></div>`;
      if (cartOptions) cartOptions.style.display = 'none';
      const btn = document.getElementById('checkoutBtnMain');
      if (btn) btn.disabled = true;
      return;
    }

    cartItemsContainer.innerHTML = marketCart.map(item => `
      <div class="cart-item">
        ${item.image ? `<img src="${sanitize(item.image)}" alt="${sanitize(item.name)}">` : '<div style="width:44px;height:44px;background:rgba(255,255,255,0.05);border-radius:8px;"></div>'}
        <div class="cart-item-info">
          <div class="cart-item-name">${sanitize(item.name)}</div>
          <div class="cart-item-price">₹${item.price}</div>
          <div class="cart-item-actions">
            <div class="cart-qty-ctrl">
              <button onclick="window.__mUpdateQty('${item.productId}',-1);renderCartSidebar()"><i class="fa-solid fa-minus"></i></button>
              <span>${item.quantity}</span>
              <button onclick="window.__mUpdateQty('${item.productId}',1);renderCartSidebar()"><i class="fa-solid fa-plus"></i></button>
            </div>
            <button class="cart-remove-btn" onclick="window.__mUpdateQty('${item.productId}',-${item.quantity});renderCartSidebar()"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>`).join('');

    if (cartOptions) cartOptions.style.display = 'block';
    updateCartBill();
    const btn = document.getElementById('checkoutBtnMain');
    if (btn) btn.disabled = false;
  };

  const updateCartBill = () => {
    const itemTotal = marketCart.reduce((s, i) => s + i.price * i.quantity, 0);
    const billSubtotal = document.getElementById('billSubtotal');
    const billDelivery = document.getElementById('billDelivery');
    const billTotal    = document.getElementById('billTotal');
    if (billSubtotal) billSubtotal.textContent = `₹${itemTotal}`;
    if (billDelivery) billDelivery.textContent  = `₹0`;
    if (billTotal)    billTotal.textContent      = `₹${itemTotal}`;
  };

  // ─── Checkout Modal & Delivery Choice ─────────────────────
  const openCheckout = () => {
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
      const user = getUser();
      if (user.role !== 'customer') {
        alert('Only customers can place orders. Please log in as a customer.');
        return;
      }
      const nameInput = document.getElementById('checkoutName');
      if (nameInput && !nameInput.value) nameInput.value = user.name;
    } else {
      if (confirm('You need to log in as a customer to place orders. Go to login?')) {
        window.location.href = '/login.html';
      }
      return;
    }
    document.getElementById('checkoutModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    selectDelivery('pickup');
  };

  window.selectDelivery = (type) => {
    selectedDeliveryType = type;
    document.getElementById('choicePickup').classList.toggle('active', type === 'pickup');
    document.getElementById('choiceDelivery').classList.toggle('active', type === 'delivery');

    const addressGroup   = document.getElementById('addressGroup');
    const addressInput   = document.getElementById('checkoutAddress');
    const chargeNote     = document.getElementById('deliveryChargeNote');

    if (type === 'pickup') {
      addressGroup.style.display = 'none';
      if (addressInput) addressInput.required = false;
      if (chargeNote) chargeNote.classList.add('hidden');
    } else {
      addressGroup.style.display = '';
      if (addressInput) addressInput.required = true;
      if (chargeNote) {
        chargeNote.classList.remove('hidden');
        chargeNote.textContent = 'Delivery charge will be applied by the shopkeeper.';
      }
    }
  };

  const closeCheckout = () => {
    document.getElementById('checkoutModal').classList.add('hidden');
    document.body.style.overflow = '';
  };

  document.getElementById('closeCheckoutBtn')?.addEventListener('click', closeCheckout);
  document.getElementById('checkoutModalOverlay')?.addEventListener('click', closeCheckout);

  const checkoutBtnMain = document.getElementById('checkoutBtnMain');
  if (checkoutBtnMain) {
    checkoutBtnMain.addEventListener('click', () => {
      openCheckout();
    });
  }

  // ─── Checkout Form Submit ─────────────────────────────────
  const checkoutFormEl = document.getElementById('checkoutForm');
  if (checkoutFormEl) {
    checkoutFormEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (marketCart.length === 0) return;

      const name    = document.getElementById('checkoutName').value;
      const phone   = document.getElementById('checkoutPhone').value;
      const address = selectedDeliveryType === 'delivery'
        ? (document.getElementById('checkoutAddress').value || '')
        : '';
      const notes   = document.getElementById('checkoutNotes').value;

      if (selectedDeliveryType === 'delivery' && !address.trim()) {
        alert('Please enter a delivery address.');
        return;
      }

      const submitBtn = checkoutFormEl.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Placing Order...';

      try {
        const res = await authFetch('/api/orders', {
          method: 'POST',
          body: JSON.stringify({
            items: marketCart.map(i => ({ productId: i.productId, quantity: i.quantity })),
            address,
            phone,
            name,
            notes,
            deliveryType: selectedDeliveryType
          })
        });
        if (!res) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Place Order'; return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // Clear cart
        marketCart = [];
        saveMarketCart();
        renderMarketProducts(allMarketProducts);
        updateFloatingCart();
        closeCheckout();
        checkoutFormEl.reset();
        selectedDeliveryType = 'pickup';

        alert(`🎉 Order placed successfully! Track it in your dashboard.\n\nOrder ID: #${data.order.id.slice(0,8).toUpperCase()}`);
      } catch (err) {
        alert('Order failed: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Place Order';
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // MAKE OFFER MODAL
  // ═══════════════════════════════════════════════════════════

  window.__openOfferModal = (productId) => {
    const product = allMarketProducts.find(p => p.id === productId);
    if (!product) return;

    if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
      if (confirm('You need to log in as a customer to make offers. Go to login?')) {
        window.location.href = '/login.html';
      }
      return;
    }
    const user = getUser();
    if (user && user.role !== 'customer') {
      alert('Only customers can make offers.');
      return;
    }

    currentOfferProduct = product;

    // Populate modal
    const infoEl = document.getElementById('offerModalProductInfo');
    infoEl.innerHTML = `
      ${product.image ? `<img src="${sanitize(product.image)}" alt="${sanitize(product.name)}">` : ''}
      <div class="offer-modal-product-info">
        <span class="offer-modal-product-name">${sanitize(product.name)}</span>
        <span class="offer-modal-listed-price">Listed at <strong>₹${product.price}</strong> • ${sanitize(product.shopkeeperName || 'Shop')}</span>
      </div>`;

    const input = document.getElementById('offerPriceInput');
    input.value = '';
    input.max = product.price - 1;

    document.getElementById('offerError').classList.add('hidden');
    document.getElementById('offerSuccess').classList.add('hidden');
    document.getElementById('submitOfferBtn').disabled = false;
    document.getElementById('submitOfferBtn').innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Offer';
    document.getElementById('offerModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => input.focus(), 100);
  };

  const closeOfferModal = () => {
    document.getElementById('offerModal').classList.add('hidden');
    document.body.style.overflow = '';
    currentOfferProduct = null;
  };

  document.getElementById('closeOfferModalBtn')?.addEventListener('click', closeOfferModal);
  document.getElementById('offerModalOverlay')?.addEventListener('click', closeOfferModal);

  document.getElementById('submitOfferBtn')?.addEventListener('click', async () => {
    if (!currentOfferProduct) return;
    const errEl     = document.getElementById('offerError');
    const successEl = document.getElementById('offerSuccess');
    const btn       = document.getElementById('submitOfferBtn');
    const price     = parseFloat(document.getElementById('offerPriceInput').value);

    errEl.classList.add('hidden');
    successEl.classList.add('hidden');

    if (!price || price <= 0) {
      errEl.textContent = 'Please enter a valid offer price.';
      errEl.classList.remove('hidden');
      return;
    }
    if (price >= currentOfferProduct.price) {
      errEl.textContent = `Your offer must be less than the listed price of ₹${currentOfferProduct.price}.`;
      errEl.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

    try {
      const res = await authFetch('/api/offers', {
        method: 'POST',
        body: JSON.stringify({ productId: currentOfferProduct.id, offeredPrice: price })
      });
      if (!res) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Offer'; return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      successEl.textContent = '✅ Offer sent! The shopkeeper will respond soon.';
      successEl.classList.remove('hidden');
      btn.innerHTML = '✅ Sent!';
      setTimeout(closeOfferModal, 2200);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Offer';
    }
  });

  // ═══════════════════════════════════════════════════════════
  // PRICE COMPARISON MODAL
  // ═══════════════════════════════════════════════════════════

  window.__openCompareModal = (productName) => {
    document.getElementById('compareModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const body = document.getElementById('compareModalBody');
    body.innerHTML = '<div class="loading-spinner"></div>';

    // Find all products with matching name
    const matches = allMarketProducts.filter(
      p => p.name.toLowerCase() === productName.toLowerCase()
    ).sort((a, b) => a.price - b.price);

    if (matches.length === 0) {
      body.innerHTML = '<p style="color:var(--text-muted);text-align:center;">No comparisons found.</p>';
      return;
    }

    const minPrice = matches[0].price;

    body.innerHTML = `
      <div class="compare-modal-product-name">
        <i class="fa-solid fa-box"></i> ${sanitize(productName)}
        <span style="font-size:0.8rem;color:var(--text-muted);font-weight:400;margin-left:8px;">${matches.length} shops</span>
      </div>
      <div class="compare-list">
        ${matches.map(p => {
          const isBest = p.price === minPrice;
          const savings = isBest ? 0 : p.price - minPrice;
          return `
            <div class="compare-item ${isBest ? 'best-price' : ''}">
              <div class="compare-item-shop">
                <span class="compare-item-shop-name">
                  <i class="fa-solid fa-store" style="color:var(--secondary);margin-right:5px;"></i>
                  ${sanitize(p.shopkeeperName || 'Shop')}
                </span>
                <span class="compare-item-meta">${sanitize(p.category)}</span>
              </div>
              <div class="compare-item-right">
                <span class="compare-item-price">₹${p.price}</span>
                ${isBest ? '<span class="best-badge">✨ Best Price</span>' : `<span style="font-size:0.75rem;color:var(--text-muted);">+₹${savings} more</span>`}
                <button class="browse-add-btn" style="padding:5px 12px;font-size:0.8rem;margin:0;border-radius:6px;" onclick="window.__mAddToCart('${p.id}');closeCompareModal()">
                  <i class="fa-solid fa-plus"></i> Add
                </button>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  };

  window.closeCompareModal = () => {
    document.getElementById('compareModal').classList.add('hidden');
    document.body.style.overflow = '';
  };
  document.getElementById('closeCompareModalBtn')?.addEventListener('click', window.closeCompareModal);
  document.getElementById('compareModalOverlay')?.addEventListener('click', window.closeCompareModal);

  // ═══════════════════════════════════════════════════════════
  // SHOP DIRECTORY (LEGACY — database.json shops)
  // ═══════════════════════════════════════════════════════════

  const categoryIcons = { Grocery:'🛒', Electronics:'📱', Clothing:'👗', Books:'📚', Hardware:'🔧' };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const categories = await res.json();
      if (statCategories) statCategories.querySelector('.stat-number').textContent = categories.length;
      categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-chip';
        btn.dataset.category = cat;
        btn.innerHTML = `${categoryIcons[cat] || '📦'} ${cat}`;
        categoryContainer.appendChild(btn);
      });
    } catch (err) { console.error('Failed to load categories:', err); }
  };

  const fetchShops = async () => {
    try {
      shopsGrid.innerHTML = '<div class="loading-spinner"></div>';
      const res = await fetch('/api/shops');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      allShops = await res.json();
      if (statShops) statShops.querySelector('.stat-number').textContent = allShops.length;
      renderShops(allShops);
    } catch (err) {
      console.error('Failed to load shops:', err);
      shopsGrid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load shops. Please refresh.</p></div>`;
    }
  };

  const renderShops = (shops) => {
    if (shopCount) shopCount.textContent = `${shops.length} shop${shops.length !== 1 ? 's' : ''}`;
    if (shops.length === 0) {
      shopsGrid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-store-slash"></i><p>No shops found.</p></div>`;
      return;
    }
    shopsGrid.innerHTML = shops.map(shop => `
      <div class="shop-card glass-card" onclick="window.__openModal(${Number(shop.id)})" role="button" tabindex="0">
        <div class="shop-img-wrapper">
          <img src="${sanitize(shop.image)}" alt="${sanitize(shop.name)}" loading="lazy"
               onerror="this.src='assets/placeholder-shop.svg';this.onerror=null;">
          <div class="shop-img-overlay"></div>
          <div class="shop-rating"><i class="fa-solid fa-star"></i> ${sanitize(String(shop.rating))}</div>
        </div>
        <div class="shop-info">
          <div class="shop-category">${sanitize(shop.category)}</div>
          <h2 class="shop-name">${sanitize(shop.name)}</h2>
          <p class="shop-desc">${sanitize(shop.description)}</p>
          <div class="shop-card-footer">
            <button class="view-btn">View <i class="fa-solid fa-arrow-right"></i></button>
          </div>
        </div>
      </div>`).join('');
  };

  // ─── Filter Logic ─────────────────────────────────────────
  const applyFilters = () => {
    const term = searchInput.value.toLowerCase().trim();
    const activeChip = document.querySelector('.category-chip.active');
    const category   = activeChip ? activeChip.dataset.category.toLowerCase() : '';

    let filtered = allShops;
    if (category) filtered = filtered.filter(s => s.category.toLowerCase() === category);
    if (term)     filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term) ||
      s.category.toLowerCase().includes(term)
    );
    renderShops(filtered);

    // Also filter marketplace products
    const mpFiltered = allMarketProducts.filter(p =>
      (!term || p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)) &&
      (!category || p.category.toLowerCase() === category)
    );
    renderMarketProducts(mpFiltered);
  };

  const debouncedFilter = debounce(applyFilters, 300);

  searchInput.addEventListener('input', () => {
    searchClear.style.display = searchInput.value ? 'inline' : 'none';
    debouncedFilter();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.style.display = 'none';
    applyFilters();
    searchInput.focus();
  });

  categoryContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.category-chip');
    if (!chip) return;
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    applyFilters();
  });

  // ─── Shop Modal (directory) ───────────────────────────────
  window.__openModal = async (shopId) => {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    modalBody.innerHTML = '<div class="loading-spinner"></div>';

    try {
      const res  = await fetch(`/api/shops/${shopId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const shop = await res.json();

      const productsHtml = shop.products && shop.products.length > 0
        ? shop.products.map(p => `
            <div class="product-card">
              <img src="${sanitize(p.image)}" alt="${sanitize(p.name)}" class="product-img" loading="lazy"
                   onerror="this.src='assets/placeholder-shop.svg';this.onerror=null;">
              <div class="product-info">
                <div class="product-name">${sanitize(p.name)}</div>
                <div class="product-price-row">
                  <div class="product-price">₹${sanitize(String(p.price))}</div>
                  <div class="product-unit">${sanitize(p.unit)}</div>
                </div>
              </div>
            </div>`).join('')
        : '<p style="color:var(--text-dim)">No products listed yet.</p>';

      modalBody.innerHTML = `
        <img src="${sanitize(shop.image)}" alt="${sanitize(shop.name)}" class="modal-banner"
             onerror="this.src='assets/placeholder-shop.svg';this.onerror=null;">
        <div class="modal-details">
          <div class="modal-category">${sanitize(shop.category)}</div>
          <h2 class="modal-title">${sanitize(shop.name)}</h2>
          <div class="modal-address"><i class="fa-solid fa-location-dot"></i><span>${sanitize(shop.address)}</span></div>
          <p class="modal-desc">${sanitize(shop.description)}</p>
          <div class="modal-actions">
            <a href="https://wa.me/${sanitize(shop.phone)}?text=${encodeURIComponent(`Hi ${shop.name}, I found you on Nirjuli Market Online. I have an inquiry.`)}"
               target="_blank" rel="noopener" class="whatsapp-btn">
              <i class="fa-brands fa-whatsapp"></i> WhatsApp
            </a>
            <a href="tel:+${sanitize(shop.phone)}" class="call-btn">
              <i class="fa-solid fa-phone"></i> Call
            </a>
          </div>
          <div class="products-section">
            <h4>Featured Products</h4>
            <div class="products-grid">${productsHtml}</div>
          </div>
        </div>`;
    } catch (err) {
      modalBody.innerHTML = `<div class="empty-state" style="padding:40px;">
        <i class="fa-solid fa-triangle-exclamation"></i><p>Could not load shop details.</p>
      </div>`;
    }
  };

  const closeModal = () => { modal.classList.add('hidden'); document.body.style.overflow = ''; };
  closeModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!modal.classList.contains('hidden'))        closeModal();
      if (!document.getElementById('offerModal').classList.contains('hidden'))   closeOfferModal();
      if (!document.getElementById('compareModal').classList.contains('hidden'))  window.closeCompareModal();
      if (!document.getElementById('checkoutModal').classList.contains('hidden')) closeCheckout();
    }
  });

  // ─── Initialize ───────────────────────────────────────────
  initParticles();
  fetchCategories();
  fetchShops();
  loadMarketProducts();
});
