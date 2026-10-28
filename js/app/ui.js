/* ============================================================
   LUMINA — ARAYÜZ YARDIMCILARI
   Bildirimler, kullanıcı bilgisi, tema, modallar
============================================================ */

// ── NOTIFICATION MANAGER ──
const NotificationManager = (() => {
    const LS_NOTIFS = 'lumina_notifications';

    function getNotifs() {
        try {
            return JSON.parse(localStorage.getItem(LS_NOTIFS) || '[]');
        } catch { return []; }
    }

    function saveNotifs(list) {
        localStorage.setItem(LS_NOTIFS, JSON.stringify(list));
        renderNotifs();
    }

    function addNotification(title, message, icon = '✨') {
        const list = getNotifs();
        list.unshift({
            id: Date.now(),
            title,
            message,
            icon,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        if (list.length > 20) list.pop();
        saveNotifs(list);
    }

    function clearNotifications() {
        saveNotifs([]);
    }

    function renderNotifs() {
        const list = getNotifs();
        const badgeEl = document.getElementById('notifBadge');
        const listEl = document.getElementById('notifList');

        if (badgeEl) {
            if (list.length > 0) {
                badgeEl.textContent = list.length;
                badgeEl.classList.remove('hidden');
            } else {
                badgeEl.classList.add('hidden');
            }
        }

        if (listEl) {
            if (list.length === 0) {
                listEl.innerHTML = '<div class="notif-empty">Henüz bildirim yok.</div>';
            } else {
                listEl.innerHTML = list.map(n => `
                    <div class="notif-item">
                        <span class="notif-item-icon">${escapeHtml(n.icon)}</span>
                        <div class="notif-item-text">
                            <strong>${escapeHtml(n.title)}</strong>
                            <div>${escapeHtml(n.message)}</div>
                            <div class="notif-item-time">${escapeHtml(n.time)}</div>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    return { addNotification, clearNotifications, renderNotifs, getNotifs };
})();

function updateUserUI(session) {
    if (!session) return;

    const isGuest = !!session.guest;
    const displayName = session.name || (session.email ? session.email.split('@')[0] : 'Misafir');
    const initial = displayName.charAt(0).toUpperCase();

    // Şifre değiştir: yalnızca e-posta/şifre ile girenlerde görünür
    document.body.classList.toggle('google-user', session.authProvider !== 'password');
    const btnManage = document.getElementById('btnOpenManageAccount');
    const btnPass = document.getElementById('btnOpenChangePassword');
    if (btnManage) btnManage.style.display = isGuest ? 'none' : '';
    if (btnPass) btnPass.style.display = session.authProvider === 'password' ? '' : 'none';

    const avatarEls = [
        document.getElementById('topUserAvatar'),
        document.getElementById('menuUserAvatar'),
        document.getElementById('maAvatar'),
        document.getElementById('dashUserAvatar')
    ];

    avatarEls.forEach(el => {
        if (!el) return;
        el.textContent = '';
        if (session.picture) {
            const img = document.createElement('img');
            img.src = session.picture;
            img.alt = displayName;
            img.referrerPolicy = 'no-referrer';
            el.appendChild(img);
            el.classList.add('has-photo');
        } else {
            el.textContent = initial;
            el.classList.remove('has-photo');
        }
    });

    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    setText('topUserName', displayName);
    setText('menuUserName', displayName);
    setText('menuUserEmail', isGuest ? 'Misafir (yalnızca bu cihaz)' : session.email);
    setText('dashUserEmail', isGuest ? 'Misafir' : session.email);

    const isAdmin = session.role === 'admin';
    ['menuUserRoleBadge', 'maRoleBadge'].forEach(id => {
        const b = document.getElementById(id);
        if (!b) return;
        b.textContent = isGuest ? '👤 Misafir' : (isAdmin ? '⚡ Admin' : '👤 Kullanıcı');
        b.className = 'user-role-badge ' + (isAdmin ? 'admin' : 'user');
    });

    updateTopBarFlag();
}

function updateTopBarFlag() {
    const flagEl = document.getElementById('topUserLangFlag');
    if (!flagEl) return;
    flagEl.textContent = (LANGUAGE_BY_CODE[state.lang] || LANGUAGE_BY_CODE.en).flag;
}

// ── THEME MANAGER ──
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('lumina_theme', isLight ? 'light' : 'dark');

    const iconDark = document.querySelector('.theme-icon-dark');
    const iconLight = document.querySelector('.theme-icon-light');

    if (iconDark && iconLight) {
        if (isLight) {
            iconDark.classList.add('hidden');
            iconLight.classList.remove('hidden');
        } else {
            iconDark.classList.remove('hidden');
            iconLight.classList.add('hidden');
        }
    }
}

function loadSavedTheme() {
    const saved = localStorage.getItem('lumina_theme');
    if (saved === 'light') {
        document.body.classList.add('light-theme');
        const iconDark = document.querySelector('.theme-icon-dark');
        const iconLight = document.querySelector('.theme-icon-light');
        if (iconDark && iconLight) {
            iconDark.classList.add('hidden');
            iconLight.classList.remove('hidden');
        }
    }
}

// ── MODALS MANAGER ──
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    document.getElementById('userDropdownMenu')?.classList.add('hidden');
    document.getElementById('notifPopover')?.classList.add('hidden');

    if (modalId === 'manageAccountModal') {
        const session = AuthManager.getSession();
        if (session) {
            document.getElementById('maNameInput').value = session.name || '';
            document.getElementById('maEmailInput').value = session.email;
        }
        document.getElementById('maSuccess')?.classList.add('hidden');
        document.getElementById('maError')?.classList.add('hidden');
    } else if (modalId === 'changePasswordModal') {
        document.getElementById('cpOldPassword').value = '';
        document.getElementById('cpNewPassword').value = '';
        document.getElementById('cpConfirmPassword').value = '';
        document.getElementById('cpSuccess')?.classList.add('hidden');
        document.getElementById('cpError')?.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    Nav.recordModalOpen(modalId);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
    Nav.recordModalClose(modalId);
}
