// complet.js
import { supabase } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadProducts();
  checkSession();
});
 
export async function loadProducts(categoryId = null) {
  const cacheKey = categoryId ? `products_${categoryId}` : 'products_all';
  const cached = getCache(cacheKey);
  if (cached) {
    renderProducts(cached);
    return;
  }
  showLoader();
  let query = supabase.from('products').select('*, category_id ( name )');
  if (categoryId) query = query.eq('category_id', categoryId);
  const { data, error } = await query;
  hideLoader();
  if (error) return showToast(error.message, 'error');
  setCache(cacheKey, data, 300); // temps pour le cache
  renderProducts(data);
}
function renderProducts(data) {
  const container = document.getElementById('productsContainer');
  if (!container) return;
  container.innerHTML = '';
  data.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-img" onclick="window.location.href='product-details.html?id=${p.id}&category=${p.category_id?.id || ''}'">
        <img src="${p.image_url}" alt="${p.name}">
        <div class="product-overlay-info">
          <div class="product-overlay-title">${p.name}</div>
          <div class="product-overlay-price">${p.price} FCFA</div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}
 
export async function loadCategories() {
  const cacheKey = 'categories_all';
  const cached = getCache(cacheKey);
  if (cached) {
    renderCategories(cached);
    return;
  }
  showLoader();
  const { data, error } = await supabase.from('categories').select('*');
  hideLoader();
  if (error) return showToast(error.message, 'error');
  setCache(cacheKey, data, 300); // 5 min
  renderCategories(data);
}
function renderCategories(data) {
  const slider = document.getElementById('categorySlider');
  if (!slider) return;
  slider.innerHTML = '';
  data.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-slide';
    btn.textContent = cat.name;
    btn.onclick = () => loadProducts(cat.id);
    slider.appendChild(btn);
  });
}

// --------------------
// 🛒 Panier localStorage
window.addToCart = (productId) => {
  showLoader();
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const existing = cart.find(p => p.id === productId);
  if (existing) {
    existing.quantity += 1;
    localStorage.setItem('cart', JSON.stringify(cart));
    showToast('Ajouté au panier !');
    updateCartCount();
    renderCartSidebar();
    openCartSidebar();
  } else {
    fetchProduct(productId).then(p => {
      cart.push({ id: p.id, name: p.name, price: p.price, image: p.image_url, quantity: 1 });
      localStorage.setItem('cart', JSON.stringify(cart));
      showToast('Ajouté au panier !');
      updateCartCount();
      renderCartSidebar();
      openCartSidebar();
    });
  }
  hideLoader();
};

async function fetchProduct(id) {
  showLoader();
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
  hideLoader();
  if (error) throw error;
  return data;
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const count = cart.reduce((s, p) => s + p.quantity, 0);
  document.querySelector('.cart-count').textContent = count;
}

function renderCartSidebar() {
  showLoader();
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const itemsContainer = document.getElementById('cartItems');
  const totalContainer = document.getElementById('cartTotal');
  if (!itemsContainer || !totalContainer) return;
  itemsContainer.innerHTML = '';
  if (cart.length === 0) {
    itemsContainer.innerHTML = `<div class="empty-cart-message" style="text-align: center; padding: 40px; color: #888;">
      <i class="fas fa-shopping-bag" style="font-size: 3rem; margin-bottom: 20px;"></i>
      <p>Votre panier est vide</p>
    </div>`;
    totalContainer.textContent = '0 FCFA';
    return;
  }
  let total = 0;
  cart.forEach((item, i) => {
    total += item.price * item.quantity;
    itemsContainer.innerHTML += `
      <div class="cart-item">
        <div class="cart-item-img"><img src="${item.image || ''}" alt="${item.name}"></div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${item.price} FCFA</div>
          <div>Qté: <input type="number" min="1" value="${item.quantity}" onchange="updateCartQty(${i}, this.value)"></div>
          <div class="cart-item-remove" onclick="removeCartItem(${i})">Supprimer</div>
        </div>
      </div>
    `;
  });
  totalContainer.textContent = total + ' FCFA';
  // Ajouter le bouton WhatsApp
  const whatsappBtnId = 'whatsappCartBtn';
  if (!document.getElementById(whatsappBtnId)) {
    const cartFooter = document.querySelector('.cart-footer');
    const btn = document.createElement('button');
    btn.id = whatsappBtnId;
    btn.className = 'checkout-btn';
    btn.innerHTML = '<i class="fab fa-whatsapp"></i> Commander via WhatsApp';
    btn.onclick = sendCartToWhatsApp;
    cartFooter.appendChild(btn);
  }
  hideLoader();
}

