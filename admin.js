// admin.js
import { supabase } from './config.js';

// Vérifie session admin au chargement
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    alert('Veuillez vous connecter.');
    window.location.href = 'admin-login.html';
    return;
  }
  // Vérification du rôle admin dans la table admins
  const { data: admin, error } = await supabase
    .from('admins')
    .select('role')
    .eq('id', session.user.id)
    .single();
  if (error || !admin || admin.role !== 'admin') {
    alert('Accès refusé : vous n\'êtes pas admin');
    window.location.href = '/';
    return;
  }
  loadAll();
});

// Déconnexion
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = 'connexion.html';
});

// -------------------
// 🔄 Charger tout
export async function loadAll() {
  await loadCategories();
  await loadProducts();
  await loadReviews();
  await loadStats();
  await loadOrders();
}

// -------------------
// 📦 CATEGORIES
export async function loadCategories() {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) return console.error(error);
  // Remplir <select> pour ajout produit
  const select = document.getElementById('productCategory');
  if (select) {
    select.innerHTML = '<option value="">Sélectionner une catégorie</option>';
    data.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      safeAppendChild(select, opt);
    });
  }
  // Remplir tableau admin
  const tbody = document.getElementById('categoriesTableBody');
  if (tbody) {
    tbody.innerHTML = '';
    data.forEach(cat => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><i class="fas ${cat.icon}"></i></td>
        <td>${cat.name}</td>
        <td>
          <button onclick="deleteCategory('${cat.id}')">Supprimer</button>
        </td>
      `;
      safeAppendChild(tbody, tr);
    });
  }
}
// Ajouter catégorie
document.getElementById('addCategoryForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('categoryName').value;
  const icon = document.getElementById('categoryIcon').value;
  if (!name || !icon) return showNotification('Tous les champs sont requis', 'warning');
  const { error } = await supabase.from('categories').insert({ name, icon });
  if (error) showNotification(error.message, 'error');
  else {
    showNotification('Catégorie ajoutée avec succès !', 'success');
    loadCategories();
    e.target.reset();
  }
});
// Supprimer catégorie
window.deleteCategory = async (id) => {
  if (!confirm('Supprimer cette catégorie ?')) return;
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) showNotification(error.message, 'error');
  else {
    showNotification('Catégorie ajoutée avec succès !', 'success');
    loadCategories();
  }
}

// -------------------
// 🛍️ PRODUITS
export async function loadProducts() {
  const { data, error } = await supabase.from('products').select('*, category_id ( name )');
  if (error) return console.error(error);
  const tbody = document.getElementById('productsTableBody');
  if (tbody) {
    tbody.innerHTML = '';
    data.forEach(p => {
      // Trouver la première image non vide
      let mainImg = p.image_url;
      if (!mainImg) {
        mainImg = p.image_url_1 || p.image_url_2 || p.image_url_3 || p.image_url_4 || '';
      }
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.id}</td>
        <td>${p.name}</td>
        <td>${p.category_id?.name || 'N/A'}</td>
        <td>${p.price} FCFA</td>
        <td>
          <img src="${mainImg}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:8px;">
          <button class="edit-btn" onclick="editProduct('${p.id}')"><i class="fa fa-pen"></i> <span>Modifier</span></button>
          <button class="delete-btn" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash"></i> <span>Supprimer</span></button>
        </td>
      `;
      safeAppendChild(tbody, tr);
    });
    document.getElementById('productCount').textContent = data.length;
  }
}
// Helper pour nettoyer le nom de fichier (accents, espaces, caractères spéciaux)
window.sanitizeFileName = function(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "_");
};
// Gestion upload images via 4 cases cliquables + drag & drop
const uploadBoxes = document.querySelectorAll('.image-upload-box');
const dropArea = document.getElementById('dropArea');
let selectedFiles = [null, null, null, null];

