/* ═══════════════════════════════════════════════════════════
   Nirjuli Market Online — Frontend Application
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // ─── DOM References ──────────────────────────────────────
  const shopsGrid       = document.getElementById('shopsGrid');
  const searchInput     = document.getElementById('searchInput');
  const searchClear     = document.getElementById('searchClear');
  const categoryContainer = document.getElementById('categoryContainer');
  const shopCount       = document.getElementById('shopCount');
  const modal           = document.getElementById('shopModal');
  const closeModalBtn   = document.getElementById('closeModal');
  const modalOverlay    = document.getElementById('modalOverlay');
  const modalBody       = document.getElementById('modalBody');

  // Cart DOM References
  const cartOverlay         = document.getElementById('cartOverlay');
  const cartSidebar         = document.getElementById('cartSidebar');
  const cartItemsContainer  = document.getElementById('cartItemsContainer');
  const cartSidebarSubtotal = document.getElementById('cartSidebarSubtotal');
  const closeCartBtn        = document.getElementById('closeCartBtn');
  const checkoutBtn         = document.querySelector('.checkout-btn');

  // Hero stat elements
  const statShops      = document.getElementById('statShops');
  const statCategories = document.getElementById('statCategories');

  let allShops = [];
  let cart = []; // Cart State
  
  // ─── Business Logic ──────────────────────────────────────
  let appliedPromo = null;
  const MIN_ORDER_VALUE = 99;
  const PLATFORM_FEE = 5;

  // Category emoji map
  const categoryIcons = {
    Grocery:     '🛒',
    Electronics: '📱',
    Clothing:    '👗',
    Books:       '📚',
    Hardware:    '🔧',
  };

  // ─── Utility: Debounce ───────────────────────────────────
  const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  // ─── Utility: Sanitize HTML ──────────────────────────────
  // Prevents XSS by escaping user-controlled strings before innerHTML
  const sanitize = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  };

  // ─── Cart Logic ──────────────────────────────────────────
  window.__addToCart = (shopId, productId, name, price, img) => {
    // Enforce Single Shop Cart Policy (Business Analyst improvement)
    if (cart.length > 0 && cart[0].shopId !== shopId) {
      if (!confirm("Your cart contains items from another shop. Do you want to clear your cart and start a new order with this shop?")) return;
      cart = [];
    }
    
    const existing = cart.find(i => i.productId === productId);
    if (!existing) {
      cart.push({ shopId, productId, name, price, img, quantity: 1 });
    }
    updateCartUI();
  };

  window.__updateQty = (productId, change) => {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    
    item.quantity += change;
    if (item.quantity <= 0) {
      cart = cart.filter(i => i.productId !== productId);
    }
    updateCartUI();
  };

  const updateCartUI = () => {
    const floatingCart = document.getElementById('floatingCart');
    const itemsEl = document.getElementById('floatingCartItems');
    const totalEl = document.getElementById('floatingCartTotal');
    
    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    
    if (totalItems > 0) {
      floatingCart.classList.add('visible');
      itemsEl.textContent = `${totalItems} item${totalItems > 1 ? 's' : ''}`;
      totalEl.textContent = `₹${totalPrice}`;
    } else {
      floatingCart.classList.remove('visible');
    }

    // Update buttons in modal dynamically
    document.querySelectorAll('.product-controls-container').forEach(container => {
      const productId = container.dataset.productid;
      const props = JSON.parse(decodeURIComponent(container.dataset.props));
      container.innerHTML = renderProductControls(props.shopId, productId, props.name, props.price, props.image);
    });

    // Update Sidebar if open
    if (cartSidebar && !cartSidebar.classList.contains('hidden')) {
      renderCartSidebar();
    }
  };

  // ─── Cart Sidebar Logic ────────────────────────────────────
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

  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  const renderCartSidebar = () => {
    const cartOptions = document.getElementById('cartOptions');
    
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="empty-cart-msg">
          <i class="fa-solid fa-cart-arrow-down"></i>
          <p>Your cart is empty.</p>
        </div>`;
      if (cartOptions) cartOptions.style.display = 'none';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    // Render items
    cartItemsContainer.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${sanitize(item.img)}" alt="${sanitize(item.name)}">
        <div class="cart-item-info">
          <div class="cart-item-name">${sanitize(item.name)}</div>
          <div class="cart-item-price">₹${item.price}</div>
          <div class="cart-item-actions">
            <div class="cart-qty-ctrl">
              <button onclick="window.__updateQty('${item.productId}', -1)"><i class="fa-solid fa-minus"></i></button>
              <span>${item.quantity}</span>
              <button onclick="window.__updateQty('${item.productId}', 1)"><i class="fa-solid fa-plus"></i></button>
            </div>
            <button class="cart-remove-btn" onclick="window.__updateQty('${item.productId}', -${item.quantity})"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    `).join('');

    if (cartOptions) cartOptions.style.display = 'block';
    window.__updateBill();
  };

  // ─── Business Logic (Bill Calculation) ─────────────────────
  window.__applyPromo = () => {
    const input = document.getElementById('promoCodeInput').value.trim().toUpperCase();
    const msg = document.getElementById('promoMessage');
    
    if (input === 'WELCOME10') {
      appliedPromo = { code: 'WELCOME10', type: 'percent', value: 10 };
      msg.textContent = '10% off applied!';
      msg.style.color = '#4ecdc4';
    } else if (input === 'FREEDELIVERY') {
      appliedPromo = { code: 'FREEDELIVERY', type: 'freedelivery' };
      msg.textContent = 'Free Delivery applied!';
      msg.style.color = '#4ecdc4';
    } else if (input === '') {
      appliedPromo = null;
      msg.textContent = '';
    } else {
      appliedPromo = null;
      msg.textContent = 'Invalid promo code.';
      msg.style.color = '#ff6b6b';
    }
    window.__updateBill();
  };

  window.__updateBill = () => {
    if (cart.length === 0) return;

    const itemTotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    
    const deliveryRadio = document.querySelector('input[name="delivery"]:checked');
    const packagingRadio = document.querySelector('input[name="packaging"]:checked');
    
    let deliveryFee = deliveryRadio && deliveryRadio.value === 'express' ? 60 : 30;
    let packagingFee = packagingRadio && packagingRadio.value === 'premium' ? 20 : 0;
    let discountAmount = 0;

    if (appliedPromo) {
      if (appliedPromo.type === 'percent') {
        discountAmount = (itemTotal * appliedPromo.value) / 100;
      } else if (appliedPromo.type === 'freedelivery') {
        discountAmount = deliveryFee; 
      }
    }

    const finalTotal = itemTotal + PLATFORM_FEE + deliveryFee + packagingFee - discountAmount;

    // Update DOM
    document.getElementById('billSubtotal').textContent = `₹${itemTotal}`;
    document.getElementById('billDelivery').textContent = `₹${deliveryFee}`;
    document.getElementById('billPackaging').textContent = `₹${packagingFee}`;
    
    const discountRow = document.getElementById('billDiscountRow');
    if (discountAmount > 0) {
      discountRow.style.display = 'flex';
      document.getElementById('billDiscount').textContent = `-₹${discountAmount.toFixed(0)}`;
    } else {
      discountRow.style.display = 'none';
    }

    document.getElementById('billTotal').textContent = `₹${finalTotal.toFixed(0)}`;
    
    // MOV Check
    const checkoutBtnMain = document.getElementById('checkoutBtnMain');
    const movWarning = document.getElementById('movWarning');
    const movAmount = document.getElementById('movAmount');

    if (itemTotal < MIN_ORDER_VALUE) {
      if (checkoutBtnMain) checkoutBtnMain.disabled = true;
      if (movWarning) movWarning.classList.remove('hidden');
      if (movAmount) movAmount.textContent = (MIN_ORDER_VALUE - itemTotal).toFixed(0);
    } else {
      if (checkoutBtnMain) checkoutBtnMain.disabled = false;
      if (movWarning) movWarning.classList.add('hidden');
    }
  };

  const renderProductControls = (shopId, productId, name, price, img) => {
    const item = cart.find(i => i.productId === productId);
    // Secure params for click handlers
    const safeName = name.replace(/'/g, "\\'");
    
    if (!item) {
      return `<button class="add-to-cart-btn" onclick="window.__addToCart(${shopId}, '${productId}', '${safeName}', ${price}, '${img}')">
                <i class="fa-solid fa-plus"></i> Add to Cart
              </button>`;
    }
    
    return `<div class="cart-controls">
              <button onclick="window.__updateQty('${productId}', -1)"><i class="fa-solid fa-minus"></i></button>
              <span>${item.quantity}</span>
              <button onclick="window.__updateQty('${productId}', 1)"><i class="fa-solid fa-plus"></i></button>
            </div>`;
  };

  // ─── Checkout Logic ────────────────────────────────────────
  const checkoutModal = document.getElementById('checkoutModal');
  const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
  const checkoutForm = document.getElementById('checkoutForm');
  const checkoutBtnMain = document.getElementById('checkoutBtnMain');

  if (checkoutBtnMain) {
    checkoutBtnMain.addEventListener('click', () => {
      checkoutModal.classList.remove('hidden');
      closeCart(); // Close the sidebar
      document.body.style.overflow = 'hidden'; // Re-lock scroll for checkout
    });
  }

  const closeCheckout = () => {
    checkoutModal.classList.add('hidden');
    document.body.style.overflow = '';
  };

  if (closeCheckoutBtn) {
    closeCheckoutBtn.addEventListener('click', closeCheckout);
  }

  const checkoutModalOverlay = document.getElementById('checkoutModalOverlay');
  if (checkoutModalOverlay) {
    checkoutModalOverlay.addEventListener('click', closeCheckout);
  }

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (cart.length === 0) return;

      const name = document.getElementById('checkoutName').value;
      const phone = document.getElementById('checkoutPhone').value;
      const address = document.getElementById('checkoutAddress').value;
      const notes = document.getElementById('checkoutNotes').value;

      const shopId = cart[0].shopId;
      
      // Fetch shop details to get the secure phone number
      let shop;
      try {
        const res = await fetch(`/api/shops/${shopId}`);
        if (!res.ok) throw new Error('Network error');
        shop = await res.json();
      } catch (err) {
         alert("Could not load shop details for checkout. Please try again.");
         return;
      }
      
      if (!shop || !shop.phone) {
         alert("Shop phone number is missing!"); return;
      }

      // Calculate totals one last time
      const itemTotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      const deliveryRadio = document.querySelector('input[name="delivery"]:checked');
      const packagingRadio = document.querySelector('input[name="packaging"]:checked');
      const deliveryType = deliveryRadio ? deliveryRadio.value : 'standard';
      const packagingType = packagingRadio ? packagingRadio.value : 'basic';
      
      let deliveryFee = deliveryType === 'express' ? 60 : 30;
      let packagingFee = packagingType === 'premium' ? 20 : 0;
      let discountAmount = 0;
      let promoLabel = "";

      if (appliedPromo) {
        if (appliedPromo.type === 'percent') {
          discountAmount = (itemTotal * appliedPromo.value) / 100;
        } else if (appliedPromo.type === 'freedelivery') {
          discountAmount = deliveryFee; 
        }
        promoLabel = `(${appliedPromo.code})`;
      }
      const finalTotal = itemTotal + PLATFORM_FEE + deliveryFee + packagingFee - discountAmount;

      let msg = `*New Order from Nirjuli Market Online* 🛒\n`;
      msg += `------------------------\n`;
      msg += `*Customer:* ${name}\n`;
      msg += `*Phone:* ${phone}\n`;
      msg += `*Address:* ${address}\n`;
      if (notes) msg += `*Notes:* ${notes}\n`;
      msg += `------------------------\n`;
      msg += `*Items:*\n`;
      cart.forEach(item => {
         msg += `${item.quantity}x ${item.name} (₹${item.price * item.quantity})\n`;
      });
      msg += `------------------------\n`;
      msg += `*Item Total:* ₹${itemTotal}\n`;
      msg += `*Delivery (${deliveryType}):* ₹${deliveryFee}\n`;
      msg += `*Packaging (${packagingType}):* ₹${packagingFee}\n`;
      msg += `*Platform Fee:* ₹${PLATFORM_FEE}\n`;
      if (discountAmount > 0) msg += `*Discount:* -₹${discountAmount.toFixed(0)} ${promoLabel}\n`;
      msg += `------------------------\n`;
      msg += `*TOTAL TO PAY:* ₹${finalTotal.toFixed(0)}\n`;

      const encodedMsg = encodeURIComponent(msg);
      
      // Clear cart and Reset Form
      cart = [];
      updateCartUI();
      checkoutForm.reset();
      
      closeCheckout(); // Closes modal and restores overflow
      alert('Order Confirmed! Redirecting to WhatsApp to send your order to the shop owner.');
      
      window.open(`https://wa.me/${shop.phone}?text=${encodedMsg}`, '_blank');
    });
  }

  // ─── Particles (Hero Decoration) ─────────────────────────
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

  // ─── Fetch Categories ────────────────────────────────────
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const categories = await res.json();

      // Update hero stat
      if (statCategories) {
        statCategories.querySelector('.stat-number').textContent = categories.length;
      }

      // Build dynamic chips (keep "All" first)
      categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-chip';
        btn.dataset.category = cat;
        btn.innerHTML = `${categoryIcons[cat] || '📦'} ${cat}`;
        categoryContainer.appendChild(btn);
      });
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  // ─── Fetch Shops ─────────────────────────────────────────
  const fetchShops = async () => {
    try {
      shopsGrid.innerHTML = '<div class="loading-spinner"></div>';
      const res  = await fetch('/api/shops');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      allShops   = await res.json();

      // Update hero stat
      if (statShops) {
        statShops.querySelector('.stat-number').textContent = allShops.length;
      }

      renderShops(allShops);
    } catch (err) {
      console.error('Failed to load shops:', err);
      shopsGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>Failed to load shops. Please refresh.</p>
        </div>`;
    }
  };

  // ─── Render Shop Cards ───────────────────────────────────
  const renderShops = (shops) => {
    if (shopCount) {
      shopCount.textContent = `${shops.length} shop${shops.length !== 1 ? 's' : ''}`;
    }

    if (shops.length === 0) {
      shopsGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-store-slash"></i>
          <p>No shops found. Try a different search.</p>
        </div>`;
      return;
    }

    shopsGrid.innerHTML = shops.map(shop => `
      <div class="shop-card glass-card" onclick="window.__openModal(${Number(shop.id)})" role="button" tabindex="0">
        <div class="shop-img-wrapper">
          <img src="${sanitize(shop.image)}" alt="${sanitize(shop.name)}" loading="lazy"
               onerror="this.src='assets/placeholder-shop.svg'; this.onerror=null;">
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
      </div>
    `).join('');
  };

  // ─── Filter Logic ────────────────────────────────────────
  const applyFilters = () => {
    const term = searchInput.value.toLowerCase().trim();
    const activeChip = document.querySelector('.category-chip.active');
    const category = activeChip ? activeChip.dataset.category.toLowerCase() : '';

    let filtered = allShops;

    if (category) {
      filtered = filtered.filter(s => s.category.toLowerCase() === category);
    }
    if (term) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term) ||
        s.category.toLowerCase().includes(term)
      );
    }

    renderShops(filtered);
  };

  // Debounced search (300ms)
  const debouncedFilter = debounce(applyFilters, 300);

  // ─── Event: Search ───────────────────────────────────────
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

  // ─── Event: Categories ───────────────────────────────────
  categoryContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.category-chip');
    if (!chip) return;

    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    applyFilters();
  });

  // ─── Modal: Open ─────────────────────────────────────────
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
                   onerror="this.src='assets/placeholder-shop.svg'; this.onerror=null;">
              <div class="product-info">
                <div class="product-name">${sanitize(p.name)}</div>
                <div class="product-price-row">
                  <div class="product-price">₹${sanitize(String(p.price))}</div>
                  <div class="product-unit">${sanitize(p.unit)}</div>
                </div>
                <div class="product-controls-container" data-productid="${p.id}" data-props="${encodeURIComponent(JSON.stringify({...p, shopId}))}">
                  ${renderProductControls(shopId, p.id, p.name, p.price, p.image)}
                </div>
              </div>
            </div>
          `).join('')
        : '<p style="color:var(--text-dim)">No products listed yet.</p>';

      modalBody.innerHTML = `
        <img src="${sanitize(shop.image)}" alt="${sanitize(shop.name)}" class="modal-banner"
             onerror="this.src='assets/placeholder-shop.svg'; this.onerror=null;">
        <div class="modal-details">
          <div class="modal-category">${sanitize(shop.category)}</div>
          <h2 class="modal-title">${sanitize(shop.name)}</h2>
          <div class="modal-address">
            <i class="fa-solid fa-location-dot"></i>
            <span>${sanitize(shop.address)}</span>
          </div>
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
      modalBody.innerHTML = `
        <div class="empty-state" style="padding:40px;">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>Could not load shop details.</p>
        </div>`;
    }
  };

  // ─── Modal: Close ────────────────────────────────────────
  const closeModal = () => {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  };

  closeModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  // ─── Initialize ──────────────────────────────────────────
  initParticles();
  fetchCategories();
  fetchShops();
});
