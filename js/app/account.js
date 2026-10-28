/* ============================================================
   LUMINA — HESAP MENÜSÜ
   Kullanıcı açılır menüsü, hesap ve şifre modalları
============================================================ */

/* ══════════════════════════════════════════════════════════
   USER DROPDOWN — GLOBAL FONKSİYONLAR
══════════════════════════════════════════════════════════ */
function toggleUserDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('userDropdownMenu');
    if (!menu) return;
    menu.classList.toggle('hidden');

    // Dışarı tıklayınca kapat (bir kez bağla)
    if (!menu.classList.contains('hidden')) {
        setTimeout(() => {
            document.addEventListener('click', closeUserDropdownOutside);
        }, 0);
    }
}

function closeUserDropdownOutside(e) {
    const menu = document.getElementById('userDropdownMenu');
    const trigger = document.getElementById('userDropdownTrigger');
    if (menu && !menu.contains(e.target) && trigger && !trigger.contains(e.target)) {
        menu.classList.add('hidden');
        document.removeEventListener('click', closeUserDropdownOutside);
    }
}

function openManageAccountModal() {
    const menu = document.getElementById('userDropdownMenu');
    if (menu) menu.classList.add('hidden');
    document.removeEventListener('click', closeUserDropdownOutside);

    const sess = AuthManager.getSession();
    if (sess) {
        const nameInput = document.getElementById('maNameInput');
        const emailInput = document.getElementById('maEmailInput');
        if (nameInput) nameInput.value = sess.name || '';
        if (emailInput) emailInput.value = sess.email || '';
    }
    openModal('manageAccountModal');
}

function openChangePasswordModal() {
    const menu = document.getElementById('userDropdownMenu');
    if (menu) menu.classList.add('hidden');
    document.removeEventListener('click', closeUserDropdownOutside);
    openModal('changePasswordModal');
}