uploadBoxes.forEach((box, idx) => {
  const input = box.querySelector('input[type="file"]');
  input.addEventListener('change', e => {
    const file = input.files[0];
    if (file) {
      selectedFiles[idx] = file;
      // Afficher l'aperçu
      const reader = new FileReader();
      reader.onload = ev => {
        box.innerHTML = '';
        const img = document.createElement('img');
        img.src = ev.target.result;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '8px';
        box.appendChild(img);
        // Ajouter bouton pour supprimer l'image
        const delBtn = document.createElement('span');
        delBtn.textContent = '×';
        delBtn.style.cssText = 'position:absolute;top:2px;right:6px;color:#fff;background:#b48e8e;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1.2rem;z-index:2;';
        delBtn.onclick = () => {
          selectedFiles[idx] = null;
          box.innerHTML = '<span style="color:#b48e8e;font-size:2rem;">+</span>';
          // Recréer un nouvel input
          const newInput = document.createElement('input');
          newInput.type = 'file';
          newInput.accept = 'image/*';
          newInput.style = 'opacity:0;position:absolute;left:0;top:0;width:100%;height:100%;cursor:pointer;';
          newInput.addEventListener('change', e => {
            const file = newInput.files[0];
            if (file) {
              selectedFiles[idx] = file;
              const reader = new FileReader();
              reader.onload = ev => {
                box.innerHTML = '';
                const img = document.createElement('img');
                img.src = ev.target.result;
                img.style.maxWidth = '100%';
                img.style.maxHeight = '100%';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '8px';
                box.appendChild(img);
                const delBtn = document.createElement('span');
                delBtn.textContent = '×';
                delBtn.style.cssText = 'position:absolute;top:2px;right:6px;color:#fff;background:#b48e8e;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1.2rem;z-index:2;';
                delBtn.onclick = () => {
                  selectedFiles[idx] = null;
                  box.innerHTML = '<span style="color:#b48e8e;font-size:2rem;">+</span>';
                  box.appendChild(newInput);
                };
                box.appendChild(delBtn);
              };
              reader.readAsDataURL(file);
            }
          });
          box.appendChild(newInput);
        };
        box.appendChild(delBtn);
      };
      reader.readAsDataURL(file);
    }
  });
  // Clic sur la box = clic sur input
  box.addEventListener('click', e => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SPAN') input.click();
  });
});
// Drag & drop sur dropArea
if (dropArea) {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, e => {
      e.preventDefault();
      e.stopPropagation();
    });
  });
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add('active'));
  });
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove('active'));
  });
  dropArea.addEventListener('drop', e => {
    const files = Array.from(e.dataTransfer.files).slice(0, 4);
    files.forEach((file, i) => {
      if (i < 4) {
        selectedFiles[i] = file;
        const box = uploadBoxes[i];
        const input = box.querySelector('input[type="file"]');
        // Afficher l'aperçu
        const reader = new FileReader();
        reader.onload = ev => {
          box.innerHTML = '';
          const img = document.createElement('img');
          img.src = ev.target.result;
          img.style.maxWidth = '100%';
          img.style.maxHeight = '100%';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '8px';
          box.appendChild(img);
          // Ajouter bouton pour supprimer l'image
          const delBtn = document.createElement('span');
          delBtn.textContent = '×';
          delBtn.style.cssText = 'position:absolute;top:2px;right:6px;color:#fff;background:#b48e8e;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1.2rem;z-index:2;';
          delBtn.onclick = () => {
            selectedFiles[i] = null;
            box.innerHTML = '<span style="color:#b48e8e;font-size:2rem;">+</span>';
            box.appendChild(input);
          };
          box.appendChild(delBtn);
        };
        reader.readAsDataURL(file);
      }
    });
  });
}
// Ajouter produit
document.getElementById('addProductForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('productName').value;
  const price = parseFloat(document.getElementById('productPrice').value);
  const category_id = document.getElementById('productCategory').value;
  const description = document.getElementById('productDescription').value;
  
  // Image principale
  const mainFile = document.getElementById('productMainImage').files[0];
  if (!mainFile) return showNotification('Image principale requise', 'warning');
  
  const safeMainName = window.sanitizeFileName(mainFile.name);
  const mainFileName = `${Date.now()}_${safeMainName}`;
  const { error: mainUploadError } = await supabase.storage.from('product-images').upload(mainFileName, mainFile);
  if (mainUploadError) return alert(mainUploadError.message);
  const mainUrl = supabase.storage.from('product-images').getPublicUrl(mainFileName).data.publicUrl;
  
  // Images secondaires
  const secondaryUrls = [];
  for (const file of selectedFiles.filter(Boolean)) {
    const safeName = window.sanitizeFileName(file.name);
    const fileName = `${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
    if (uploadError) return alert(uploadError.message);
    const publicUrl = supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
    secondaryUrls.push(publicUrl);
  }
  
  const [image_url_1, image_url_2, image_url_3, image_url_4] = secondaryUrls;
  
  const { error } = await supabase.from('products').insert({
    name, price, description, category_id,
    image_url: mainUrl,
    image_url_1, image_url_2, image_url_3, image_url_4
  });
  if (error) showNotification(error.message, 'error');
  else {
    showNotification('Produit ajouté avec succès !', 'success');
    loadProducts();
    e.target.reset();
    // Réinitialiser les cases d'upload
    selectedFiles = [null, null, null, null];
    uploadBoxes.forEach(box => {
      const input = box.querySelector('input[type="file"]');
      box.innerHTML = '<span style="color:#b48e8e;font-size:2rem;">+</span>';
      box.appendChild(input);
    });
    // Réinitialiser l'image principale
    const mainImageBox = document.getElementById('mainImageUploadBox');
    if (mainImageBox) {
      mainImageBox.innerHTML = '<span class="plus">+</span><input type="file" id="productMainImage" class="form-control" accept="image/*" style="opacity:0;position:absolute;left:0;top:0;width:100%;height:100%;cursor:pointer;" required>';
    }
  }
});
// Supprimer produit
window.deleteProduct = async (id) => {
  if (!confirm('Supprimer ce produit ?')) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) showNotification(error.message, 'error');
  else {
    showNotification('Produit supprimé avec succès !', 'success');
    loadProducts();
  }
}

// -------------------
// ⭐ REVIEWS
export async function loadReviews() {
  const { data, error } = await supabase.from('reviews').select('*');
  if (error) return console.error(error);
  const tbody = document.getElementById('reviewsTableBody');
  if (tbody) {
    tbody.innerHTML = '';
    data.forEach(r => {
      const date = new Date(r.created_at).toLocaleDateString('fr-FR');
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${date}</td>
        <td>${r.name}</td>
        <td>${r.email}</td>
        <td style="color:gold">${stars}</td>
        <td>${r.comment}</td>
        <td><button onclick="deleteReview('${r.id}')">Supprimer</button></td>
      `;
      safeAppendChild(tbody, tr);
    });
    // Statistiques
    const total = data.length;
    const avg = data.reduce((s, r) => s + r.rating, 0) / total || 0;
    const positive = data.filter(r => r.rating >= 4).length / total * 100 || 0;
    document.getElementById('totalReviews').textContent = total;
    document.getElementById('averageRating').textContent = avg.toFixed(1);
    document.getElementById('positiveReviews').textContent = positive.toFixed(1) + '%';
  }
}
// Supprimer review
window.deleteReview = async (id) => {
  if (!confirm('Supprimer ce commentaire ?')) return;
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) showNotification(error.message, 'error');
  else {
    showNotification('Commentaire supprimé avec succès !', 'success');
    loadReviews();
  }
}

