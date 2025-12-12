// Cart page script
const CART_KEY = 'autobesa_cart_v1';
const ORDERS_KEY = 'autobesa_orders_v1';

function formatCurrency(n){ return '€' + (n/100).toLocaleString('en-GB', {minimumFractionDigits:2, maximumFractionDigits:2}); }

function centsFromNumber(num){ // accepts number in euros or integer
  // ensure cents (integer)
  if(!num) return 0;
  if(Number.isInteger(num)) return Math.round(num*100);
  return Math.round(Number(num)*100);
}

function getCart(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)) || []; }catch(e){ return []; } }
function saveCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartBadge(); }

function updateCartBadge(){ const badge = document.querySelector('.cart-count'); const count = getCart().reduce((s,i)=>s+ (i.quantity||1),0); if(badge){ badge.textContent = count; badge.style.display = count>0? 'inline-block':'none'; } }

function renderCart(){ const list = document.getElementById('cartList'); list.innerHTML = ''; const cart = getCart(); if(cart.length===0){ list.innerHTML = '<div class="alert alert-info">Shporta është bosh. <a href="makinat.html">Vazhdo blerjet</a></div>'; updateTotals(); return; }
  cart.forEach(item=>{
    const qty = item.quantity || 1;
    const unitCents = Math.round((Number(item.price) || 0) * 100);
    const lineCents = unitCents * qty;
    const el = document.createElement('div'); el.className = 'cart-item';
    el.innerHTML = `
      <img src="${item.image || 'placeholder.jpg'}" alt="${item.model}" />
      <div class="ci-meta">
        <h5>${item.model}</h5>
        <p class="ci-unit">Çmimi njësi: <strong>${formatCurrency(unitCents)}</strong></p>
        ${item.year || item.km || item.transmission ? `<p class="ci-opts text-muted small">${item.year?item.year:''} ${item.km? '· ' + item.km + ' km':''} ${item.transmission? '· ' + item.transmission : ''}</p>` : ''}
      </div>
      <div class="ms-auto d-flex align-items-center gap-3">
        <input class="qty-input" type="number" min="1" value="${qty}" data-id="${item.id}" />
        <div class="ci-line-total">${formatCurrency(lineCents)}</div>
        <button class="btn btn-outline-danger btn-sm btn-remove" data-id="${item.id}"><i class="bi bi-trash"></i></button>
      </div>
    `;
    list.appendChild(el);
  });
  // wire events
  document.querySelectorAll('.qty-input').forEach(inp=>{ inp.addEventListener('change', (e)=>{ const id = e.target.dataset.id; let val = parseInt(e.target.value) || 1; if(val<1) val=1; updateQuantity(id, val); e.target.value = val; }); });
  document.querySelectorAll('.btn-remove').forEach(b=>{ b.addEventListener('click', (e)=>{ const id = e.currentTarget.dataset.id; removeItem(id); }); });
  updateTotals();
}

function updateQuantity(id, qty){ const cart = getCart(); const idx = cart.findIndex(i=>String(i.id)===String(id)); if(idx>-1){ cart[idx].quantity = qty; saveCart(cart); updateTotals(); } }

function removeItem(id){ let cart = getCart(); cart = cart.filter(i=>String(i.id)!==String(id)); saveCart(cart); renderCart(); }

function clearCart(){ localStorage.removeItem(CART_KEY); updateCartBadge(); renderCart(); }

function updateTotals(){ const cart = getCart(); const subtotalCents = cart.reduce((s,i)=> s + ( (i.price||0) * (i.quantity||1) * 100 ), 0); // price stored as number (e.g., 45900) -> convert to cents
  // Note: prices in our site are whole-euro numbers (e.g., 45900 means €45,900) but earlier addToCart stored price as number (45900). We'll treat that number as EUR amount, so convert properly.
  // If values are in euros with decimals, the multiplication above will still work because we multiply by 100.
  const taxCents = Math.round(subtotalCents * 0.18);
  const shippingCents = subtotalCents >= 50000*100 ? 0 : 500; // €5.00 default shipping (in cents)
  const totalCents = subtotalCents + taxCents + shippingCents;
  // Display (convert cents to euros by dividing by 100)
  const subtotalEl = document.getElementById('subtotal');
  const taxesEl = document.getElementById('taxes');
  const shippingEl = document.getElementById('shipping');
  const totalEl = document.getElementById('total');
  if(subtotalEl) subtotalEl.textContent = formatCurrency(subtotalCents);
  if(taxesEl) taxesEl.textContent = formatCurrency(taxCents);
  if(shippingEl) shippingEl.textContent = formatCurrency(shippingCents);
  if(totalEl) totalEl.textContent = formatCurrency(totalCents);
  return { subtotalCents, taxCents, shippingCents, totalCents };
}

// Checkout handling
function handleCheckout(ev){
  ev.preventDefault();
  const cart = getCart();
  if(cart.length===0){ alert('Shporta është bosh.'); return; }

  const form = ev.target;
  const data = Object.fromEntries(new FormData(form).entries()); // fullname,email,phone,address,payment
  // simple validation
  if(!data.fullname || !data.email || !data.phone || !data.address){ alert('Ju lutem plotësoni të gjithë fushat e nevojshme.'); return; }

  // prepare order
  const totals = updateTotals();
  const order = {
    id: 'order-' + Date.now(),
    createdAt: new Date().toISOString(),
    customer: data,
    items: getCart(),
    totals: totals
  };

  // save order to localStorage (orders history)
  try{
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
    orders.push(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }catch(e){ console.error('Could not save order', e); }

  // clear cart
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
  renderCart();

  // redirect to order confirmation with order id in hash (printable invoice available there)
  try{
    const url = new URL(window.location.href);
    // construct a path to order-confirmation.html in same folder
    url.pathname = url.pathname.replace(/\/[^\/]*$/, '/order-confirmation.html');
    url.hash = order.id;
    // small delay to allow storage writes
    setTimeout(()=>{ window.location.href = url.toString(); }, 200);
  }catch(e){
    // fallback: show confirmation inline
    const result = document.getElementById('orderResult');
    if(result) result.innerHTML = `<div class="order-success">Porosia u dërgua me sukses! Nr. porosisë: <strong>${order.id}</strong>. Do t'ju kontaktojmë në ${order.customer.phone}.</div>`;
    window.scrollTo({top:0, behavior:'smooth'});
  }
}

// init
window.addEventListener('DOMContentLoaded', ()=>{
  // ensure data format compatibility: if items stored with price like 45900 (means €45,900), we will treat that as euros and display as such.
  // If prices are thousands (like 45900), they come from earlier files as whole-euro numbers; our display expects cents. We'll detect pattern: if price > 10000, assume it's full euros without decimals (e.g., 45900 => €45,900.00)
  // First-run: normalize cart items so price field becomes euro amount (float). We'll convert stored price to number and keep it.
  const cart = getCart();
  let changed = false;
  cart.forEach(i=>{ if(typeof i.price === 'string') i.price = Number(i.price); if(i.price && i.price>1000){ /* likely whole euros */ /* keep as-is */ } });
  if(changed) saveCart(cart);

  renderCart();
  updateCartBadge();

  document.getElementById('clearCartBtn').addEventListener('click', ()=>{ if(confirm('A jeni i sigurt që doni të pastroni shportën?')) clearCart(); });
  document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
});
