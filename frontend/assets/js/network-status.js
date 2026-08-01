/**
 * ================================================================
 * METUPS MARKETPLACE — NETWORK STATUS MONITOR
 * shared/network-status.js
 *
 * Detects online/offline state and shows user-friendly indicators.
 * Import this in your HTML <script> tags to auto-initialize.
 *
 * Usage:
 *   <script src="/assets/js/network-status.js"></ script>
 * ================================================================
 */

/**
 * Initialize network status monitoring
 */
export function initNetworkStatus() {
  const statusEl = document.getElementById('network-status');
  if (!statusEl) return; // Only show if the element exists in HTML

  function updateStatus() {
    if (navigator.onLine) {
      statusEl.classList.remove('offline');
      statusEl.classList.add('online');
      statusEl.innerHTML = '✅ Connected';
    } else {
      statusEl.classList.remove('online');
      statusEl.classList.add('offline');
      statusEl.innerHTML = '📵 Offline';
    }
  }

  // Check initial state
  updateStatus();

  // Listen for online/offline events
  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
}

/**
 * Check if the device is online
 * @returns {boolean}
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Show a banner when connection is lost
 */
export function showOfflineNotice(message = 'No internet connection. Some features may be limited.') {
  if (!isOnline()) {
    const notice = document.createElement('div');
    notice.id = 'offline-notice';
    notice.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #dc2626;
      color: white;
      padding: 12px 20px;
      text-align: center;
      font-size: 14px;
      z-index: 9999;
      animation: slideDown 0.3s ease-out;
    `;
    notice.textContent = message;
    document.body.insertBefore(notice, document.body.firstChild);

    // Add CSS animation
    if (!document.querySelector('style[data-offline-notice]')) {
      const style = document.createElement('style');
      style.setAttribute('data-offline-notice', 'true');
      style.textContent = `
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNetworkStatus);
} else {
  initNetworkStatus();
}
