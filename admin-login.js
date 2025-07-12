import { supabase } from './config.js';

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

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('adminLoginEmail').value;
  const password = document.getElementById('adminLoginPassword').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showNotification(error.message, 'error');
    return;
  }

  // Vérifier le rôle dans la table admins
  const { data: adminData, error: adminError } = await supabase
    .from('admins')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (adminError || !adminData || adminData.role !== 'admin') {
    showNotification('Accès refusé : vous n\'êtes pas admin.', 'error');
    return;
  }

  // OK, rediriger vers le dashboard admin
  window.location.href = 'admin.html';
}); 