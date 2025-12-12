// ================== ELEMENTËT KRYESORË ==================
const filterForm = document.getElementById("filterForm");
const inventoryGrid = document.getElementById("inventoryGrid");
const resultsCount = document.getElementById("resultsCount");
const sortSelect = document.getElementById("sort");
const paginationContainer = document.querySelector(".pagination .pages");
const prevBtn = document.querySelector(".page-btn.prev");
const nextBtn = document.querySelector(".page-btn.next");
const quickViewModal = document.getElementById('quickViewModal');

// ================== STATE ==================
let currentPage = 1;
const itemsPerPage = 8;
let cards = [];
let totalPages = 1;
const STORAGE_FAV_KEY = 'autobesa_favs_v1';
const STORAGE_FILTERS_KEY = 'autobesa_filters_v1';

// ================== HELPERS ==================
function uid(n){ return 'car-' + (n+1); }

function updateResultsCount(visibleCount){
  resultsCount.textContent = `${visibleCount} rezultat(e)`;
}

function getAllCards(){
  return Array.from(document.querySelectorAll('.car-card'));
}

function ensureIds(){
  const all = getAllCards();
  all.forEach((card, i) => {
    if(!card.dataset.id){ card.dataset.id = uid(i); }
    // lazy load images
    const img = card.querySelector('img');
    if(img) img.loading = 'lazy';
    // ensure card-actions exist (fav / details / quickview)
    if(!card.querySelector('.card-actions')){
      const actions = document.createElement('div');
      actions.className = 'card-actions';
      const favBtn = document.createElement('button'); favBtn.className = 'btn-fav'; favBtn.title='Ruaj'; favBtn.innerHTML = '<i class="bi bi-heart"></i>';
      const details = card.querySelector('.btn-detajet');
      const detailsClone = details ? details.cloneNode(true) : document.createElement('a');
      if(!detailsClone.classList.contains('btn-detajet')) detailsClone.className = 'btn-detajet';
      detailsClone.textContent = detailsClone.textContent || 'Shiko detajet';
      const qv = document.createElement('button'); qv.className = 'btn-quickview'; qv.textContent = 'Shiko Shpejt';
      const title = card.querySelector('.car-title'); if(title) qv.dataset.model = title.innerText;
      actions.appendChild(favBtn);
      actions.appendChild(detailsClone);
      actions.appendChild(qv);
      // append actions to .car-info if present
      const info = card.querySelector('.car-info');
      if(info) info.appendChild(actions);
    }
  });
}

function getVisibleCards(){
  return getAllCards().filter(c => c.style.display !== 'none');
}

