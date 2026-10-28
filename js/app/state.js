/* ============================================================
   LUMINA — DURUM VE SABİTLER
   Grup sayıları, API adresi, service worker, çevrimdışı bildirimi, global durum
============================================================ */

// ── SABİT TANIMLAMALARI (LOCAL STORAGE KEYS & GROUPS) ──

// Grup sayıları: js/app/data.js → LANGUAGES (defaultGroups) ve groupCounts

// ── C# API ADRESİ (isteğe bağlı) ──
// Boşsa kelimeler doğrudan CSV dosyalarından okunur. Ayar: firebase-config.js → apiBaseUrl
const API_BASE_URL = String((window.LUMINA_CONFIG && window.LUMINA_CONFIG.apiBaseUrl) || '').replace(/\/+$/, '');

// ── SERVICE WORKER & OFFLINE YÖNETİMİ ──
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker registered!', reg))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}

function showOfflineBanner(isOffline) {
    let banner = document.getElementById('offline-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.style.cssText = 'position:fixed; top:0; left:0; width:100%; background-color:#ff9800; color:#fff; text-align:center; padding:10px; z-index:9999; font-weight:bold; font-family:Inter, sans-serif; display:none;';
        document.body.appendChild(banner);
    }
    
    if (isOffline) {
        banner.innerText = 'Çevrimdışısınız. "Kelime Çalışma" özellikleri aktif, ancak hesap/ayarlar kısıtlanmıştır.';
        banner.style.display = 'block';
    } else {
        banner.innerText = 'İnternet bağlantısı sağlandı.';
        banner.style.backgroundColor = '#4caf50';
        setTimeout(() => { banner.style.display = 'none'; banner.style.backgroundColor = '#ff9800'; }, 3000);
    }
}

window.addEventListener('offline', () => showOfflineBanner(true));
window.addEventListener('online', () => showOfflineBanner(false));
// Başlangıçta kontrol et
if (!navigator.onLine) {
    showOfflineBanner(true);
}

// ── GLOBAL DEĞİŞKENLER ──
let currentLanguage = 'English';
let wordsData = [];
let allWords = {};
let verbsLabData = [];

// ── GLOBAL STATE ──
const state = {
    lang: 'en',
    currentMode: 'default',
    currentGroup: null,
    sessionQueue: [],
    sessionIndex: 0,
    sessionCorrect: 0,
    sessionWrong: 0,
    sessionUnsure: 0,
    isFlipped: false,
    writeQueue: [],
    writeIndex: 0,
    writeCorrect: 0,
    writeWrong: 0,
    testQueue: [],
    testIndex: 0,
    testCorrect: 0,
    testWrong: 0
};

function activeWords() {
    return allWords;
}
