/**
 * ALTRIXWEAR Shopify Storefront API Integration
 * Connects the UI to live Shopify Storefront GraphQL API (66mb10-xu.myshopify.com)
 * Handles real-time checkout generation, cart synchronization, and product data.
 */

(function () {
  'use strict';

  const SHOPIFY_CONFIG = {
    domain: '66mb10-xu.myshopify.com',
    checkoutDomain: 'altrixwear.com',
    publicAccessToken: '2a11d99cc5b15ea622a9a6e6b25126a0',
    apiVersion: '2026-01'
  };

  // Product title / handle to Shopify handle mapping
  const PRODUCT_HANDLE_MAP = {
    'corealign compression vest': 'mens-compression-shaper-vest',
    'corealign-compression-vest': 'mens-compression-shaper-vest',
    'apexfit gym vest': 'mens-breathable-cotton-vest-for-gym-sports-training',
    'apexfit-gym-vest': 'mens-breathable-cotton-vest-for-gym-sports-training',
    'vector compression t-shirt': 'compression-shirt-pro-long-sleeve-running-t-shirt-one',
    'vector-compression-t-shirt': 'compression-shirt-pro-long-sleeve-running-t-shirt-one',
    'ascend compression suit': 'mens-compression-workout-suit',
    'ascend-compression-suit': 'mens-compression-workout-suit',
    'structure shaping vest': 'mens-body-shaper-waist-trainer-for-tummy-control',
    'structure-shaping-vest': 'mens-body-shaper-waist-trainer-for-tummy-control',
    'flowstate yoga set': 'womens-seamless-active-yoga-set',
    'flowstate-yoga-set': 'womens-seamless-active-yoga-set',
    'pure balance ribbed yoga set': 'seamless-yoga-fitness-set',
    'pure-balance-ribbed-yoga-set': 'seamless-yoga-fitness-set',
    'trueshape zip bodysuit': 'one-piece-body-shaping-jersey-with-front-zipper',
    'trueshape-zip-bodysuit': 'one-piece-body-shaping-jersey-with-front-zipper',
    'second skin high-waist shaper': 'womens-body-shaping-pants-with-tight-waistband',
    'second-skin-high-waist-shaper': 'womens-body-shaping-pants-with-tight-waistband',
    'aerosoft yoga t-shirt': 'womens-seamless-moisture-wicking-yoga-t-shirt',
    'aerosoft-yoga-t-shirt': 'womens-seamless-moisture-wicking-yoga-t-shirt'
  };

  // Pre-compiled live Shopify variant GIDs (size & color)
  let VARIANT_DATABASE = null;

  async function loadVariantDatabase() {
    if (VARIANT_DATABASE) return VARIANT_DATABASE;
    try {
      const isFile = window.location.protocol === 'file:';
      const isPreview = window.location.pathname.includes('/preview/');
      const url = isFile
        ? (isPreview ? '../assets/shopify-variants.json' : 'assets/shopify-variants.json')
        : '/assets/shopify-variants.json';
      const res = await fetch(url);
      if (res.ok) {
        VARIANT_DATABASE = await res.json();
        return VARIANT_DATABASE;
      }
    } catch (e) {
      console.warn('Could not load local variants database, querying Shopify API...', e);
    }
    return null;
  }

  // Execute Storefront GraphQL query
  async function storefrontQuery(query, variables = {}) {
    const endpoint = `https://${SHOPIFY_CONFIG.domain}/api/${SHOPIFY_CONFIG.apiVersion}/graphql.json`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_CONFIG.publicAccessToken
      },
      body: JSON.stringify({ query, variables })
    });
    return res.json();
  }

  // Resolve a cart item to a live Shopify Variant GID
  async function resolveVariantId(item) {
    const db = await loadVariantDatabase();
    const itemTitle = (item.title || '').trim().toLowerCase();
    const shopifyHandle = PRODUCT_HANDLE_MAP[itemTitle] || PRODUCT_HANDLE_MAP[item.slug || ''];

    if (db && shopifyHandle && db[shopifyHandle]) {
      const variants = db[shopifyHandle].variants || [];
      const itemSize = (item.size || 'L').trim().toUpperCase();
      const itemColor = (item.color || 'Black').trim().toLowerCase();

      // Find exact size + color match
      const exactMatch = variants.find(v => {
        const sz = (v.options?.size || '').toUpperCase();
        const col = (v.options?.color || '').toLowerCase();
        return sz === itemSize && (col === itemColor || !col);
      });
      if (exactMatch) return exactMatch.id;

      // Find size match
      const sizeMatch = variants.find(v => (v.options?.size || '').toUpperCase() === itemSize || v.title.toUpperCase().includes(itemSize));
      if (sizeMatch) return sizeMatch.id;

      // Fallback to first available variant
      if (variants[0]) return variants[0].id;
    }

    // Direct fallback querying the product handle from live API
    if (shopifyHandle) {
      try {
        const query = `
          query getVariant($handle: String!) {
            product(handle: $handle) {
              variants(first: 20) {
                edges {
                  node {
                    id
                    title
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
            }
          }
        `;
        const res = await storefrontQuery(query, { handle: shopifyHandle });
        const edges = res?.data?.product?.variants?.edges || [];
        if (edges.length > 0) {
          const itemSize = (item.size || 'L').trim().toUpperCase();
          const match = edges.find(e => {
            const node = e.node;
            return node.title.toUpperCase().includes(itemSize) ||
              node.selectedOptions.some(o => o.value.toUpperCase() === itemSize);
          });
          return match ? match.node.id : edges[0].node.id;
        }
      } catch (err) {
        console.error('Failed to resolve variant online:', err);
      }
    }

    return null;
  }

  // Create a real Shopify checkout and redirect
  async function proceedToShopifyCheckout(cartItems, btnElement) {
    if (!cartItems || cartItems.length === 0) {
      window.location.href = window.location.pathname.includes('/preview/') ? 'collection.html' : '/collections/all';
      return;
    }

    if (btnElement) {
      btnElement.disabled = true;
      btnElement.dataset.origText = btnElement.innerHTML;
      btnElement.innerHTML = `
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          Preparing Secure Checkout...
        </span>
      `;
    }

    try {
      // 1. Resolve variant IDs for all items
      const lines = [];
      for (const item of cartItems) {
        const variantId = await resolveVariantId(item);
        if (variantId) {
          lines.push({
            quantity: item.qty || 1,
            merchandiseId: variantId
          });
        }
      }

      if (lines.length === 0) {
        // Fallback: direct to shopify cart
        window.location.href = `https://${SHOPIFY_CONFIG.checkoutDomain}/cart`;
        return;
      }

      // 2. Execute cartCreate mutation
      const mutation = `
        mutation createCart($lines: [CartLineInput!]) {
          cartCreate(input: { lines: $lines }) {
            cart {
              id
              checkoutUrl
              totalQuantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const result = await storefrontQuery(mutation, { lines });
      const cart = result?.data?.cartCreate?.cart;
      const errors = result?.data?.cartCreate?.userErrors;

      if (cart && cart.checkoutUrl) {
        // Redirect directly to the live secure Shopify checkout URL
        window.location.href = cart.checkoutUrl;
      } else {
        console.warn('Shopify Cart returned no checkout URL or errors:', errors);
        window.location.href = `https://${SHOPIFY_CONFIG.checkoutDomain}/cart`;
      }
    } catch (err) {
      console.error('Error creating Shopify checkout:', err);
      // Clean fallback directly to store cart
      window.location.href = `https://${SHOPIFY_CONFIG.checkoutDomain}/cart`;
    }
  }

  // Export to global scope
  window.ShopifyStorefront = {
    config: SHOPIFY_CONFIG,
    query: storefrontQuery,
    resolveVariantId: resolveVariantId,
    proceedToShopifyCheckout: proceedToShopifyCheckout,
    loadVariantDatabase: loadVariantDatabase
  };

  // Pre-load variant database in background
  if (typeof window !== 'undefined') {
    loadVariantDatabase();
  }

})();