// ================== PAGINATION ==================
function showPage(page){
  const visible = getAllCards().filter(c => c.dataset._filtered !== 'false');
  totalPages = Math.max(1, Math.ceil(visible.length / itemsPerPage));
  page = Math.min(Math.max(1, page), totalPages);

  visible.forEach(card => card.style.display = 'none');
  const start = (page -1) * itemsPerPage;
  const end = start + itemsPerPage;
  visible.slice(start, end).forEach(card => card.style.display = 'block');

  document.querySelectorAll('.page-number').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.page-number[data-page="${page}"]`);
  if(activeBtn) activeBtn.classList.add('active');

  prevBtn.disabled = page === 1;
  nextBtn.disabled = page === totalPages;
  currentPage = page;
  updateResultsCount(visible.length);
}

function createPageButtons(){
  paginationContainer.innerHTML = '';
  const visible = getAllCards().filter(c => c.dataset._filtered !== 'false');
  totalPages = Math.max(1, Math.ceil(visible.length / itemsPerPage));
  for(let i=1;i<=totalPages;i++){
    const btn = document.createElement('button');
    btn.className = 'page-number';
    btn.dataset.page = i;
    btn.textContent = i;
    if(i===1) btn.classList.add('active');
    btn.addEventListener('click', ()=> showPage(i));
    paginationContainer.appendChild(btn);
  }
}

if(prevBtn && nextBtn){
  prevBtn.addEventListener('click', ()=> { if(currentPage>1) showPage(currentPage-1); });
  nextBtn.addEventListener('click', ()=> { if(currentPage<totalPages) showPage(currentPage+1); });
}

// ================== FILTER + SEARCH (debounced) ==================
let searchTimer = null;
function applyFilters(options = {}){
  const search = (options.search !== undefined) ? options.search : (document.getElementById('search').value || '');
  const brand = (options.brand !== undefined) ? options.brand : document.getElementById('brand').value;
  const price = (options.price !== undefined) ? options.price : document.getElementById('price').value;
  const year = (options.year !== undefined) ? options.year : document.getElementById('year').value;
  const transmission = (options.transmission !== undefined) ? options.transmission : document.getElementById('transmission').value;
  const fuel = (options.fuel !== undefined) ? options.fuel : document.getElementById('fuel').value;

  const lowSearch = search.toLowerCase();

  getAllCards().forEach(card => {
    const cardBrand = card.dataset.brand || '';
    const cardPrice = parseInt(card.dataset.price) || 0;
    const cardYear = parseInt(card.dataset.year) || 0;
    const cardTransmission = card.dataset.transmission || '';
    const cardFuel = card.dataset.fuel || '';
    const cardText = (card.innerText || '').toLowerCase();

    let show = true;
    if(lowSearch && !cardText.includes(lowSearch)) show = false;
    if(brand && cardBrand !== brand) show = false;
    if(price && cardPrice > parseInt(price)) show = false;
    if(year && cardYear < parseInt(year)) show = false;
    if(transmission && cardTransmission !== transmission) show = false;
    if(fuel && cardFuel !== fuel) show = false;

    card.dataset._filtered = show ? 'true' : 'false';
    // hide immediately; pagination will show subset
    card.style.display = show ? 'block' : 'none';
  });

  // persist filters
  const toSave = { search, brand, price, year, transmission, fuel };
  try { localStorage.setItem(STORAGE_FILTERS_KEY, JSON.stringify(toSave)); } catch(e){}

  createPageButtons();
  showPage(1);
}

if(filterForm){
  // restore filters
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_FILTERS_KEY));
    if(saved){
      ['search','brand','price','year','transmission','fuel'].forEach(k => { if(saved[k] !== undefined && document.getElementById(k)) document.getElementById(k).value = saved[k]; });
    }
  }catch(e){}

  // submit
  filterForm.addEventListener('submit', e => { e.preventDefault(); applyFilters(); });

  // debounced search on input
  const searchInput = document.getElementById('search');
  if(searchInput){
    searchInput.addEventListener('input', ()=>{
      clearTimeout(searchTimer);
      searchTimer = setTimeout(()=> applyFilters({ search: searchInput.value }), 350);
    });
  }

  // reset behavior
  filterForm.addEventListener('reset', ()=>{
    setTimeout(()=>{
      ['search','brand','price','year','transmission','fuel'].forEach(k => { if(document.getElementById(k)) document.getElementById(k).value = ''; });
      try{ localStorage.removeItem(STORAGE_FILTERS_KEY); }catch(e){}
      applyFilters({ search: '', brand: '', price:'', year:'', transmission:'', fuel:'' });
    }, 50);
  });
}

// ================== SORTIMI ==================
if(sortSelect){
  sortSelect.addEventListener('change', ()=>{
    const all = getAllCards();
    all.sort((a,b)=>{
      const priceA = parseInt(a.dataset.price) || 0;
      const priceB = parseInt(b.dataset.price) || 0;
      const yearA = parseInt(a.dataset.year) || 0;
      const yearB = parseInt(b.dataset.year) || 0;
      const kmA = parseInt(a.dataset.km) || 0;
      const kmB = parseInt(b.dataset.km) || 0;

      switch(sortSelect.value){
        case 'priceAsc': return priceA - priceB;
        case 'priceDesc': return priceB - priceA;
        case 'yearDesc': return yearB - yearA;
        case 'kmAsc': return kmA - kmB;
        default: return 0;
      }
    });
    // append in order
    all.forEach(c => inventoryGrid.appendChild(c));
    createPageButtons();
    showPage(1);
  });
}

// ================== FAVORITES ==================
function loadFavorites(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_FAV_KEY)) || []; }catch(e){ return []; }
}

function saveFavorites(list){ 
  try{ 
    localStorage.setItem(STORAGE_FAV_KEY, JSON.stringify(list)); 
    updateFavBadge(); // Update navbar badge
  }catch(e){} 
}

function updateFavBadge(){
  const badges = document.querySelectorAll('.fav-count');
  const list = loadFavorites();
  badges.forEach(badge => {
    badge.textContent = list.length;
    badge.style.display = list.length > 0 ? 'inline-block' : 'none';
  });
}

function toggleFavorite(id){
  const list = loadFavorites();
  const idx = list.indexOf(id);
  const card = document.querySelector(`[data-id="${id}"]`);
  const carName = card?.querySelector('.car-title')?.innerText || 'Makina';
  
  if(idx === -1){ 
    list.push(id); 
    showFavoriteNotification(`❤️ ${carName} u shtua në favorita!`, 'success');
  } else { 
    list.splice(idx,1);
    showFavoriteNotification(`${carName} u hiq nga favorita.`, 'removed');
  }
  saveFavorites(list);
  updateFavUI();
}

// Show professional notification for favorites
function showFavoriteNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 90px;
    right: 20px;
    background: ${type === 'success' ? '#4caf50' : '#666'};
    color: white;
    padding: 14px 20px;
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    z-index: 3100;
    animation: slideIn 0.35s cubic-bezier(0.35, 0, 0.25, 1);
    font-weight: 500;
    font-size: 0.95rem;
  `;
  notification.textContent = `✓ ${message}`;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

function updateFavUI(){
  const list = loadFavorites();
  getAllCards().forEach(card => {
    const btn = card.querySelector('.btn-fav');
    if(btn){
      if(list.includes(card.dataset.id)) btn.classList.add('saved'); else btn.classList.remove('saved');
    }
  });
  // also update modal fav if open
  const modalFav = document.querySelector('.qv-fav');
  if(modalFav){
    const openId = quickViewModal && quickViewModal.dataset.openId;
    if(openId){ modalFav.classList.toggle('saved', loadFavorites().includes(openId)); }
  }
}

// ================== QUICK VIEW ==================
function openQuickView(card){
  if(!quickViewModal) return;
  const img = card.querySelector('img');
  const title = card.querySelector('.car-title')?.innerText || '';
  const meta = card.querySelector('.car-meta')?.innerText || '';
  const price = card.querySelector('.price')?.innerText || '';
  const detailsHref = card.querySelector('.btn-detajet')?.getAttribute('href') || '#';

  quickViewModal.querySelector('.qv-image img').src = img ? img.src : '';
  quickViewModal.querySelector('.qv-image img').alt = img ? img.alt : '';
  quickViewModal.querySelector('#qv-title').innerText = title;
  quickViewModal.querySelector('.qv-meta').innerText = meta;
  quickViewModal.querySelector('.qv-price').innerText = price;
  quickViewModal.querySelector('.qv-details').href = detailsHref;
  quickViewModal.dataset.openId = card.dataset.id;
  quickViewModal.setAttribute('aria-hidden','false');
  quickViewModal.classList.add('open');
  updateFavUI();
}

function closeQuickView(){
  if(!quickViewModal) return;
  quickViewModal.setAttribute('aria-hidden','true');
  quickViewModal.classList.remove('open');
  delete quickViewModal.dataset.openId;
}

// click delegation
document.addEventListener('click', (e)=>{
  const fav = e.target.closest('.btn-fav');
  if(fav){
    const card = fav.closest('.car-card');
    if(card){ toggleFavorite(card.dataset.id); }
    return;
  }

  const qvBtn = e.target.closest('.btn-quickview');
  if(qvBtn){
    const card = qvBtn.closest('.car-card');
    if(card) openQuickView(card);
    return;
  }

    // add-to-cart button (support multiple classes used across templates)
    const atc = e.target.closest('.btn-addtocart, .btn-cart-add, .btn-add-to-cart');
    if(atc){
      const card = atc.closest('.car-card');
      if(card) addToCartFromCard(card);
      return;
    }

    // open favorites panel from navbar
    const navFavs = e.target.closest('.btn-favs');
    if(navFavs){ toggleFavoritesPanel(); return; }

    // open cart modal from navbar OR navigate to cart page
    const navCart = e.target.closest('.btn-cart');
    if(navCart){
      // if it's an anchor with href, allow default navigation to that href (likely cart.html)
      const href = navCart.getAttribute && navCart.getAttribute('href');
      if(href){ return; }
      // otherwise navigate to cart page
      window.location.href = 'cart.html';
      return;
    }

  const qvClose = e.target.closest('.qv-close');
  if(qvClose){ closeQuickView(); return; }

  const qvFav = e.target.closest('.qv-fav');
  if(qvFav){
    const id = quickViewModal.dataset.openId;
    if(id) toggleFavorite(id);
    return;
  }
});

// keyboard
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeQuickView(); });