function sendCartToWhatsApp() {
  showLoader();
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  if (cart.length === 0) return;
  let message = 'Bonjour,\nJe souhaite passer une commande sur Le Coffret Cadeau.\n';
  message += '\nDétail de ma commande :\n';
  cart.forEach(item => {
    message += `- ${item.name} x${item.quantity} (${item.price} FCFA)\n`;
  });
  const total = cart.reduce((s, p) => s + p.price * p.quantity, 0);
  message += `\nTotal : ${total} FCFA`;
  message += '\n\nMerci de me confirmer la disponibilité et le délai de livraison.';
  const phone = '22891323090';
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
  hideLoader();
}

window.updateCartQty = (index, qty) => {
  showLoader();
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart[index].quantity = parseInt(qty);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCartSidebar();
  updateCartCount();
  hideLoader();
};
window.removeCartItem = (index) => {
  showLoader();
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart.splice(index, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCartSidebar();
  updateCartCount();
  hideLoader();
};
function openCartSidebar() {
  document.getElementById('cartSidebar').classList.add('open');
}
function closeCartSidebar() {
  document.getElementById('cartSidebar').classList.remove('open');
}
document.getElementById('cartIcon')?.addEventListener('click', () => {
  renderCartSidebar();
  openCartSidebar();
});
document.getElementById('closeCart')?.addEventListener('click', closeCartSidebar);
// Initialiser le compteur panier au chargement
updateCartCount();
renderCartSidebar();

// --- Avis client ---
document.getElementById('reviewForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  showLoader();
  const name = document.getElementById('reviewName').value;
  const email = document.getElementById('reviewEmail').value;
  const comment = document.getElementById('reviewComment').value;
  const rating = parseInt(document.getElementById('reviewRating').value);
  const productId = document.getElementById('productId').value;
  const { error } = await supabase.from('reviews').insert({
    name, email, comment, rating, product_id: productId
  });
  hideLoader();
  if (error) showToast(error.message, 'error');
  else {
    showToast('Merci pour votre avis !');
    e.target.reset();
  }
});

export async function loadReviews(productId) {
  showLoader();
  const { data, error } = await supabase.from('reviews').select('*').eq('product_id', productId);
  hideLoader();
  if (error) return showToast(error.message, 'error');
  const container = document.getElementById('reviewsContainer');
  if (!container) return;
  container.innerHTML = '';
  data.forEach(r => {
    container.innerHTML += `
      <div>
        <strong>${r.name}</strong> - ${'★'.repeat(r.rating)}
        <p>${r.comment}</p>
      </div>
    `;
  });
}

// --------------------
// 🔑 Authentification
// Inscription
const signupForm = document.getElementById('signupForm');
signupForm?.addEventListener('submit', async e => {
  e.preventDefault();
  showLoader();
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const { error } = await supabase.auth.signUp({ email, password });
  hideLoader();
  if (error) showToast(error.message, 'error');
  else showToast('Inscription réussie ! Vérifiez vos emails.');
});
// Connexion
const loginForm = document.getElementById('loginForm');
loginForm?.addEventListener('submit', async e => {
  e.preventDefault();
  showLoader();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  hideLoader();
  if (error) showToast(error.message, 'error');
  else {
    showToast('Connecté !');
    window.location.reload();
  }
});
// Vérifier session
export async function checkSession() {
  showLoader();
  const { data: { session } } = await supabase.auth.getSession();
  hideLoader();
  if (session) {
    // Masquer les boutons connexion/inscription
    document.getElementById('goToLogin').style.display = 'none';
    document.getElementById('goToRegister').style.display = 'none';
    
  } else {
    // Afficher les boutons connexion/inscription, masquer l’icône user
    document.getElementById('goToLogin').style.display = '';
    document.getElementById('goToRegister').style.display = '';
    document.getElementById('userInfoContainer').style.display = 'none';
    // Masquer l'icône de déconnexion si présente
    const logoutIcon = document.getElementById('logoutIcon');
    if (logoutIcon) logoutIcon.style.display = 'none';
  }
}
// Déconnexion
window.logout = async () => {
  showLoader();
  await supabase.auth.signOut();
  showToast('Déconnecté');
  window.location.reload();
  hideLoader();
}; 

