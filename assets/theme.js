/**
 * ALTRIXWEAR Theme JavaScript (V2)
 * High-performance, zero heavy dependencies
 */

(function () {
  'use strict';

  // Ensure Shopify Storefront API client is loaded
  if (typeof window !== 'undefined' && !window.ShopifyStorefront) {
    const isPreview = window.location.pathname.includes('/preview/');
    const sfScript = document.createElement('script');
    sfScript.src = isPreview ? '../assets/shopify-storefront.js' : 'assets/shopify-storefront.js';
    document.head.appendChild(sfScript);
  }

  // --- Dynamic Cart & App State ---
  let cartItems = [];
  let cartCount = 0;
  const state = {
    cartOpen: false,
    menuOpen: false,
    modalOpen: false,
    searchOpen: false
  };

  // --- Complete 10 Product Catalog for Live Search ---
  const SEARCH_CATALOG = [
    {
      slug: 'corealign-compression-vest',
      title: 'CoreAlign Compression Vest',
      category: "Men's Activewear",
      price: '$34.99',
      comparePrice: '$44.99',
      image: 'prod-corealign-vest.jpg',
      tags: 'men activewear compression vest tank gym lifting corealign shapewear'
    },
    {
      slug: 'apexfit-gym-vest',
      title: 'ApexFit Gym Vest',
      category: "Men's Activewear",
      price: '$28.99',
      comparePrice: '$36.99',
      image: 'prod-corealign-vest.jpg',
      tags: 'men activewear vest tank gym apexfit bodybuilding lifting'
    },
    {
      slug: 'flowstate-yoga-set',
      title: 'FlowState Yoga Set',
      category: "Women's Activewear",
      price: '$40.99',
      comparePrice: '$52.99',
      image: 'prod-flowstate-set.jpg',
      tags: 'women activewear yoga set leggings sports bra flowstate gym'
    },
    {
      slug: 'pure-balance-ribbed-yoga-set',
      title: 'Pure Balance Ribbed Yoga Set',
      category: "Women's Activewear",
      price: '$40.99',
      comparePrice: '$54.99',
      image: 'prod-ribbed-set.jpg',
      tags: 'women activewear yoga ribbed set bra leggings pure balance'
    },
    {
      slug: 'aerosoft-yoga-t-shirt',
      title: 'AeroSoft Yoga T-Shirt',
      category: "Women's Activewear",
      price: '$29.99',
      comparePrice: '$38.99',
      image: 'prod-aerosoft-tee.jpg',
      tags: 'women activewear tee t-shirt yoga aerosoft modal top shirt'
    },
    {
      slug: 'vector-compression-t-shirt',
      title: 'Vector Compression T-Shirt',
      category: "Men's Activewear",
      price: '$33.99',
      comparePrice: '$42.99',
      image: 'prod-vector-compression.jpg',
      tags: 'men activewear compression t-shirt tee vector long sleeve gym'
    },
    {
      slug: 'ascend-compression-suit',
      title: 'Ascend Compression Suit',
      category: "Men's Shapewear",
      price: '$36.99',
      comparePrice: '$48.99',
      image: 'cat-men.jpg',
      tags: 'men shapewear suit compression ascend one piece base layer support'
    },
    {
      slug: 'second-skin-high-waist-shaper',
      title: 'Second Skin High-Waist Shaper',
      category: "Women's Shapewear",
      price: '$32.99',
      comparePrice: '$42.99',
      image: 'cat-shapewear.jpg',
      tags: 'women shapewear shaper high waist shorts second skin tummy control'
    },
    {
      slug: 'trueshape-zip-bodysuit',
      title: 'TrueShape Zip Bodysuit',
      category: "Women's Shapewear",
      price: '$42.99',
      comparePrice: '$56.99',
      image: 'cat-women.jpg',
      tags: 'women shapewear bodysuit zip trueshape all in one sculpting contour'
    },
    {
      slug: 'structure-shaping-vest',
      title: 'Structure Shaping Vest',
      category: "Men's Shapewear",
      price: '$31.99',
      comparePrice: '$39.99',
      image: 'hero-activewear.jpg',
      tags: 'men shapewear vest posture compression structure slimming tank'
    }
  ];

  // --- Utilities ---
  function showToast(message) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-notification';
      toast.className = 'toast-notification';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span>${message}</span>
    `;
    toast.classList.add('is-active');
    setTimeout(() => {
      toast.classList.remove('is-active');
    }, 3200);
  }

  function updateCartCounters() {
    document.querySelectorAll('.pill-cart-count, .cart-count').forEach((el) => {
      el.textContent = cartCount;
    });
  }

  function loadCart() {
    try {
      const saved = sessionStorage.getItem('altrixwear_cart');
      if (saved) {
        cartItems = JSON.parse(saved);
        if (!Array.isArray(cartItems)) cartItems = [];
      } else {
        cartItems = [];
      }
    } catch (e) {
      cartItems = [];
    }
    cartCount = cartItems.reduce((sum, item) => sum + (item.qty || 1), 0);
  }

  function saveCart() {
    try {
      sessionStorage.setItem('altrixwear_cart', JSON.stringify(cartItems));
    } catch (e) {}
    cartCount = cartItems.reduce((sum, item) => sum + (item.qty || 1), 0);
    renderCart();
  }

  function calculateCartSubtotal() {
    return cartItems.reduce((sum, item) => {
      const p = typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0;
      return sum + (p * (item.qty || 1));
    }, 0);
  }

  function ensureCartDrawerExists() {
    let drawer = document.getElementById('cart-drawer');
    let backdrop = document.getElementById('cart-backdrop');
    if (!drawer) {
      backdrop = document.createElement('div');
      backdrop.id = 'cart-backdrop';
      backdrop.className = 'drawer-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);

      drawer = document.createElement('aside');
      drawer.id = 'cart-drawer';
      drawer.className = 'cart-drawer';
      drawer.setAttribute('aria-label', 'Shopping Bag');
      drawer.setAttribute('aria-modal', 'true');
      drawer.setAttribute('role', 'dialog');

      const isPreview = window.location.pathname.includes('/preview/');
      const shopUrl = isPreview ? 'collection.html' : '/collections/all';

      drawer.innerHTML = `
        <div class="cart-drawer-header">
          <h3 style="font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;">
            Your Bag (<span class="cart-count">0</span>)
          </h3>
          <button type="button" class="drawer-close-btn" data-action="close-cart" aria-label="Close bag">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="free-shipping-bar" style="background-color: var(--color-off-white); padding: 10px 20px; font-size: 12px; font-weight: 600; text-align: center; border-bottom: 1px solid var(--color-border);">
          <span>Free US Shipping on orders over $75</span>
        </div>

        <div class="cart-drawer-items"></div>

        <div class="cart-drawer-footer">
          <div class="cart-subtotal-row">
            <span>Estimated Subtotal</span>
            <span class="cart-subtotal-val">$0.00</span>
          </div>
          <p class="cart-shipping-notice">
            US Delivery: 8–12 business days &bull; Taxes calculated at checkout
          </p>
          <a href="${shopUrl}" class="btn btn-primary btn-block">
            Explore Collection
          </a>
        </div>
      `;
      document.body.appendChild(drawer);
    }
    return { drawer, backdrop };
  }

  function renderCart() {
    cartCount = cartItems.reduce((sum, item) => sum + (item.qty || 1), 0);
    const subtotal = calculateCartSubtotal();
    const formattedSubtotal = `$${subtotal.toFixed(2)}`;

    updateCartCounters();

    const isPreview = window.location.pathname.includes('/preview/');
    const shopUrl = isPreview ? 'collection.html' : '/collections/all';
    const checkoutUrl = isPreview ? 'cart.html' : '/checkout';
    const imgPrefix = isPreview ? '../assets/' : 'assets/';

    // Free shipping bar announcement
    document.querySelectorAll('.free-shipping-bar').forEach(bar => {
      if (subtotal >= 75) {
        bar.innerHTML = '<span>🎉 Free US Shipping unlocked!</span>';
      } else if (subtotal > 0) {
        const remaining = (75 - subtotal).toFixed(2);
        bar.innerHTML = `<span>Add <strong>$${remaining}</strong> more for Free US Shipping</span>`;
      } else {
        bar.innerHTML = '<span>Free US Shipping on orders over $75</span>';
      }
    });

    // Update Cart Drawer Items
    document.querySelectorAll('.cart-drawer-items').forEach(container => {
      if (cartItems.length === 0) {
        container.innerHTML = `
          <div class="cart-empty-state">
            <div class="cart-empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </div>
            <h4 class="cart-empty-title">Your Bag Is Empty</h4>
            <p class="cart-empty-desc">Looks like you haven't added any activewear pieces to your bag yet.</p>
            <a href="${shopUrl}" class="btn btn-primary btn-sm" style="display: inline-block;">Explore Collection</a>
          </div>
        `;
      } else {
        container.innerHTML = cartItems.map((item, idx) => {
          const itemImg = item.image.startsWith('http') || item.image.startsWith('/') || item.image.startsWith('../') ? item.image : imgPrefix + item.image;
          const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0;
          const lineTotal = (itemPrice * (item.qty || 1)).toFixed(2);
          return `
            <div class="cart-item" data-cart-index="${idx}">
              <img src="${itemImg}" alt="${item.title}" class="cart-item-img" width="72" height="90">
              <div class="cart-item-details">
                <h4 class="cart-item-title">${item.title}</h4>
                <span class="cart-item-variant">Size: ${item.size || 'L'} &bull; Color: ${item.color || 'Black'}</span>
                <span class="cart-item-price">$${lineTotal}</span>
                <div class="cart-item-actions">
                  <div class="qty-control">
                    <button type="button" class="qty-btn" data-action="cart-qty" data-cart-index="${idx}" data-change="dec" aria-label="Decrease quantity">&minus;</button>
                    <input type="text" class="qty-input" value="${item.qty || 1}" readonly>
                    <button type="button" class="qty-btn" data-action="cart-qty" data-cart-index="${idx}" data-change="inc" aria-label="Increase quantity">&plus;</button>
                  </div>
                  <button type="button" class="cart-remove-btn" data-action="cart-remove" data-cart-index="${idx}">Remove</button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    });

    // Update Drawer Footers
    document.querySelectorAll('.cart-drawer-footer').forEach(footer => {
      const subtotalEl = footer.querySelector('.cart-subtotal-val, .cart-subtotal-amount, .cart-subtotal-row span:last-child');
      if (subtotalEl) {
        subtotalEl.textContent = formattedSubtotal;
      }
      const ctaEl = footer.querySelector('a.btn, button.btn');
      if (ctaEl) {
        if (cartItems.length === 0) {
          ctaEl.setAttribute('href', shopUrl);
          ctaEl.removeAttribute('data-action');
          ctaEl.textContent = 'Explore Collection';
        } else {
          ctaEl.removeAttribute('href');
          ctaEl.setAttribute('data-action', 'shopify-checkout');
          ctaEl.style.cursor = 'pointer';
          ctaEl.textContent = `Proceed to Checkout \u2022 ${formattedSubtotal}`;
        }
      }
    });

    // Update Standalone Cart Page (preview/cart.html) if present
    const cartPageItems = document.getElementById('cart-page-items');
    const cartPageSummary = document.getElementById('cart-page-summary');
    if (cartPageItems) {
      if (cartItems.length === 0) {
        cartPageItems.innerHTML = `
          <div class="cart-empty-state" style="padding: 48px 24px;">
            <div class="cart-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </div>
            <h3 class="cart-empty-title" style="font-size: 18px;">Your Bag Is Empty</h3>
            <p class="cart-empty-desc" style="max-width: 360px;">You don't have any items in your bag yet. Discover our performance activewear and supportive shapewear.</p>
            <a href="${shopUrl}" class="btn btn-primary" style="display: inline-block; padding: 14px 32px;">Explore All Products</a>
          </div>
        `;
        if (cartPageSummary) {
          cartPageSummary.style.display = 'none';
        }
      } else {
        if (cartPageSummary) {
          cartPageSummary.style.display = 'block';
        }
        cartPageItems.innerHTML = cartItems.map((item, idx) => {
          const itemImg = item.image.startsWith('http') || item.image.startsWith('/') || item.image.startsWith('../') ? item.image : imgPrefix + item.image;
          const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0;
          const lineTotal = (itemPrice * (item.qty || 1)).toFixed(2);
          return `
            <div class="cart-item" data-cart-index="${idx}" ${idx === cartItems.length - 1 ? 'style="border-bottom: none; padding-bottom: 0;"' : ''}>
              <img src="${itemImg}" alt="${item.title}" class="cart-item-img" width="72" height="90">
              <div class="cart-item-details">
                <h3 class="cart-item-title">${item.title}</h3>
                <span class="cart-item-variant">Size: ${item.size || 'L'} &bull; Color: ${item.color || 'Black'}</span>
                <span class="cart-item-price">$${lineTotal}</span>
                <div class="cart-item-actions">
                  <div class="qty-control">
                    <button type="button" class="qty-btn" data-action="cart-qty" data-cart-index="${idx}" data-change="dec">&minus;</button>
                    <input type="text" class="qty-input" value="${item.qty || 1}" readonly>
                    <button type="button" class="qty-btn" data-action="cart-qty" data-cart-index="${idx}" data-change="inc">&plus;</button>
                  </div>
                  <button type="button" class="cart-remove-btn" data-action="cart-remove" data-cart-index="${idx}">Remove</button>
                </div>
              </div>
            </div>
          `;
        }).join('');

        const cartPageSubtotal = document.getElementById('cart-page-subtotal');
        if (cartPageSubtotal) cartPageSubtotal.textContent = formattedSubtotal;

        const cartPageCheckoutBtn = document.getElementById('cart-page-checkout-btn');
        if (cartPageCheckoutBtn) {
          cartPageCheckoutBtn.innerHTML = `PROCEED TO CHECKOUT &bull; ${formattedSubtotal}`;
          cartPageCheckoutBtn.setAttribute('data-action', 'shopify-checkout');
          cartPageCheckoutBtn.removeAttribute('onclick');
        }
      }
    }
  }

  function addItemToCart(title, size) {
    const catalogItem = SEARCH_CATALOG.find(i => i.title.toLowerCase() === title.toLowerCase()) || {
      title: title,
      price: '$34.99',
      image: 'prod-corealign-vest.jpg'
    };

    const selectedSize = size || 'L';
    const numPrice = parseFloat(catalogItem.price.replace(/[^0-9.]/g, '')) || 34.99;

    const existingIndex = cartItems.findIndex(i => i.title.toLowerCase() === catalogItem.title.toLowerCase() && i.size === selectedSize);
    if (existingIndex > -1) {
      cartItems[existingIndex].qty = (cartItems[existingIndex].qty || 1) + 1;
    } else {
      cartItems.push({
        title: catalogItem.title,
        price: numPrice,
        priceFormatted: catalogItem.price,
        image: catalogItem.image,
        size: selectedSize,
        color: 'Black',
        qty: 1
      });
    }

    saveCart();
    toggleCart(true);
    showToast(`Added "${catalogItem.title}" to your bag`);
  }

  // --- Drawer & Modal Handlers ---
  function toggleMobileMenu(open) {
    const drawer = document.getElementById('mobile-nav-drawer');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    if (!drawer || !backdrop) return;

    if (open) {
      drawer.classList.add('is-active');
      backdrop.classList.add('is-active');
      document.body.style.overflow = 'hidden';
      state.menuOpen = true;
    } else {
      drawer.classList.remove('is-active');
      backdrop.classList.remove('is-active');
      document.body.style.overflow = '';
      state.menuOpen = false;
    }
  }

  function toggleCart(open) {
    ensureCartDrawerExists();
    const cartDrawer = document.getElementById('cart-drawer');
    const cartBackdrop = document.getElementById('cart-backdrop');
    if (!cartDrawer || !cartBackdrop) return;

    if (open) {
      renderCart();
      cartDrawer.classList.add('is-active');
      cartBackdrop.classList.add('is-active');
      document.body.style.overflow = 'hidden';
      state.cartOpen = true;
    } else {
      cartDrawer.classList.remove('is-active');
      cartBackdrop.classList.remove('is-active');
      document.body.style.overflow = '';
      state.cartOpen = false;
    }
  }

  function toggleSizeModal(open) {
    const modal = document.getElementById('size-guide-modal');
    if (!modal) return;

    if (open) {
      modal.classList.add('is-active');
      document.body.style.overflow = 'hidden';
      state.modalOpen = true;
    } else {
      modal.classList.remove('is-active');
      document.body.style.overflow = '';
      state.modalOpen = false;
    }
  }

  // --- Search Modal Handlers ---
  function ensureSearchModalExists() {
    let modal = document.getElementById('search-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'search-modal';
      modal.className = 'modal-backdrop search-modal-backdrop';
      modal.setAttribute('aria-hidden', 'true');

      const isPreview = window.location.pathname.includes('/preview/');
      const shopUrl = isPreview ? 'collection.html' : '/collections/all';

      modal.innerHTML = `
        <div class="search-modal-container" role="dialog" aria-label="Search Activewear Catalog">
          <div class="search-modal-header">
            <div class="search-input-wrap">
              <svg class="search-input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                inputmode="search"
                id="search-input"
                class="search-input"
                placeholder="Search activewear, vests, sets, shapewear..."
                autocomplete="off"
                spellcheck="false"
              >
              <button type="button" id="search-clear-btn" class="search-clear-btn" data-action="clear-search" aria-label="Clear search" style="display: none;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <button type="button" class="search-close-btn" data-action="close-search" aria-label="Close search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div class="search-suggestions">
            <span class="search-suggestions-label">Popular Searches:</span>
            <div class="search-tags">
              <button type="button" class="search-tag-pill" data-query="Compression Vest">Compression Vest</button>
              <button type="button" class="search-tag-pill" data-query="Yoga Set">Yoga Set</button>
              <button type="button" class="search-tag-pill" data-query="Men">Men's Activewear</button>
              <button type="button" class="search-tag-pill" data-query="Women">Women's Activewear</button>
              <button type="button" class="search-tag-pill" data-query="Shapewear">Shapewear</button>
            </div>
          </div>

          <div class="search-results-section">
            <div class="search-results-header">
              <span id="search-results-title" class="search-results-title">Trending Activewear</span>
              <span id="search-results-count" class="search-results-count">4 items</span>
            </div>
            <div id="search-results-grid" class="search-results-grid"></div>
          </div>

          <div class="search-modal-footer">
            <a href="${shopUrl}" class="search-view-all-link">
              Explore All 10 Products in Shop &rarr;
            </a>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    return modal;
  }

  function renderSearchResults(query) {
    ensureSearchModalExists();
    const cleanQuery = (query || '').trim().toLowerCase();
    const resultsGrid = document.getElementById('search-results-grid');
    const titleEl = document.getElementById('search-results-title');
    const countEl = document.getElementById('search-results-count');
    const clearBtn = document.getElementById('search-clear-btn');

    if (clearBtn) {
      clearBtn.style.display = cleanQuery ? 'flex' : 'none';
    }

    if (!resultsGrid) return;

    const isPreview = window.location.pathname.includes('/preview/');
    const getProductUrl = (slug) => isPreview ? `product.html?product=${slug}` : `/products/${slug}`;
    const getAssetUrl = (filename) => isPreview ? `../assets/${filename}` : `assets/${filename}`;

    let matches = [];
    if (!cleanQuery) {
      const trendingSlugs = ['corealign-compression-vest', 'flowstate-yoga-set', 'apexfit-gym-vest', 'pure-balance-ribbed-yoga-set'];
      matches = SEARCH_CATALOG.filter(item => trendingSlugs.includes(item.slug));
      if (titleEl) titleEl.textContent = 'Trending Activewear';
      if (countEl) countEl.textContent = `${matches.length} items`;
    } else {
      matches = SEARCH_CATALOG.filter(item => {
        return item.title.toLowerCase().includes(cleanQuery) ||
               item.category.toLowerCase().includes(cleanQuery) ||
               item.tags.toLowerCase().includes(cleanQuery);
      });
      if (titleEl) titleEl.textContent = `Results for "${query.trim()}"`;
      if (countEl) countEl.textContent = `${matches.length} ${matches.length === 1 ? 'item' : 'items'}`;
    }

    if (matches.length === 0) {
      resultsGrid.innerHTML = `
        <div class="search-empty-state">
          <div class="search-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </div>
          <p class="search-empty-title">No products found matching "${query.trim()}"</p>
          <p class="search-empty-desc">Try searching for keywords like <strong>Vest</strong>, <strong>Yoga</strong>, <strong>Compression</strong>, or <strong>Shapewear</strong>.</p>
        </div>
      `;
      return;
    }

    resultsGrid.innerHTML = matches.map(item => `
      <a href="${getProductUrl(item.slug)}" class="search-result-item">
        <div class="search-result-thumb">
          <img src="${getAssetUrl(item.image)}" alt="${item.title}" class="search-result-img" loading="lazy" width="60" height="75">
        </div>
        <div class="search-result-info">
          <span class="search-result-type">${item.category}</span>
          <h4 class="search-result-title">${item.title}</h4>
          <div class="search-result-pricing">
            <span class="search-result-price">${item.price}</span>
            <span class="search-result-compare">${item.comparePrice}</span>
          </div>
        </div>
        <div class="search-result-arrow">&rarr;</div>
      </a>
    `).join('');
  }

  function toggleSearchModal(open) {
    const modal = ensureSearchModalExists();
    if (!modal) return;

    if (open) {
      modal.classList.add('is-active');
      document.body.style.overflow = 'hidden';
      state.searchOpen = true;
      const input = document.getElementById('search-input');
      if (input) {
        setTimeout(() => input.focus(), 60);
        renderSearchResults(input.value);
      }
    } else {
      modal.classList.remove('is-active');
      document.body.style.overflow = '';
      state.searchOpen = false;
    }
  }

  // --- Collection Filtering ---
  function applyCategoryFilter(cat) {
    const filterButtons = document.querySelectorAll('[data-filter]');
    const productCards = document.querySelectorAll('.product-grid .product-card');
    const countLabel = document.getElementById('collection-product-count');

    if (!filterButtons.length || !productCards.length) return;

    filterButtons.forEach(btn => {
      if (btn.getAttribute('data-filter') === cat) {
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-secondary');
      } else {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
      }
    });

    let visibleCount = 0;
    productCards.forEach(card => {
      const cardCat = (card.getAttribute('data-category') || '').toLowerCase();
      const categories = cardCat.split(/\s+/);
      if (cat === 'all' || cardCat === cat || categories.includes(cat)) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    if (countLabel) {
      countLabel.textContent = `${visibleCount} Item${visibleCount === 1 ? '' : 's'}`;
    }

    const eyebrow = document.getElementById('collection-eyebrow');
    const title = document.getElementById('collection-title');
    const desc = document.getElementById('collection-desc');

    if (title && eyebrow && desc) {
      if (cat === 'shapewear') {
        eyebrow.textContent = 'Shapewear Collection';
        title.textContent = "MEN'S & WOMEN'S SHAPEWEAR";
        desc.textContent = 'Targeted posture support, core compression, and 360° waist contouring for men and women.';
      } else if (cat === 'men') {
        eyebrow.textContent = "Men's Collection";
        title.textContent = "MEN'S ACTIVEWEAR & SHAPEWEAR";
        desc.textContent = 'High-performance athletic compression, training vests, and posture undershirts.';
      } else if (cat === 'women') {
        eyebrow.textContent = "Women's Collection";
        title.textContent = "WOMEN'S ACTIVEWEAR & SHAPEWEAR";
        desc.textContent = 'Seamless yoga sets, studio tees, and contouring shapewear pieces.';
      } else {
        eyebrow.textContent = 'Catalog';
        title.textContent = 'ALL ACTIVEWEAR & SHAPEWEAR';
        desc.textContent = 'Built for the work in between. Premium athletic compression, functional gymwear, and everyday support.';
      }
    }
  }

  // --- Event Delegation ---
  document.addEventListener('click', function (e) {
    const target = e.target;

    // Collection Category Filter Buttons
    const filterBtn = target.closest('[data-filter]');
    if (filterBtn) {
      e.preventDefault();
      const cat = filterBtn.getAttribute('data-filter');
      applyCategoryFilter(cat);
      if (window.history && window.history.replaceState) {
        const newUrl = cat === 'all' ? window.location.pathname : `${window.location.pathname}?category=${cat}`;
        window.history.replaceState(null, '', newUrl);
      }
    }

    // Mobile menu toggles
    if (target.closest('[data-action="open-mobile-menu"]')) {
      e.preventDefault();
      toggleMobileMenu(true);
    }
    if (target.closest('[data-action="close-mobile-menu"]') || target.id === 'mobile-nav-backdrop') {
      e.preventDefault();
      toggleMobileMenu(false);
    }

    // Cart toggles
    if (target.closest('[data-action="open-cart"]')) {
      e.preventDefault();
      toggleCart(true);
    }
    if (target.closest('[data-action="close-cart"]') || target.id === 'cart-backdrop') {
      e.preventDefault();
      toggleCart(false);
    }

    // Direct Live Shopify Checkout Trigger
    const checkoutBtn = target.closest('[data-action="shopify-checkout"]') || (target.id === 'cart-page-checkout-btn' ? target : null);
    if (checkoutBtn) {
      e.preventDefault();
      if (window.ShopifyStorefront && window.ShopifyStorefront.proceedToShopifyCheckout) {
        window.ShopifyStorefront.proceedToShopifyCheckout(cartItems, checkoutBtn);
      } else {
        window.location.href = 'https://altrixwear.com/cart';
      }
      return;
    }

    // Size Guide Modal
    if (target.closest('[data-action="open-size-guide"]')) {
      e.preventDefault();
      toggleSizeModal(true);
    }
    if (target.closest('[data-action="close-size-guide"]') || target.id === 'size-guide-modal') {
      e.preventDefault();
      toggleSizeModal(false);
    }

    // Search Modal toggles
    if (target.closest('[data-action="open-search"]')) {
      e.preventDefault();
      toggleSearchModal(true);
    }
    if (target.closest('[data-action="close-search"]') || target.id === 'search-modal') {
      e.preventDefault();
      toggleSearchModal(false);
    }
    if (target.closest('[data-action="clear-search"]') || target.id === 'search-clear-btn') {
      e.preventDefault();
      const input = document.getElementById('search-input');
      if (input) {
        input.value = '';
        input.focus();
        renderSearchResults('');
      }
    }
    const searchTagPill = target.closest('.search-tag-pill');
    if (searchTagPill) {
      e.preventDefault();
      const q = searchTagPill.getAttribute('data-query') || '';
      const input = document.getElementById('search-input');
      if (input) {
        input.value = q;
        input.focus();
        renderSearchResults(q);
      }
    }

    // PDP Thumbnail Image Switcher
    const thumbBtn = target.closest('[data-action="switch-pdp-image"]');
    if (thumbBtn) {
      e.preventDefault();
      const newSrc = thumbBtn.getAttribute('data-target-src');
      const mainImg = document.getElementById('pdp-main-img');
      const parent = thumbBtn.closest('.pdp-thumbnails-grid');
      if (parent) {
        parent.querySelectorAll('.pdp-thumbnail-item').forEach(b => b.classList.remove('is-active'));
        thumbBtn.classList.add('is-active');
      }
      if (mainImg && newSrc) {
        mainImg.style.opacity = '0.3';
        setTimeout(() => {
          mainImg.src = newSrc;
          mainImg.style.opacity = '1';
        }, 120);
      }
    }

    // Quick Add to Bag
    const quickAddBtn = target.closest('[data-action="quick-add"]');
    if (quickAddBtn) {
      e.preventDefault();
      const title = quickAddBtn.getAttribute('data-product-title') || 'CoreAlign Compression Vest';
      let size = 'L';
      const selectedChip = document.querySelector('.size-chip.is-selected');
      if (selectedChip) {
        size = selectedChip.getAttribute('data-size') || 'L';
      }
      addItemToCart(title, size);
    }

    // Size Selector Chips
    const sizeChip = target.closest('.size-chip');
    if (sizeChip) {
      const container = sizeChip.closest('.size-chips');
      if (container) {
        container.querySelectorAll('.size-chip').forEach(c => c.classList.remove('is-selected'));
        sizeChip.classList.add('is-selected');
        const selectedSize = sizeChip.getAttribute('data-size');
        const label = document.getElementById('selected-size-label');
        if (label) label.textContent = selectedSize;
      }
    }

    // Accordion items (PDP / FAQ)
    const accordionBtn = target.closest('.pdp-accordion-trigger');
    if (accordionBtn) {
      e.preventDefault();
      const item = accordionBtn.closest('.pdp-accordion-item');
      if (item) {
        const isOpen = item.classList.toggle('is-open');
        const indicator = accordionBtn.querySelector('.pdp-accordion-indicator') || accordionBtn.lastElementChild;
        if (indicator) {
          indicator.innerHTML = isOpen ? '&minus;' : '&plus;';
        }
      }
    }

    // Cart Drawer Quantity Buttons
    const qtyBtn = target.closest('.qty-btn');
    if (qtyBtn) {
      e.preventDefault();
      const idxAttr = qtyBtn.getAttribute('data-cart-index');
      const change = qtyBtn.getAttribute('data-change');
      let idx = idxAttr !== null ? parseInt(idxAttr, 10) : -1;
      if (idx === -1) {
        const row = qtyBtn.closest('.cart-item');
        if (row && row.hasAttribute('data-cart-index')) {
          idx = parseInt(row.getAttribute('data-cart-index'), 10);
        }
      }
      if (idx >= 0 && idx < cartItems.length) {
        if (change === 'inc') {
          cartItems[idx].qty = (cartItems[idx].qty || 1) + 1;
        } else if (change === 'dec') {
          if ((cartItems[idx].qty || 1) > 1) {
            cartItems[idx].qty -= 1;
          } else {
            cartItems.splice(idx, 1);
            showToast('Item removed from bag');
          }
        }
        saveCart();
      }
    }

    // Cart Drawer Remove Button
    const removeBtn = target.closest('.cart-remove-btn');
    if (removeBtn) {
      e.preventDefault();
      const idxAttr = removeBtn.getAttribute('data-cart-index');
      let idx = idxAttr !== null ? parseInt(idxAttr, 10) : -1;
      if (idx === -1) {
        const row = removeBtn.closest('.cart-item');
        if (row && row.hasAttribute('data-cart-index')) {
          idx = parseInt(row.getAttribute('data-cart-index'), 10);
        }
      }
      if (idx >= 0 && idx < cartItems.length) {
        cartItems.splice(idx, 1);
        saveCart();
        showToast('Item removed from bag');
      }
    }
  });

  // --- Real-time Search Input Handling ---
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'search-input') {
      renderSearchResults(e.target.value);
    }
  });

  // --- Keyboard Handling ---
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (state.menuOpen) toggleMobileMenu(false);
      if (state.cartOpen) toggleCart(false);
      if (state.modalOpen) toggleSizeModal(false);
      if (state.searchOpen) toggleSearchModal(false);
    }
  });

  // --- Page Load Initialization ---
  document.addEventListener('DOMContentLoaded', function () {
    // Initialize Cart State & Render Initial Empty or Stored Bag
    loadCart();
    renderCart();

    // Check URL params for category filter (e.g. ?category=men or ?category=women)
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
      applyCategoryFilter(categoryParam.toLowerCase());
    }

    if (urlParams.has('search')) {
      toggleSearchModal(true);
    }

    // Email 10% Discount Form
    const emailForm = document.getElementById('email-discount-form');
    if (emailForm) {
      emailForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const input = emailForm.querySelector('input[type="email"]');
        if (input && input.value) {
          emailForm.innerHTML = `
            <div style="background: var(--color-white); border: 1px solid var(--color-near-black); padding: 16px 24px; border-radius: var(--radius-xs); text-align: center; width: 100%;">
              <p style="font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">10% Discount Unlocked!</p>
              <p style="font-size: 13px; color: var(--color-gray-dark);">Use code <span style="font-weight: 800; background: var(--color-off-white); padding: 2px 8px; border: 1px dashed var(--color-near-black); letter-spacing: 0.1em;">WELCOME10</span> at checkout.</p>
            </div>
          `;
          showToast('Code WELCOME10 activated for your first order!');
        }
      });
    }
  });

})();