// ================== CART ==================
function loadCart(){ try{ return JSON.parse(localStorage.getItem('autobesa_cart_v1')) || []; }catch(e){ return []; } }
function saveCart(cart){ try{ localStorage.setItem('autobesa_cart_v1', JSON.stringify(cart)); }catch(e){} }

function addToCartFromCard(card, qty = 1){
  // normalize and delegate to unified addToCart (stores consistent schema)
  const id = card.dataset.id || String(Date.now());
  const title = card.querySelector('.car-title')?.innerText || '';
  const priceText = (card.querySelector('.price')?.innerText || '').replace(/[€,\s,]/g,'');
  const price = parseFloat(priceText) || parseInt(card.dataset.price) || 0;
  const img = card.querySelector('img')?.src || '';
  // use unified addToCart which stores { id, model, price, quantity, image }
  addToCart(title, price, img, id, qty);
}

function removeFromCart(id){ const cart = loadCart().filter(i => i.id !== id); saveCart(cart); renderCart(); renderCartCount(); }
function updateCartQty(id, qty){ const cart = loadCart(); const it = cart.find(i => i.id===id); if(it){ it.quantity = Math.max(1, Math.min(99, qty)); saveCart(cart); renderCart(); renderCartCount(); } }

function renderCartCount(){ const cart = loadCart(); const count = cart.reduce((s,i)=> s + (i.quantity||0), 0); document.querySelectorAll('.cart-count').forEach(el => el.textContent = count); }