// Après checkSession()
function updateReviewFormUserFields(session) {
  const userFields = document.getElementById('reviewUserFields');
  const nameInput = document.getElementById('reviewName');
  const emailInput = document.getElementById('reviewEmail');
  if (session) {
    // Masquer les champs nom/email et préremplir
    userFields.style.display = 'none';
    const name = session.user.user_metadata?.name || session.user.email;
    const email = session.user.email;
    nameInput.value = name;
    emailInput.value = email;
  } else {
    userFields.style.display = '';
    nameInput.value = '';
    emailInput.value = '';
  }
}
// Appeler après checkSession
checkSession().then(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    updateReviewFormUserFields(session);
  });
});
// Adapter la soumission du formulaire d'avis
const reviewForm = document.getElementById('reviewForm');
reviewForm?.addEventListener('submit', async e => {
  e.preventDefault();
  showLoader();
  let name, email;
  const session = (await supabase.auth.getSession()).data.session;
  if (session) {
    name = session.user.user_metadata?.name || session.user.email;
    email = session.user.email;
  } else {
    name = document.getElementById('reviewName').value;
    email = document.getElementById('reviewEmail').value;
  }
  const comment = document.getElementById('reviewComment').value;
  const rating = parseInt(document.getElementById('reviewRating').value);
  const productId = document.getElementById('productId')?.value;
  const { error } = await supabase.from('reviews').insert({
    name, email, comment, rating, product_id: productId
  });
  hideLoader();
  if (error) showToast(error.message, 'error');
  else {
    showToast('Merci pour votre avis !');
    e.target.reset();
    updateReviewFormUserFields(session); // Remettre les champs masqués si connecté
  }
}); 

// --- Système de cache localStorage (5 min)
function setCache(key, data, ttl = 300) {
  const expires = Date.now() + ttl * 1000;
  localStorage.setItem(key, JSON.stringify({ data, expires }));
}
function getCache(key) {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  const { data, expires } = JSON.parse(cached);
  if (Date.now() > expires) {
    localStorage.removeItem(key);
    return null;
  }
  return data;
} 

// Menu mobile burger
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
const closeMenuBtn = document.getElementById('closeMenuBtn');
menuToggle?.addEventListener('click', () => {
  navLinks.classList.toggle('active');
  if (navLinks.classList.contains('active')) {
    closeMenuBtn.style.display = 'block';
  } else {
    closeMenuBtn.style.display = 'none';
  }
});
closeMenuBtn?.addEventListener('click', () => {
  navLinks.classList.remove('active');
  closeMenuBtn.style.display = 'none';
});
// Toast moderne et professionnel
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Icônes modernes
  const icons = {
    success: '<i class="fas fa-check-circle"></i>',
    error: '<i class="fas fa-exclamation-circle"></i>',
    warning: '<i class="fas fa-exclamation-triangle"></i>',
    info: '<i class="fas fa-info-circle"></i>'
  };
  
  // Couleurs modernes
  const colors = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6'
  };
  
  toast.style.cssText = `
    min-width: 320px;
    max-width: 420px;
    background: white;
    color: #1F2937;
    padding: 16px 20px;
    border-radius: 12px;
    font-weight: 500;
    font-size: 0.95rem;
    box-shadow: 0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.08);
    display: flex;
    align-items: center;
    gap: 12px;
    border-left: 4px solid ${colors[type]};
    animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    position: relative;
    overflow: hidden;
    z-index: 10000;
  `;
  
  toast.innerHTML = `
    <div style="color: ${colors[type]}; font-size: 1.2rem; flex-shrink: 0;">${icons[type]}</div>
    <div style="flex: 1; line-height: 1.4;">${message}</div>
    <button onclick="this.parentElement.remove()" style="
      background: none;
      border: none;
      color: #9CA3AF;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      font-size: 1.1rem;
      transition: color 0.2s;
      flex-shrink: 0;
    " onmouseover="this.style.color='#6B7280'" onmouseout="this.style.color='#9CA3AF'">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  container.appendChild(toast);
  
  // Auto-remove après 4 secondes
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-in-out';
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 300);
  }, 4000);
}
// Loader global
function showLoader() {
  document.getElementById('globalLoader').style.display = 'flex';
}
function hideLoader() {
  document.getElementById('globalLoader').style.display = 'none';
} 