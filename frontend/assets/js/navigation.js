/**
 * ================================================================
 * METUPS — DESKTOP NAVIGATION SIDEBAR
 * shared/navigation.js
 *
 * Dynamically injects a persistent left sidebar on every page
 * at the ≥768px breakpoint.
 * ================================================================
 */

import { supabaseClient } from './supabase.js';
import { checkAuth, getAvatarInitials } from './utils.js';

// Don't inject sidebar on pure auth pages (login / signup / confirm)
const AUTH_PAGES = ['/features/auth/login.html', '/features/auth/signup.html', '/features/auth/confirm.html'];
const isAuthPage = AUTH_PAGES.some(p => window.location.pathname.endsWith(p));
if (isAuthPage) {
  console.debug('[nav] Auth page — sidebar not injected');
} else {
  injectSidebar();
}

// Logout function accessible from sidebar button
window.sidebarLogout = async function () {
  await supabaseClient.auth.signOut();
  window.location.href = '/features/auth/login.html';
};

function resolvePaths() {
  return {
    home:          '/index.html',
    login:         '/features/auth/login.html',
    signup:        '/features/auth/signup.html',
    messages:      '/features/chat/messaging.html',
    sell:          '/features/products/add_product.html',
    listings:      '/features/products/dashboard.html',
    notifications: '/features/notifications/notifications.html',
    profile:       '/features/profile/menu.html',
    settings:      '/features/profile/settings.html',
    support:       '/support.html',
    wishlist:      '/features/wishlist/wishlist.html',
  };
}

function isActive(href) {
  return window.location.pathname.endsWith(href) ? 'active' : '';
}

async function injectSidebar() {
  const user  = await checkAuth();
  const paths = resolvePaths();
  const isNotificationsPage = window.location.pathname.endsWith(paths.notifications);

  let userName   = '';
  let avatarHtml = '';
  let msgCount   = 0;
  let notifCount = 0;

  if (user) {
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    userName = profile?.full_name || user.email || '';
    const initials = getAvatarInitials(userName);

    avatarHtml = profile?.avatar_url
      ? `<img src="${profile.avatar_url}" alt="${initials}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : `<span>${initials}</span>`;

    try {
      const [{ count: m }, { count: n }] = await Promise.all([
        supabaseClient.from('conversations')
          .select('*', { count: 'exact', head: true })
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .gt('unread_count', 0),
        supabaseClient.from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('read_at', null),
      ]);
      msgCount   = m || 0;
      notifCount = isNotificationsPage ? 0 : (n || 0);
    } catch {}
  }

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar-nav';
  sidebar.id        = 'sidebarNav';
  sidebar.innerHTML = `
   
    <!-- Logo -->
    <a href="${paths.home}" class="sidebar-logo">
      <div class="logo-icon" style="width:38px;height:38px;flex-shrink:0"></div>
      <span class="sidebar-logo-text">Metups</span>
    </a>

    <!-- Search -->
    <form action="${paths.home}" class="sidebar-search" onsubmit="event.preventDefault(); const q = this.querySelector('input[name=q]').value.trim(); if (!q) return; window.location.href='${paths.home}?q=' + encodeURIComponent(q);">
      <input name="q" type="search" placeholder="Search products…" autocomplete="off" aria-label="Search products">
      <button type="submit" aria-label="Search"><i class="fas fa-search"></i></button>
    </form>

    <!-- DISCOVER Section -->
    <div class="sidebar-section">
      <div class="sidebar-section-label">DISCOVER</div>
      <nav class="sidebar-links">
        <a href="${paths.home}" class="sidebar-link ${isActive(paths.home)}">
          <i class="fas fa-home"></i> Home
        </a>
        <a href="${paths.wishlist}" class="sidebar-link ${isActive(paths.wishlist)}">
          <i class="fas fa-heart"></i> Wishlist
        </a>
        <a href="${paths.sell}" class="sidebar-link ${isActive(paths.sell)}">
          <i class="fas fa-tag"></i> Sell
        </a>
      </nav>
    </div>

    <!-- ACCOUNT Section -->
    <div class="sidebar-section">
      <div class="sidebar-section-label">ACCOUNT</div>
      <nav class="sidebar-links">
        <a href="${paths.listings}" class="sidebar-link ${isActive(paths.listings)}">
          <i class="fas fa-store"></i> My Listings
        </a>
        <a href="${paths.messages}" class="sidebar-link ${isActive(paths.messages)}">
          <i class="fas fa-comment-dots"></i> Messages
          ${msgCount ? `<span class="sidebar-badge">${msgCount}</span>` : ''}
        </a>
        <a href="${paths.notifications}" class="sidebar-link ${isActive(paths.notifications)}">
          <i class="fas fa-bell"></i> Notifications
          ${notifCount ? `<span class="sidebar-badge">${notifCount}</span>` : ''}
        </a>
        <a href="${paths.settings}" class="sidebar-link ${isActive(paths.settings)}">
          <i class="fas fa-cog"></i> Settings
        </a>
      </nav>
    </div>

    <!-- Bottom: user info or login prompt -->
    ${user ? `
    <div class="sidebar-footer">
      <a href="${paths.profile}" class="sidebar-user">
        <div class="sidebar-user-avatar">${avatarHtml}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${escHtml(userName)}</div>
          <div class="sidebar-user-sub">View profile</div>
        </div>
      </a>
      <a href="${paths.support}" class="sidebar-link sidebar-link-sell" style="margin-top:10px">
        <i class="fas fa-mug-hot"></i><span>Support Metups</span>
      </a>
      <div style="display:flex;gap:6px;margin-top:10px">
        <a href="${paths.settings}" class="sidebar-icon-btn" title="Settings">
          <i class="fas fa-cog"></i>
        </a>
        <button class="sidebar-icon-btn" title="Log out" onclick="sidebarLogout()">
          <i class="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </div>
    ` : `
    <div class="sidebar-footer">
      <a href="${paths.login}"  class="sidebar-link" style="margin-bottom:6px">
        <i class="fas fa-sign-in-alt"></i><span>Log In</span>
      </a>
      <a href="${paths.signup}" class="sidebar-link sidebar-link-sell">
        <i class="fas fa-user-plus"></i><span>Sign Up</span>
      </a>
      <a href="${paths.support}" class="sidebar-link" style="margin-top:8px">
        <i class="fas fa-mug-hot"></i><span>Support Metups</span>
      </a>
    </div>
    `}
  `;

  document.body.appendChild(sidebar);
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = '/features/auth/login.html';
  });
}

// ── Tiny HTML escaper ────────────────────────────────────────────
function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
