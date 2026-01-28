// Admin page functionality

document.addEventListener('DOMContentLoaded', () => {
  // Check for URL params (success/error messages)
  const params = new URLSearchParams(window.location.search);

  if (params.has('success')) {
    showAlert('Google Calendar connected successfully!', 'success');
    // Clean URL
    window.history.replaceState({}, document.title, '/admin');
  }

  if (params.has('error')) {
    const errorMessages = {
      'oauth_init_failed': 'Failed to start Google authorization. Please try again.',
      'invalid_state': 'Invalid authorization state. Please try again.',
      'expired_state': 'Authorization expired. Please try again.',
      'callback_failed': 'Failed to connect Google Calendar. Please try again.',
      'access_denied': 'Access was denied. Please approve the permissions to continue.',
    };
    const error = params.get('error');
    showAlert(errorMessages[error] || `Error: ${error}`, 'error');
    // Clean URL
    window.history.replaceState({}, document.title, '/admin');
  }

  // Load data
  loadAccounts();
  loadAppointments();
});

/**
 * Shows an alert message
 */
function showAlert(message, type) {
  const alert = document.getElementById('alert');
  alert.textContent = message;
  alert.className = `alert ${type}`;

  // Auto-hide after 5 seconds
  setTimeout(() => {
    alert.classList.add('hidden');
  }, 5000);
}

/**
 * Loads and displays connected accounts
 */
async function loadAccounts() {
  const container = document.getElementById('accounts-list');

  try {
    const response = await fetch('/admin/api/accounts');
    const accounts = await response.json();

    if (accounts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          No Google Calendar accounts connected yet.<br>
          Click "Connect Google Calendar" to get started.
        </div>
      `;
      return;
    }

    container.innerHTML = accounts.map(account => `
      <div class="account-item" data-id="${account.id}">
        <div class="account-info">
          <div class="account-status ${account.isActive ? 'active' : ''}"></div>
          <span class="account-email">${account.email}</span>
          <span class="account-badge ${account.isActive ? 'active' : 'inactive'}">
            ${account.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div class="account-actions">
          ${!account.isActive ? `
            <button class="btn btn-secondary btn-small" onclick="activateAccount(${account.id})">
              Set Active
            </button>
          ` : ''}
          <button class="btn btn-danger btn-small" onclick="removeAccount(${account.id}, '${account.email}')">
            Disconnect
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load accounts:', error);
    container.innerHTML = `
      <div class="empty-state">
        Failed to load accounts. Please refresh the page.
      </div>
    `;
  }
}

/**
 * Loads and displays recent appointments
 */
async function loadAppointments() {
  const container = document.getElementById('appointments-list');

  try {
    const response = await fetch('/admin/api/appointments?limit=10');
    const appointments = await response.json();

    if (appointments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          No appointments booked yet.
        </div>
      `;
      return;
    }

    container.innerHTML = appointments.map(apt => {
      const startDate = new Date(apt.startTimeISO);
      const formattedDate = startDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const formattedTime = startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });

      return `
        <div class="appointment-item">
          <div class="appointment-info">
            <div class="appointment-time">${formattedDate} at ${formattedTime}</div>
            <div class="appointment-name">${apt.callerName} - ${apt.phoneNumber}</div>
            ${apt.issueDescription ? `
              <div class="appointment-issue">${apt.issueDescription.substring(0, 100)}${apt.issueDescription.length > 100 ? '...' : ''}</div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Failed to load appointments:', error);
    container.innerHTML = `
      <div class="empty-state">
        Failed to load appointments. Please refresh the page.
      </div>
    `;
  }
}

/**
 * Activates a Google account
 */
async function activateAccount(id) {
  try {
    const response = await fetch(`/admin/api/accounts/${id}/activate`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to activate account');
    }

    showAlert('Account activated successfully!', 'success');
    loadAccounts();
  } catch (error) {
    console.error('Failed to activate account:', error);
    showAlert('Failed to activate account. Please try again.', 'error');
  }
}

/**
 * Removes a Google account
 */
async function removeAccount(id, email) {
  if (!confirm(`Are you sure you want to disconnect ${email}?`)) {
    return;
  }

  try {
    const response = await fetch(`/admin/api/accounts/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to remove account');
    }

    showAlert('Account disconnected successfully!', 'success');
    loadAccounts();
  } catch (error) {
    console.error('Failed to remove account:', error);
    showAlert('Failed to disconnect account. Please try again.', 'error');
  }
}
