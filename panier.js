// panier.js
import { supabase } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  renderCart();
});

// 🛒 Charger panier
function renderCart() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const container = document.getElementById('cartContainer');
  container.innerHTML = '';

  if (cart.length === 0) {
    container.innerHTML = '<p>Votre panier est vide.</p>';
    return;
  }

  cart.forEach((item, i) => {
    container.innerHTML += `
      <div class="cart-item">
        <span>${item.name} - ${item.price} FCFA</span>
        <input type="number" min="1" value="${item.quantity}" onchange="updateQty(${i}, this.value)">
        <button onclick="removeItem(${i})">Supprimer</button>
      </div>
    `;
  });

  const total = cart.reduce((s, p) => s + p.price * p.quantity, 0);
  container.innerHTML += `<h3>Total: ${total} FCFA</h3>
    <button onclick="checkout()">Passer commande</button>
    <button id="whatsappCartBtn" style="background:#25D366;color:white;padding:12px 20px;border:none;border-radius:4px;font-size:1rem;margin-top:10px;cursor:pointer;"><i class='fab fa-whatsapp'></i> Commander via WhatsApp</button>`;
  document.getElementById('whatsappCartBtn').onclick = sendCartToWhatsApp;
}

function sendCartToWhatsApp() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  if (cart.length === 0) return;
  let message = 'Bonjour, je souhaite commander :%0A';
  cart.forEach(item => {
    message += `- ${item.name} x${item.quantity} (${item.price} FCFA)%0A`;
  });
  const total = cart.reduce((s, p) => s + p.price * p.quantity, 0);
  message += `%0ATotal : ${total} FCFA`;
  const phone = '22891323090';
  const url = `https://wa.me/${phone}?text=${message}`;
  window.open(url, '_blank');
}

window.updateQty = (index, qty) => {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart[index].quantity = parseInt(qty);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
};

window.removeItem = (index) => {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart.splice(index, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
};

// ✅ Passer commande
window.checkout = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    alert('Vous devez être connecté pour commander.');
    return;
  }

  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  if (cart.length === 0) return alert('Panier vide');

  const total = cart.reduce((s, p) => s + p.price * p.quantity, 0);

  // Créer commande
  const { data: order, error } = await supabase.from('orders').insert({
    user_id: session.user.id,
    total: total,
    status: 'pending'
  }).select().single();

  if (error) return alert(error.message);

  // Ajouter items
  for (const item of cart) {
    await supabase.from('order_items').insert({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price
    });
  }

  alert('Commande passée ! Merci 🎉');
  localStorage.removeItem('cart');
  renderCart();
}; 