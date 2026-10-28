/* ============================================================
   LUMINA — ORTAK YARDIMCILAR (diğer tüm betiklerden önce yüklenir)
============================================================ */

// innerHTML içine basılan metinleri HTML'e karşı güvenli hale getirir
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}