function renderCart(){
  const container = document.querySelector('.cart-items');
  if(!container) return;
  const cart = loadCart();
  container.innerHTML = '';
  let total = 0;
  if(cart.length === 0){ container.innerHTML = '<p>Shporta është e zbrazët.</p>'; }
  cart.forEach(item =>{
    const qty = item.quantity || item.qty || 1;
    const price = Number(item.price) || 0;
    total += (price * qty);
    const el = document.createElement('div'); el.className = 'cart-item';
    el.innerHTML = `
      <img src="${item.image || item.img || ''}" alt="${item.model || item.title}">
      <div class="ci-meta">
        <strong>${item.model || item.title}</strong>
        <div>${formatPrice(price)} x <input class="ci-qty" data-id="${item.id}" type="number" value="${qty}" min="1" max="99" style="width:60px;"></div>
      </div>
      <div class="ci-actions">
        <div class="ci-sub">${formatPrice(price * qty)}</div>
        <button class="btn-ghost btn-remove" data-id="${item.id}">Hiq</button>
      </div>`;
    container.appendChild(el);
  });
  document.querySelectorAll('.total-amount').forEach(el => el.textContent = formatPrice(total));
}

function formatPrice(n){ return '€' + Number(n).toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0}); }

function openCartModal(){ const modal = document.getElementById('cartModal'); if(!modal) return; renderCart(); modal.style.display = 'flex'; modal.setAttribute('aria-hidden','false'); }
function closeCartModal(){ const modal = document.getElementById('cartModal'); if(!modal) return; modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); }

// cart modal events
document.addEventListener('click', (e)=>{
  const rem = e.target.closest('.btn-remove'); if(rem){ removeFromCart(rem.dataset.id); return; }
  const atcQuick = e.target.closest('.add-to-cart-quick'); if(atcQuick){ const id = atcQuick.dataset.id; const card = document.querySelector(`.car-card[data-id="${id}"]`); if(card) addToCartFromCard(card); return; }
  const cartClose = e.target.closest('.cart-close'); if(cartClose){ closeCartModal(); return; }
  const clear = e.target.closest('.btn-clear-cart'); if(clear){ saveCart([]); renderCart(); renderCartCount(); closeCartModal(); return; }
});

// qty change inside cart
document.addEventListener('input', (e)=>{
  if(e.target.classList && e.target.classList.contains('ci-qty')){
    const id = e.target.dataset.id; const v = parseInt(e.target.value) || 1; updateCartQty(id, v);
  }
});

// small toast when adding
function showAddToCartToast(title){
  // simple ephemeral toast using alert for now; can be replaced with nicer UI
  const t = document.createElement('div'); t.className = 'atc-toast'; t.textContent = `${title} u shtua në shportë.`; t.style.position='fixed'; t.style.right='16px'; t.style.bottom='16px'; t.style.background='#0d47a1'; t.style.color='#fff'; t.style.padding='10px 12px'; t.style.borderRadius='8px'; t.style.zIndex='3000'; document.body.appendChild(t);
  setTimeout(()=> t.style.opacity = '0', 1400);
  setTimeout(()=> t.remove(), 1800);
}

// favorites panel toggle
function toggleFavoritesPanel(){ const panel = document.getElementById('favoritesPanel'); if(!panel) return; const isOpen = panel.style.display === 'block'; if(isOpen){ panel.style.display='none'; panel.setAttribute('aria-hidden','true'); } else { renderFavorites(); panel.style.display='block'; panel.setAttribute('aria-hidden','false'); }
}

