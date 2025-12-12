// Navbar badge sync across all pages
// This script syncs cart and favorites badge counts from localStorage

const CART_KEY = 'autobesa_cart_v1';
const FAVS_KEY = 'autobesa_favs_v1';

// Update cart badge
function updateCartBadgeNavbar() {
  const badges = document.querySelectorAll('.cart-count');
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    });
  } catch (e) {
    badges.forEach(badge => badge.textContent = '0');
  }
}

// Update favorites badge
function updateFavBadgeNavbar() {
  const badges = document.querySelectorAll('.fav-count');
  try {
    const favs = JSON.parse(localStorage.getItem(FAVS_KEY)) || [];
    badges.forEach(badge => {
      badge.textContent = favs.length;
      badge.style.display = favs.length > 0 ? 'inline-block' : 'none';
    });
  } catch (e) {
    badges.forEach(badge => badge.textContent = '0');
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    updateCartBadgeNavbar();
    updateFavBadgeNavbar();
    
    // Listen for storage changes from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === CART_KEY) updateCartBadgeNavbar();
      if (e.key === FAVS_KEY) updateFavBadgeNavbar();
    });
  });
} else {
  // If already loaded
  updateCartBadgeNavbar();
  updateFavBadgeNavbar();
  
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) updateCartBadgeNavbar();
    if (e.key === FAVS_KEY) updateFavBadgeNavbar();
  });
}
