// Detail page add-to-cart functionality
// This script is included on all car detail pages and handles:
// - Add to cart (extract car name, price, image, add to localStorage, redirect to cart.html)
// - Cart badge updates (real-time sync with navbar)
// Note: Favorites are now managed by favorites.js

const CART_KEY = 'autobesa_cart_v1';

// Utility: Load cart from localStorage
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

// Utility: Save cart to localStorage
function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
  } catch (e) {
    console.error('Error saving cart:', e);
  }
}

// Utility: Update cart badge count on all pages
function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-count');
  const cart = loadCart();
  const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  badges.forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  });
}



// Extract car details from detail page DOM
function getCarDetailsFromPage() {
  // Car name: look for h1 in .car-details-header
  const nameEl = document.querySelector('.car-details-header h1');
  const name = nameEl ? nameEl.textContent.trim() : 'Unknown Car';

  // Price: look for .car-price in .car-details-header
  const priceEl = document.querySelector('.car-details-header .car-price');
  let priceText = priceEl ? priceEl.textContent.trim() : '0';
  // Remove €, commas, spaces
  priceText = priceText.replace(/[€,\s]/g, '');
  const price = parseFloat(priceText) || 0;

  // Image: look for first slider image (or first img in slider-container)
  const imgEl = document.querySelector('.slider-image.active') || document.querySelector('.slider-image');
  const image = imgEl ? imgEl.src : '';

  // ID: use a stable ID based on car name
  const id = 'car-' + name.toLowerCase().replace(/\s+/g, '-');

  return { id, name, price, image };
}

// Add to cart: extract details and add to localStorage
function addToCart() {
  const { id, name, price, image } = getCarDetailsFromPage();

  if (!name || price === 0) {
    alert('Nuk mund të ngarkohen detajet e makinës. Ju lutem, provoni më vonë.');
    return;
  }

  let cart = loadCart();

  // Check if item already exists by id
  const existingIndex = cart.findIndex(item => String(item.id) === String(id));
  if (existingIndex > -1) {
    // Increment quantity
    cart[existingIndex].quantity = Math.min(99, (cart[existingIndex].quantity || 1) + 1);
  } else {
    // Add new item with canonical schema
    cart.push({
      id: id,
      model: name,
      price: price,
      quantity: 1,
      image: image,
      dateAdded: new Date().toISOString()
    });
  }

  saveCart(cart);

  // Show brief success message
  showNotification(`${name} u shtua në shportë!`);

  // Redirect to cart page after a brief delay
  setTimeout(() => {
    window.location.href = 'cart.html';
  }, 800);
}

// Show a toast-style notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'cart-notification';
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: #4caf50;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 3000;
    animation: slideIn 0.3s ease;
    font-weight: 500;
  `;
  notification.textContent = `✓ ${message}`;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

// Toggle favorite using professional favorites system
function toggleFavorite() {
  const { id, name, price, image } = getCarDetailsFromPage();

  // Get additional car details
  const details = {
    model: name,
    price: price,
    image: image,
    year: document.querySelector('[data-year]')?.textContent || '',
    km: document.querySelector('[data-km]')?.textContent || '',
    transmission: document.querySelector('[data-transmission]')?.textContent || '',
    fuel: document.querySelector('[data-fuel]')?.textContent || '',
    power: document.querySelector('[data-power]')?.textContent || ''
  };

  // Use professional favorites system
  const isFav = window.FavoritesSystem.toggleFavorite(id, details);

  // Show notification
  if (isFav) {
    showNotification(`❤️ ${name} u shtua në favorita!`);
  } else {
    showNotification(`${name} u hiq nga favorita.`);
  }

  // Update button UI
  updateFavUI();
}

// Update favorite button UI based on favorites system
function updateFavUI() {
  const { id } = getCarDetailsFromPage();
  const isFavorite = window.FavoritesSystem.isFavorited(id);

  const favBtn = document.getElementById('btn-fav');
  if (favBtn) {
    if (isFavorite) {
      favBtn.classList.add('saved');
      favBtn.innerHTML = '<i class="bi bi-heart-fill"></i> ❤️ U shtua në favorita';
      favBtn.style.color = '#e91e63';
      favBtn.title = 'Hiq nga favorita';
    } else {
      favBtn.classList.remove('saved');
      favBtn.innerHTML = '<i class="bi bi-heart"></i> ♡ Favorit';
      favBtn.style.color = '';
      favBtn.title = 'Shto në favorita';
    }
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  updateFavUI();
  
  // Ensure btn-fav has click handler
  const favBtn = document.getElementById('btn-fav');
  if (favBtn && !favBtn.dataset.initialized) {
    favBtn.addEventListener('click', toggleFavorite);
    favBtn.dataset.initialized = 'true';
  }
  
  // Sync cart from localStorage whenever storage changes (from other tabs)
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) {
      updateCartBadge();
    }
  });

  // Listen to favorites changes
  window.addEventListener('favoritesChanged', () => {
    updateFavUI();
  });
});