function renderFavorites(){ const list = loadFavorites(); const container = document.querySelector('.favorites-list'); if(!container) return; container.innerHTML = ''; if(list.length === 0){ container.innerHTML = '<p>Nuk keni favoritet.</p>'; return; }
  list.forEach(id => {
    const card = document.querySelector(`.car-card[data-id="${id}"]`);
    if(!card) return;
    const img = card.querySelector('img')?.src || '';
    const title = card.querySelector('.car-title')?.innerText || '';
    const price = card.querySelector('.price')?.innerText || '';
    const item = document.createElement('div'); item.className = 'fav-item';
    item.innerHTML = `<img src="${img}" alt="${title}"><div class="meta"><strong>${title}</strong><div>${price}</div></div><div><button class="btn-ghost btn-fav-remove" data-id="${id}">Hiqu</button></div>`;
    container.appendChild(item);
  });
}

// ================== CART FUNCTIONS ==================
const STORAGE_CART_KEY = 'autobesa_cart_v1';

function addToCart(modelName, price, image = '', id = null, qty = 1) {
  try {
    // Use canonical storage helpers
    const cartKey = STORAGE_CART_KEY;
    let cart = loadCart();
    // try to find existing by id or by model+price
    let existing = null;
    if(id) existing = cart.find(i => String(i.id) === String(id));
    if(!existing) existing = cart.find(i => (i.model === modelName && Number(i.price) === Number(price)));
    if(existing){
      existing.quantity = Math.min(99, (existing.quantity || existing.qty || 0) + qty);
    } else {
      const item = {
        id: id || Date.now(),
        model: modelName,
        price: Number(price) || 0,
        quantity: qty,
        image: image || '',
        dateAdded: new Date().toISOString()
      };
      cart.push(item);
    }
    saveCart(cart);
    updateCartUI();
    renderCartCount();
    renderCart();
    showCartNotification(modelName);
  } catch (e) {
    console.error('Cart error:', e);
  }
}

function removeFromCart(itemId) {
  try {
    let cart = loadCart();
    cart = cart.filter(item => String(item.id) !== String(itemId));
    saveCart(cart);
    updateCartUI();
    renderCartCount();
    renderCart();
  } catch (e) {
    console.error('Cart error:', e);
  }
}

function clearCart() {
  try {
    localStorage.removeItem(STORAGE_CART_KEY);
    updateCartUI();
  } catch (e) {
    console.error('Cart error:', e);
  }
}

function getCartItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function updateCartUI() {
  const cartBtn = document.querySelector('.btn-cart');
  const cartCountEl = document.querySelector('.cart-count');
  const cart = loadCart();
  // Show total quantity
  const count = cart.reduce((s,i) => s + (i.quantity || i.qty || 0), 0);
  if (cartCountEl) {
    cartCountEl.textContent = count;
    cartCountEl.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

function showCartNotification(modelName) {
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
  `;
  notification.textContent = `✓ ${modelName} u shtua në shportë!`;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

// favorites panel remove
document.addEventListener('click', (e)=>{ const remFav = e.target.closest('.btn-fav-remove'); if(remFav){ const id = remFav.dataset.id; toggleFavorite(id); renderFavorites(); } const panelClose = e.target.closest('.panel-close'); if(panelClose){ const p = panelClose.closest('.panel'); if(p){ p.style.display='none'; p.setAttribute('aria-hidden','true'); } } });

// wire cart close
document.addEventListener('click', (e)=>{ const cartModalEl = document.getElementById('cartModal'); if(cartModalEl && e.target === cartModalEl) closeCartModal(); });

// ================== INIT ==================
window.addEventListener('DOMContentLoaded', ()=>{
  ensureIds();
  // mark all as not filtered initially
  getAllCards().forEach(c => c.dataset._filtered = 'true');
  // restore filters and apply
  try{ const saved = JSON.parse(localStorage.getItem(STORAGE_FILTERS_KEY)); if(saved) applyFilters(saved); else { createPageButtons(); showPage(1); } }catch(e){ createPageButtons(); showPage(1); }
  // wire modal close
  if(quickViewModal){ quickViewModal.querySelector('.qv-close')?.addEventListener('click', closeQuickView); quickViewModal.addEventListener('click', (ev)=>{ if(ev.target === quickViewModal) closeQuickView(); }); }
  // update favorites UI
  updateFavUI();
  updateFavBadge();
  
  // Sync favorites from other tabs/windows
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_FAV_KEY) {
      updateFavUI();
      updateFavBadge();
    }
  });
});