// -------------------
// 📊 STATISTIQUES
export async function loadStats() {
  // Nombre de catégories
  const { count: catCount } = await supabase.from('categories').select('*', { count: 'exact', head: true });
  document.getElementById('categoryCount').textContent = catCount ?? 0;

  // Nombre de produits
  const { count: prodCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
  document.getElementById('productCount').textContent = prodCount ?? 0;

  // Nombre de commandes
  const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  document.getElementById('orderCount').textContent = orderCount ?? 0;

  // Satisfaction (moyenne des avis)
  const { data: reviews } = await supabase.from('reviews').select('rating');
  const avg = reviews && reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;
  document.getElementById('satisfaction').textContent = (avg * 20).toFixed(0) + '%';
}

// -------------
// 📦 Charger commandes
export async function loadOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, product_id(name))');

  if (error) return console.error(error);

  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  data.forEach(order => {
    let items = '';
    order.order_items.forEach(item => {
      items += `<li>${item.product_id?.name || 'Produit supprimé'} (x${item.quantity})</li>`;
    });

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${order.id}</td>
      <td>${order.total} FCFA</td>
      <td>${order.status}</td>
      <td><ul>${items}</ul></td>
      <td>
        <select onchange="updateOrderStatus('${order.id}', this.value)">
          <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>En attente</option>
          <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>En cours</option>
          <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Expédiée</option>
          <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Terminée</option>
          <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Annulée</option>
        </select>
      </td>
    `;
    safeAppendChild(tbody, tr);
  });
}

window.updateOrderStatus = async (orderId, newStatus) => {
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (error) showNotification(error.message, 'error');
  else showNotification('Statut mis à jour avec succès !', 'success');
};

// Aperçu des images sélectionnées (max 4)
const imageInput = document.getElementById('productImage');
const previewContainer = document.getElementById('imagePreviewContainer');
if (imageInput && previewContainer) {
  imageInput.addEventListener('change', () => {
    previewContainer.innerHTML = '';
    const files = imageInput.files;
    for (let i = 0; i < Math.min(files.length, 4); i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.maxWidth = '80px';
        img.style.maxHeight = '80px';
        img.style.borderRadius = '6px';
        img.style.objectFit = 'cover';
        img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        previewContainer.appendChild(img);
      };
      reader.readAsDataURL(file);
    }
  });
}

// Fonction pour ouvrir le modal d'édition pré-rempli
window.editProduct = async function(productId) {
  // Charger dynamiquement la liste des catégories
  const { data: categories, error: catError } = await supabase.from('categories').select('*');
  const select = document.getElementById('editProductCategory');
  if (select && categories) {
    select.innerHTML = '<option value="">Sélectionnez une catégorie</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      safeAppendChild(select, opt);
    });
  }
  // Charger le produit à modifier
  const { data: product, error } = await supabase.from('products').select('*').eq('id', productId).single();
  if (error || !product) return showNotification('Produit introuvable', 'error');
  window.currentEditProduct = product; // <-- stocke le produit original globalement
  
  // Afficher le modal d'abord
  const editModal = document.getElementById('editModal');
  if (!editModal) {
    console.error('Modal d\'édition non trouvé');
    return;
  }
  editModal.style.display = 'block';
  
  // Attendre un peu que le DOM soit mis à jour
  setTimeout(() => {
    // Maintenant remplir les champs
    const editProductId = document.getElementById('editProductId');
    const editProductName = document.getElementById('editProductName');
    const editProductPrice = document.getElementById('editProductPrice');
    const editProductDescription = document.getElementById('editProductDescription');
    if (!editProductId) { console.error('Champ caché editProductId introuvable'); return; }
    if (!editProductName) { console.error('Champ editProductName introuvable'); return; }
    if (!editProductPrice) { console.error('Champ editProductPrice introuvable'); return; }
    if (!editProductDescription) { console.error('Champ editProductDescription introuvable'); return; }
    editProductId.value = product.id;
    editProductName.value = product.name;
    editProductPrice.value = product.price;
    editProductDescription.value = product.description;
    if (select) select.value = product.category_id;
  }, 100);

  // Attendre un peu plus pour les images
  setTimeout(() => {
    // Image principale (image_url)
    const mainPreview = document.getElementById('editMainImagePreview');
    const mainInput = document.getElementById('editProductMainImage');
    const mainDeleteBtn = document.getElementById('editMainDeleteBtn');
    if (mainPreview && product.image_url) {
      mainPreview.src = product.image_url;
      mainPreview.style.display = 'block';
      mainDeleteBtn.style.display = 'flex';
      // Stocker l'URL originale pour la conserver
      mainPreview.dataset.originalUrl = product.image_url;
    } else if (mainPreview) {
      mainPreview.style.display = 'none';
      mainDeleteBtn.style.display = 'none';
    }
    mainInput.value = '';
    mainInput.onchange = function(e) {
      if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = ev => {
          mainPreview.src = ev.target.result;
          mainPreview.style.display = 'block';
          mainDeleteBtn.style.display = 'flex';
          // Effacer l'URL originale car on a une nouvelle image
          delete mainPreview.dataset.originalUrl;
        };
        reader.readAsDataURL(e.target.files[0]);
      }
    };
    mainDeleteBtn.onclick = function() {
      mainPreview.src = '';
      mainPreview.style.display = 'none';
      mainInput.value = '';
      mainDeleteBtn.style.display = 'none';
      // Effacer l'URL originale
      delete mainPreview.dataset.originalUrl;
    };

    // Images secondaires (image_url_1 à image_url_4)
    for (let i = 0; i < 4; i++) {
      const imgKey = 'image_url_' + (i+1);
      const preview = document.getElementById('editImagePreview'+i);
      const input = document.getElementById('editImageInput'+i);
      const delBtn = document.getElementById('editDeleteBtn'+i);
      if (preview && product[imgKey]) {
        preview.src = product[imgKey];
        preview.style.display = 'block';
        delBtn.style.display = 'flex';
        // Stocker l'URL originale pour la conserver
        preview.dataset.originalUrl = product[imgKey];
      } else if (preview) {
        preview.style.display = 'none';
        delBtn.style.display = 'none';
      }
      input.value = '';
      input.onchange = function(e) {
        if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = ev => {
            preview.src = ev.target.result;
            preview.style.display = 'block';
            delBtn.style.display = 'flex';
            // Effacer l'URL originale car on a une nouvelle image
            delete preview.dataset.originalUrl;
          };
          reader.readAsDataURL(e.target.files[0]);
        }
      };
      delBtn.onclick = function() {
        preview.src = '';
        preview.style.display = 'none';
        input.value = '';
        delBtn.style.display = 'none';
        // Effacer l'URL originale
        delete preview.dataset.originalUrl;
      };
    }
  }, 200);

  // Le modal est déjà affiché au début de la fonction
}
// Soumission du formulaire d'édition de produit
const editForm = document.getElementById('editProductForm');
if (editForm) {
  editForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('editProductId').value;
    const name = document.getElementById('editProductName').value;
    const price = parseFloat(document.getElementById('editProductPrice').value);
    const category_id = document.getElementById('editProductCategory').value;
    const description = document.getElementById('editProductDescription').value;

    // Images principales et secondaires
    let image_url = null;
    let image_urls = [null, null, null, null];
    const original = window.currentEditProduct;
    // Image principale
    const mainInput = document.getElementById('editProductMainImage');
    const mainPreview = document.getElementById('editMainImagePreview');
    if (mainInput && mainInput.files && mainInput.files[0]) {
      // Nouvelle image uploadée
      const file = mainInput.files[0];
      const safeName = window.sanitizeFileName(file.name);
      const fileName = `${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
      if (uploadError) return showNotification(uploadError.message, 'error');
      image_url = supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
    } else if (mainPreview && mainPreview.style.display !== 'none') {
      if (mainPreview.dataset.originalUrl) {
        image_url = mainPreview.dataset.originalUrl;
      } else if (mainPreview.src && !mainPreview.src.startsWith('data:')) {
        image_url = mainPreview.src;
      } else if (original && original.image_url) {
        image_url = original.image_url; // Toujours garder l'ancienne si rien n'a changé
      }
    } else {
      image_url = null; // explicitement supprimée
    }
    // Images secondaires
    for (let i = 0; i < 4; i++) {
      const input = document.getElementById('editImageInput'+i);
      const preview = document.getElementById('editImagePreview'+i);
      if (input && input.files && input.files[0]) {
        // Nouvelle image uploadée
        const file = input.files[0];
        const safeName = window.sanitizeFileName(file.name);
        const fileName = `${Date.now()}_${i}_${safeName}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
        if (uploadError) return showNotification(uploadError.message, 'error');
        image_urls[i] = supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
      } else if (preview && preview.style.display !== 'none') {
        if (preview.dataset.originalUrl) {
          image_urls[i] = preview.dataset.originalUrl;
        } else if (preview.src && !preview.src.startsWith('data:')) {
          image_urls[i] = preview.src;
        } else if (original && original['image_url_' + (i+1)]) {
          image_urls[i] = original['image_url_' + (i+1)];
        }
      } else {
        image_urls[i] = null; // explicitement supprimée
      }
    }
    // Update produit
    const { data: updatedProduct, error } = await supabase.from('products').update({
      name,
      price,
      description,
      category_id,
      image_url: image_url,
      image_url_1: image_urls[0],
      image_url_2: image_urls[1],
      image_url_3: image_urls[2],
      image_url_4: image_urls[3]
    }).eq('id', id).select();
    if (error) return showNotification(error.message, 'error');
    showNotification('Produit modifié avec succès !', 'success');
    await loadProducts(); // Attendre que les produits soient rechargés
    document.getElementById('editModal').style.display = 'none';
  });
}

// Fermer le modal d'édition
const cancelEditBtns = document.querySelectorAll('.cancel-edit');
cancelEditBtns.forEach(btn => btn.addEventListener('click', () => {
  document.getElementById('editModal').style.display = 'none';
}));

// Système de notifications moderne
function showNotification(message, type = 'success') {
  // Créer le conteneur s'il n'existe pas
  let container = document.getElementById('notificationContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notificationContainer';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;
    document.body.appendChild(container);
  }
  
  const notification = document.createElement('div');
  
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
  
  notification.style.cssText = `
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
  `;
  
  notification.innerHTML = `
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
  
  container.appendChild(notification);
  
  // Auto-remove après 4 secondes
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-in-out';
    setTimeout(() => {
      if (notification.parentElement) notification.remove();
    }, 300);
  }, 4000);
}

function safeAppendChild(parent, child) {
  if (child instanceof Node) {
    parent.appendChild(child);
  } else {
    console.error('appendChild: Le paramètre n’est pas un Node', child);
  }
}