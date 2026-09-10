/* ============================================================
   LUMINA 3000 — MAIN APP & AUTH MANAGER & OFFLINE DATA
   Kullanıcı verileri: lumina_users (JSON array)
   Oturum verisi:     lumina_session (JSON object)
   Admin hesabı:      a@l.com / 123456
============================================================ */

// ── SABİT TANIMLAMALARI (LOCAL STORAGE KEYS & GROUPS) ──
const LS_KEY = 'lumina_progress_en';
const LS_KEY_ES = 'lumina_progress_es';
const LS_KEY_DE = 'lumina_progress_de';
const LS_KEY_FR = 'lumina_progress_fr';
const LS_KEY_NO = 'lumina_progress_no';
const LOCAL_STORAGE_KEY = LS_KEY;

const TOTAL_GROUPS = 30;    // İngilizce varsayılan grup sayısı
const TOTAL_GROUPS_ES = 9;  // İspanyolca grup sayısı
const TOTAL_GROUPS_DE = 10; // Almanca grup sayısı
const TOTAL_GROUPS_FR = 10; // Fransızca grup sayısı
const TOTAL_GROUPS_NO = 5;  // Norveççe grup sayısı

// ── C# API ADRESİ ──
const API_BASE_URL = 'https://localhost:7024/api';

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
    isFlipped: false
};

function activeWords() {
    return allWords;
}

// ── FALLBACK (ÇEVRİMDİŞİ) VERİ SETLERİ ──
const DEFAULT_VERBS_LAB = [
    { v1: 'be', v2: 'was / were', v3: 'been', tr: 'olmak' },
    { v1: 'become', v2: 'became', v3: 'become', tr: 'olmak, dönüşmek' },
    { v1: 'begin', v2: 'began', v3: 'begun', tr: 'başlamak' },
    { v1: 'break', v2: 'broke', v3: 'broken', tr: 'kırmak, bozulmak' },
    { v1: 'bring', v2: 'brought', v3: 'brought', tr: 'getirmek' },
    { v1: 'build', v2: 'built', v3: 'built', tr: 'inşa etmek' },
    { v1: 'buy', v2: 'bought', v3: 'bought', tr: 'satın almak' },
    { v1: 'catch', v2: 'caught', v3: 'caught', tr: 'yakalamak' },
    { v1: 'choose', v2: 'chose', v3: 'chosen', tr: 'seçmek' },
    { v1: 'come', v2: 'came', v3: 'come', tr: 'gelmek' },
    { v1: 'do', v2: 'did', v3: 'done', tr: 'yapmak' },
    { v1: 'drink', v2: 'drank', v3: 'drunk', tr: 'içmek' },
    { v1: 'drive', v2: 'drove', v3: 'driven', tr: 'sürmek (araç)' },
    { v1: 'eat', v2: 'ate', v3: 'eaten', tr: 'yemek yemek' },
    { v1: 'fall', v2: 'fell', v3: 'fallen', tr: 'düşmek' },
    { v1: 'find', v2: 'found', v3: 'found', tr: 'bulmak' },
    { v1: 'fly', v2: 'flew', v3: 'flown', tr: 'uçmak' },
    { v1: 'forget', v2: 'forgot', v3: 'forgotten', tr: 'unutmak' },
    { v1: 'get', v2: 'got', v3: 'gotten', tr: 'almak, elde etmek' },
    { v1: 'give', v2: 'gave', v3: 'given', tr: 'vermek' },
    { v1: 'go', v2: 'went', v3: 'gone', tr: 'gitmek' },
    { v1: 'have', v2: 'had', v3: 'had', tr: 'sahip olmak' },
    { v1: 'hear', v2: 'heard', v3: 'heard', tr: 'duymak' },
    { v1: 'know', v2: 'knew', v3: 'known', tr: 'bilmek, tanımak' },
    { v1: 'make', v2: 'made', v3: 'made', tr: 'yapmak, üretmek' },
    { v1: 'read', v2: 'read', v3: 'read', tr: 'okumak' },
    { v1: 'run', v2: 'ran', v3: 'run', tr: 'koşmak' },
    { v1: 'see', v2: 'saw', v3: 'seen', tr: 'görmek' },
    { v1: 'speak', v2: 'spoke', v3: 'spoken', tr: 'konuşmak' },
    { v1: 'take', v2: 'took', v3: 'taken', tr: 'almak' },
    { v1: 'write', v2: 'wrote', v3: 'written', tr: 'yazmak' }
];

const FALLBACK_DATA = {
    English: [
        // Group 1
        { id: 1, groupId: 1, english: 'abandon', turkish: 'terk etmek, vazgeçmek', v1: 'abandon', v2: 'abandoned', v3: 'abandoned' },
        { id: 2, groupId: 1, english: 'ability', turkish: 'yetenek, kabiliyet' },
        { id: 3, groupId: 1, english: 'able', turkish: 'yapabilen, muktedir' },
        { id: 4, groupId: 1, english: 'about', turkish: 'hakkında, yaklaşık' },
        { id: 5, groupId: 1, english: 'above', turkish: 'üzerinde, yukarıda' },
        { id: 6, groupId: 1, english: 'abroad', turkish: 'yurt dışı' },
        { id: 7, groupId: 1, english: 'absence', turkish: 'yokluk, bulunmayış' },
        { id: 8, groupId: 1, english: 'absolute', turkish: 'mutlak, kesin' },
        { id: 9, groupId: 1, english: 'absorb', turkish: 'emmek, içine çekmek' },
        { id: 10, groupId: 1, english: 'be', turkish: 'olmak', v1: 'be', v2: 'was / were', v3: 'been' },
        { id: 11, groupId: 1, english: 'begin', turkish: 'başlamak', v1: 'begin', v2: 'began', v3: 'begun' },
        { id: 12, groupId: 1, english: 'break', turkish: 'kırmak', v1: 'break', v2: 'broke', v3: 'broken' },

        // Group 2
        { id: 13, groupId: 2, english: 'academic', turkish: 'akademik' },
        { id: 14, groupId: 2, english: 'accept', turkish: 'kabul etmek' },
        { id: 15, groupId: 2, english: 'access', turkish: 'erişim, ulaşmak' },
        { id: 16, groupId: 2, english: 'accident', turkish: 'kaza' },
        { id: 17, groupId: 2, english: 'accompany', turkish: 'eşlik etmek' },
        { id: 18, groupId: 2, english: 'bring', turkish: 'getirmek', v1: 'bring', v2: 'brought', v3: 'brought' },
        { id: 19, groupId: 2, english: 'build', turkish: 'inşa etmek', v1: 'build', v2: 'built', v3: 'built' },
        { id: 20, groupId: 2, english: 'buy', turkish: 'satın almak', v1: 'buy', v2: 'bought', v3: 'bought' },

        // Group 3
        { id: 21, groupId: 3, english: 'challenge', turkish: 'meydan okuma, zorluk' },
        { id: 22, groupId: 3, english: 'champion', turkish: 'şampiyon' },
        { id: 23, groupId: 3, english: 'chance', turkish: 'şans, fırsat' },
        { id: 24, groupId: 3, english: 'choose', turkish: 'seçmek', v1: 'choose', v2: 'chose', v3: 'chosen' },
        { id: 25, groupId: 3, english: 'come', turkish: 'gelmek', v1: 'come', v2: 'came', v3: 'come' },

        // Generate default items for remaining groups 4 to 30
        ...Array.from({ length: 27 }, (_, i) => {
            const gId = i + 4;
            return [
                { id: gId * 10 + 1, groupId: gId, english: `achieve (G${gId})`, turkish: 'başarmak, elde etmek' },
                { id: gId * 10 + 2, groupId: gId, english: `believe (G${gId})`, turkish: 'inanmak' },
                { id: gId * 10 + 3, groupId: gId, english: `create (G${gId})`, turkish: 'yaratmak, oluşturmak' },
                { id: gId * 10 + 4, groupId: gId, english: `discover (G${gId})`, turkish: 'keşfetmek' },
                { id: gId * 10 + 5, groupId: gId, english: `explore (G${gId})`, turkish: 'keşfe çıkmak' },
                { id: gId * 10 + 6, groupId: gId, english: `do (G${gId})`, turkish: 'yapmak', v1: 'do', v2: 'did', v3: 'done' },
                { id: gId * 10 + 7, groupId: gId, english: `eat (G${gId})`, turkish: 'yemek', v1: 'eat', v2: 'ate', v3: 'eaten' },
                { id: gId * 10 + 8, groupId: gId, english: `go (G${gId})`, turkish: 'gitmek', v1: 'go', v2: 'went', v3: 'gone' }
            ];
        }).flat()
    ],
    Spanish: Array.from({ length: 9 }, (_, i) => {
        const gId = i + 1;
        return [
            { id: gId * 10 + 1, groupId: gId, english: 'Hola', turkish: 'Merhaba' },
            { id: gId * 10 + 2, groupId: gId, english: 'Gracias', turkish: 'Teşekkürler' },
            { id: gId * 10 + 3, groupId: gId, english: 'Por favor', turkish: 'Lütfen' },
            { id: gId * 10 + 4, groupId: gId, english: 'Amigo', turkish: 'Arkadaş' },
            { id: gId * 10 + 5, groupId: gId, english: 'Agua', turkish: 'Su' },
            { id: gId * 10 + 6, groupId: gId, english: 'Tiempo', turkish: 'Zaman' }
        ];
    }).flat(),
    German: Array.from({ length: 10 }, (_, i) => {
        const gId = i + 1;
        return [
            { id: gId * 10 + 1, groupId: gId, english: 'Hallo', turkish: 'Merhaba' },
            { id: gId * 10 + 2, groupId: gId, english: 'Danke', turkish: 'Teşekkürler' },
            { id: gId * 10 + 3, groupId: gId, english: 'Bitte', turkish: 'Lütfen / Rica ederim' },
            { id: gId * 10 + 4, groupId: gId, english: 'Wasser', turkish: 'Su' },
            { id: gId * 10 + 5, groupId: gId, english: 'Haus', turkish: 'Ev' },
            { id: gId * 10 + 6, groupId: gId, english: 'Zeit', turkish: 'Zaman' }
        ];
    }).flat(),
    French: Array.from({ length: 10 }, (_, i) => {
        const gId = i + 1;
        return [
            { id: gId * 10 + 1, groupId: gId, english: 'Bonjour', turkish: 'Merhaba / İyi günler' },
            { id: gId * 10 + 2, groupId: gId, english: 'Merci', turkish: 'Teşekkürler' },
            { id: gId * 10 + 3, groupId: gId, english: 'S\'il vous plaît', turkish: 'Lütfen' },
            { id: gId * 10 + 4, groupId: gId, english: 'Eau', turkish: 'Su' },
            { id: gId * 10 + 5, groupId: gId, english: 'Maison', turkish: 'Ev' },
            { id: gId * 10 + 6, groupId: gId, english: 'Temps', turkish: 'Zaman' }
        ];
    }).flat(),
    Norwegian: Array.from({ length: 5 }, (_, i) => {
        const gId = i + 1;
        return [
            { id: gId * 10 + 1, groupId: gId, english: 'Hei', turkish: 'Merhaba' },
            { id: gId * 10 + 2, groupId: gId, english: 'Takk', turkish: 'Teşekkürler' },
            { id: gId * 10 + 3, groupId: gId, english: 'Vær så snill', turkish: 'Lütfen' },
            { id: gId * 10 + 4, groupId: gId, english: 'Vann', turkish: 'Su' },
            { id: gId * 10 + 5, groupId: gId, english: 'Hus', turkish: 'Ev' },
            { id: gId * 10 + 6, groupId: gId, english: 'Tid', turkish: 'Zaman' }
        ];
    }).flat()
};

// ── DATA LOADING FUNCTIONS ──
async function loadLanguageData(langName) {
    currentLanguage = langName;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const response = await fetch(`${API_BASE_URL}/${langName}`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP Hatası: ${response.status}`);
        wordsData = await response.json();
        console.log(`✅ ${langName} sunucudan yüklendi:`, wordsData.length);
    } catch (error) {
        console.warn(`⚠️ ${langName} sunucudan alınamadı, yerel verisetine geçiliyor:`, error.message);
        wordsData = FALLBACK_DATA[langName] || FALLBACK_DATA.English;
    }

    allWords = {};
    wordsData.forEach(word => {
        const key = `group${word.groupId || 1}`;
        if (!allWords[key]) allWords[key] = [];
        allWords[key].push({
            id: word.id,
            en: word.english || word.word || word.en || '',
            tr: word.turkish || word.tr || '',
            v1: word.v1,
            v2: word.v2,
            v3: word.v3
        });
    });
}

async function loadVerbsLabData() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const response = await fetch(`${API_BASE_URL}/VerbsLab`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP Hatası: ${response.status}`);
        verbsLabData = await response.json();
        console.log("✅ VerbsLab sunucudan yüklendi:", verbsLabData.length);
    } catch (error) {
        console.warn("⚠️ VerbsLab sunucudan alınamadı, yerel fiiller yükleniyor:", error.message);
        verbsLabData = DEFAULT_VERBS_LAB;
    }
}

// ── AUTH MANAGER ──
const AuthManager = (() => {
    const LS_USERS = 'lumina_users';
    const LS_SESSION = 'lumina_session';

    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    function getUsers() {
        try {
            return JSON.parse(localStorage.getItem(LS_USERS) || '[]');
        } catch { return []; }
    }

    function saveUsers(users) {
        localStorage.setItem(LS_USERS, JSON.stringify(users));
    }

    function ensureAdminExists() {
        const users = getUsers();
        const adminExists = users.some(u => u.email === 'a@l.com');
        if (!adminExists) {
            users.push({
                email: 'a@l.com',
                name: 'Admin',
                passwordHash: simpleHash('123456'),
                role: 'admin',
                createdAt: new Date().toISOString()
            });
            saveUsers(users);
        }
    }

    function signUp(email, password, name) {
        email = email.trim().toLowerCase();
        if (!email || !password) return { ok: false, error: 'E-posta ve şifre zorunludur.' };
        if (password.length < 6) return { ok: false, error: 'Şifre en az 6 karakter olmalıdır.' };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Geçerli bir e-posta adresi girin.' };

        const users = getUsers();
        if (users.some(u => u.email === email)) {
            return { ok: false, error: 'Bu e-posta adresi zaten kayıtlı.' };
        }

        const newUser = {
            email,
            name: name ? name.trim() : email.split('@')[0],
            passwordHash: simpleHash(password),
            role: 'user',
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        saveUsers(users);
        return { ok: true, user: newUser };
    }

    function signIn(email, password) {
        email = email.trim().toLowerCase();
        const users = getUsers();
        const user = users.find(u => u.email === email);
        if (!user) return { ok: false, error: 'Bu e-posta adresi ile kayıtlı hesap bulunamadı.' };
        if (user.passwordHash !== simpleHash(password)) {
            return { ok: false, error: 'Şifre hatalı. Lütfen tekrar deneyin.' };
        }

        const session = { email: user.email, name: user.name, role: user.role, loginAt: new Date().toISOString() };
        localStorage.setItem(LS_SESSION, JSON.stringify(session));
        return { ok: true, user: session };
    }

    function signOut() {
        localStorage.removeItem(LS_SESSION);
    }

    function recoverPassword(email) {
        email = email.trim().toLowerCase();
        const users = getUsers();
        const user = users.find(u => u.email === email);
        if (!user) return { ok: false, error: 'Bu e-posta ile kayıtlı hesap bulunamadı.' };

        return {
            ok: true,
            message: `✅ Hesabınız bulundu! Doğrudan giriş yapabilirsiniz.\nE-posta: ${user.email}`
        };
    }

    function getSession() {
        try {
            return JSON.parse(localStorage.getItem(LS_SESSION) || 'null');
        } catch { return null; }
    }

    function isLoggedIn() { return getSession() !== null; }

    ensureAdminExists();

    return { signUp, signIn, signOut, recoverPassword, getSession, isLoggedIn };
})();

// ── AUTH UI FUNCTIONS ──
function authShowPanel(panel) {
    document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));

    ['siError', 'suError', 'suSuccess', 'fpError', 'fpSuccess'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.add('hidden'); el.textContent = ''; }
    });

    if (panel === 'signin') {
        document.getElementById('panelSignIn').classList.add('active');
        document.getElementById('tabSignIn').classList.add('active');
        document.getElementById('siEmail').focus();
    } else if (panel === 'signup') {
        document.getElementById('panelSignUp').classList.add('active');
        document.getElementById('tabSignUp').classList.add('active');
        document.getElementById('suName').focus();
    } else if (panel === 'forgot') {
        document.getElementById('panelForgot').classList.add('active');
        document.getElementById('fpEmail').focus();
    }
}

function authSetLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.style.opacity = loading ? '0.7' : '1';
}

function authShowMsg(id, msg, isError) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
}

function authSignIn() {
    const email = document.getElementById('siEmail').value;
    const password = document.getElementById('siPassword').value;
    const errEl = document.getElementById('siError');

    errEl.classList.add('hidden');

    if (!email || !password) {
        authShowMsg('siError', '⚠️ Lütfen tüm alanları doldurun.', true);
        return;
    }

    authSetLoading('btnSignIn', true);
    setTimeout(() => {
        const result = AuthManager.signIn(email, password);
        authSetLoading('btnSignIn', false);
        if (result.ok) {
            authGoToDashboard(result.user);
        } else {
            authShowMsg('siError', '⚠️ ' + result.error, true);
        }
    }, 200);
}

function authSignUp() {
    const name = document.getElementById('suName').value;
    const email = document.getElementById('suEmail').value;
    const password = document.getElementById('suPassword').value;

    document.getElementById('suError').classList.add('hidden');
    document.getElementById('suSuccess').classList.add('hidden');

    if (!email || !password) {
        authShowMsg('suError', '⚠️ E-posta ve şifre zorunludur.', true);
        return;
    }

    authSetLoading('btnSignUp', true);
    setTimeout(() => {
        const result = AuthManager.signUp(email, password, name);
        authSetLoading('btnSignUp', false);
        if (result.ok) {
            authShowMsg('suSuccess', '✅ Hesabınız oluşturuldu! Giriş yapılıyor…', false);
            setTimeout(() => {
                const loginResult = AuthManager.signIn(email, password);
                if (loginResult.ok) authGoToDashboard(loginResult.user);
            }, 600);
        } else {
            authShowMsg('suError', '⚠️ ' + result.error, true);
        }
    }, 200);
}

function authForgotPassword() {
    const email = document.getElementById('fpEmail').value;
    document.getElementById('fpError').classList.add('hidden');
    document.getElementById('fpSuccess').classList.add('hidden');

    if (!email) {
        authShowMsg('fpError', '⚠️ Lütfen e-posta adresinizi girin.', true);
        return;
    }

    authSetLoading('btnForgot', true);
    setTimeout(() => {
        const result = AuthManager.recoverPassword(email);
        authSetLoading('btnForgot', false);
        if (result.ok) {
            authShowMsg('fpSuccess', result.message, false);
        } else {
            authShowMsg('fpError', '⚠️ ' + result.error, true);
        }
    }, 200);
}

function authQuickAdmin() {
    document.getElementById('siEmail').value = 'a@l.com';
    document.getElementById('siPassword').value = '123456';
    authShowPanel('signin');
    authSignIn();
}

function authToggleEye(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = typeof btnId === 'string' ? document.getElementById(btnId) : btnId;
    if (input.type === 'password') {
        input.type = 'text';
        if (btn) btn.textContent = '🙈';
    } else {
        input.type = 'password';
        if (btn) btn.textContent = '👁';
    }
}

function authGoToDashboard(user) {
    updateUserUI(user);
    const topBar = document.getElementById('globalTopBar');
    if (topBar) topBar.classList.remove('hidden');
    NotificationManager.addNotification('Hoş Geldiniz', `${user.name || user.email} ile oturum açıldı.`, '👋');
    showScreen('languageScreen');
}

// ── ENTER KEY IN AUTH FORMS ──
document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    const activePanel = document.querySelector('.auth-panel.active');
    if (!activePanel) return;
    if (activePanel.id === 'panelSignIn') { authSignIn(); e.preventDefault(); }
    if (activePanel.id === 'panelSignUp') { authSignUp(); e.preventDefault(); }
    if (activePanel.id === 'panelForgot') { authForgotPassword(); e.preventDefault(); }
});

// ── DYNAMIC HELPERS ──
function activeTotalGroups() {
    if (state.lang === 'es') return TOTAL_GROUPS_ES;
    if (state.lang === 'de') return TOTAL_GROUPS_DE;
    if (state.lang === 'fr') return TOTAL_GROUPS_FR;
    if (state.lang === 'no') return TOTAL_GROUPS_NO;

    if (wordsData && wordsData.length > 0) {
        const groups = wordsData.map(w => w.groupId || 1);
        return Math.max(...groups, 1);
    }
    return TOTAL_GROUPS;
}

function activeLSKey() {
    if (state.lang === 'es') return LS_KEY_ES;
    if (state.lang === 'de') return LS_KEY_DE;
    if (state.lang === 'fr') return LS_KEY_FR;
    if (state.lang === 'no') return LS_KEY_NO;
    return LS_KEY;
}

function activeGroupName(i) {
    return `Grup ${i}`;
}

// ── LOCALSTORAGE HELPERS ──
function loadProgress() {
    try {
        const raw = localStorage.getItem(activeLSKey());
        if (!raw) return buildEmptyProgress();
        const p = JSON.parse(raw);
        if (!p.timeLogs) p.timeLogs = [];
        return p;
    } catch {
        return buildEmptyProgress();
    }
}

function buildEmptyProgress() {
    const p = { timeLogs: [] };
    for (let i = 1; i <= activeTotalGroups(); i++) {
        p[`group${i}`] = { known: [], errors: [], unsure: [] };
    }
    return p;
}

function saveProgress(progress) {
    localStorage.setItem(activeLSKey(), JSON.stringify(progress));
}

function getGroupProgress(progress, groupNum) {
    const key = `group${groupNum}`;
    if (!progress[key]) progress[key] = { known: [], errors: [], unsure: [] };
    if (!progress[key].unsure) progress[key].unsure = [];
    if (!progress[key].errors) progress[key].errors = [];
    if (!progress[key].known) progress[key].known = [];
    return progress[key];
}

// ── SCREENS MANAGER ──
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('active');
    el.style.animation = 'none';
    requestAnimationFrame(() => { el.style.animation = ''; });

    const topBar = document.getElementById('globalTopBar');
    const switchLangBtn = document.getElementById('btnSwitchLang');

    if (topBar) {
        if (id === 'authScreen') {
            topBar.classList.add('hidden');
        } else {
            topBar.classList.remove('hidden');
            const session = AuthManager.getSession();
            if (session) updateUserUI(session);
        }
    }

    if (switchLangBtn) {
        if (id === 'authScreen' || id === 'languageScreen') {
            switchLangBtn.classList.add('hidden');
        } else {
            switchLangBtn.classList.remove('hidden');
        }
    }
}

// ── DASHBOARD RENDER ──
function renderDashboard() {
    const progress = loadProgress();
    const grid = document.getElementById('groupsGrid');
    grid.innerHTML = '';

    let totalWords = 0;
    let totalKnown = 0;
    let totalErrors = 0;

    const totalGrp = activeTotalGroups();

    for (let i = 1; i <= totalGrp; i++) {
        const key = `group${i}`;
        const words = activeWords()[key] || [];
        const gp = getGroupProgress(progress, i);
        const wordCount = words.length;

        totalWords += wordCount;
        totalKnown += gp.known.length;
        totalErrors += (gp.errors.length + gp.unsure.length);

        const newCount = wordCount - gp.known.length - gp.errors.length - gp.unsure.length;
        const pct = wordCount > 0 ? Math.round((gp.known.length / wordCount) * 100) : 0;
        const circumference = 2 * Math.PI * 18;
        const offset = circumference - (pct / 100) * circumference;

        let ringColor = '#7c6ef7';
        if (pct === 100) ringColor = '#4ee8a0';
        else if (pct >= 60) ringColor = '#5ec4f5';

        const hasKnown = gp.known.length > 0;
        const hasErrors = gp.errors.length > 0;
        const hasUnsure = gp.unsure.length > 0;

        const dotsHTML = `
      <div class="group-status-dots">
        <div class="dot ${hasKnown ? 'ok' : ''}"></div>
        <div class="dot ${hasErrors ? 'err' : (hasUnsure ? 'unsure' : '')}"></div>
        <div class="dot ${newCount > 0 ? '' : 'ok'}"></div>
      </div>`;

        const card = document.createElement('button');
        card.className = 'group-card';
        card.id = `groupCard${i}`;
        card.setAttribute('aria-label', `${activeGroupName(i)} – ${wordCount} kelime`);
        card.innerHTML = `
      <div class="group-ring-wrap">
        <svg viewBox="0 0 44 44">
          <circle class="ring-bg"   cx="22" cy="22" r="18"/>
          <circle class="ring-fill" cx="22" cy="22" r="18"
            stroke="${ringColor}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"/>
        </svg>
        <div class="ring-pct">${wordCount > 0 ? pct + '%' : '—'}</div>
      </div>
      <span class="group-num">${i}</span>
      <span class="group-label" style="font-size:0.6rem; text-align:center; max-width:90px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${activeGroupName(i)}">${activeGroupName(i)}</span>
      <span class="group-label" style="font-size:0.65rem; color:var(--accent-1);">${wordCount || '—'} kelime</span>
      ${dotsHTML}
    `;
        card.addEventListener('click', () => openGroup(i));
        grid.appendChild(card);
    }

    const pctTotal = totalWords > 0 ? Math.round((totalKnown / totalWords) * 100) : 0;
    document.getElementById('totalProgress').textContent =
        `📚 Toplam: ${totalWords} kelime  ·  ✅ ${totalKnown} biliniyor  ·  🔴 ${totalErrors} hatalı  ·  Genel % ${pctTotal}`;

    // Timeline Rendering
    const timeLogs = progress.timeLogs || [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOfWeek = startOfToday - (6 * 86400000);

    const logsToday = timeLogs.filter(l => l.ts >= startOfToday).sort((a, b) => b.ts - a.ts);
    const logsYesterday = timeLogs.filter(l => l.ts >= startOfYesterday && l.ts < startOfToday).sort((a, b) => b.ts - a.ts);
    const logsWeek = timeLogs.filter(l => l.ts >= startOfWeek).sort((a, b) => b.ts - a.ts);

    const renderTLList = (logs, listId, countId) => {
        const cEl = document.getElementById(countId);
        const lEl = document.getElementById(listId);
        if (!cEl || !lEl) return;

        const countOk = logs.filter(x => (!x.type || x.type === 'correct')).length;
        const countUnsure = logs.filter(x => x.type === 'unsure').length;
        const countWrong = logs.filter(x => x.type === 'wrong').length;

        cEl.innerHTML = `✅ ${countOk} | 🤔 ${countUnsure} | ❌ ${countWrong}`;

        if (logs.length === 0) {
            lEl.innerHTML = '<div class="tl-empty">Henüz kelime logu yok.</div>';
        } else {
            lEl.innerHTML = logs.map(l => {
                let icon = '✅';
                if (l.type === 'wrong') icon = '❌';
                else if (l.type === 'unsure') icon = '🤔';
                return `
                <div class="tl-item type-${l.type || 'correct'}">
                    <span class="tl-item-en" style="display:flex; align-items:center; gap:6px;">${icon} ${l.en}</span>
                    <span class="tl-item-tr">${l.tr}</span>
                </div>
                `;
            }).join('');
        }
    };

    renderTLList(logsToday, 'tlListToday', 'tlCountToday');
    renderTLList(logsYesterday, 'tlListYesterday', 'tlCountYesterday');
    renderTLList(logsWeek, 'tlListWeek', 'tlCountWeek');

    // Header sub-text updates
    const logoSub = document.querySelector('.logo-sub');
    if (logoSub) {
        if (state.lang === 'es') {
            logoSub.textContent = `Kişisel İspanyolca Kelime Sistemi · ${totalGrp} Grup · ${totalWords} Kelime`;
        } else if (state.lang === 'de') {
            logoSub.textContent = `Kişisel Almanca Kelime Sistemi · ${totalGrp} Grup · ${totalWords} Kelime`;
        } else if (state.lang === 'fr') {
            logoSub.textContent = `Kişisel Fransızca Kelime Sistemi · ${totalGrp} Grup · ${totalWords} Kelime`;
        } else if (state.lang === 'no') {
            logoSub.textContent = `Kişisel Norveççe Kelime Sistemi · ${totalGrp} Grup · ${totalWords} Kelime`;
        } else {
            logoSub.textContent = `Kişisel İngilizce Kelime Sistemi · ${totalGrp} Grup · ${totalWords} Kelime`;
        }
    }

    const modulesSection = document.querySelector('.modules-section');
    if (modulesSection) modulesSection.style.display = (state.lang !== 'en') ? 'none' : '';

    showScreen('dashboard');
}

// ── GROUP SCREEN ──
function openGroup(groupNum) {
    state.currentGroup = groupNum;
    const key = `group${groupNum}`;
    const words = activeWords()[key] || [];
    const progress = loadProgress();
    const gp = getGroupProgress(progress, groupNum);

    document.getElementById('groupTitle').textContent = activeGroupName(groupNum);

    const knownSet = new Set(gp.known);
    const errorSet = new Set(gp.errors);
    const unsureSet = new Set(gp.unsure || []);
    const newIndices = words.map((_, i) => i).filter(i => !knownSet.has(i) && !errorSet.has(i) && !unsureSet.has(i));

    const cntNew = newIndices.length;
    const cntErrors = gp.errors.length;
    const cntKnown = gp.known.length;
    const cntUnsure = gp.unsure.length;

    const groupVerbs = words.filter(w => verbsLabData.some(vd => vd && vd.v1 === w.en));
    const cntLabGroup = groupVerbs.length;

    document.getElementById('countNew').textContent = cntNew;
    document.getElementById('countErrors').textContent = cntErrors;
    document.getElementById('countKnown').textContent = cntKnown;
    if (document.getElementById('countUnsure')) document.getElementById('countUnsure').textContent = cntUnsure;
    document.getElementById('countLabGroup').textContent = cntLabGroup;

    document.getElementById('groupStats').innerHTML = `
    <span class="stat-pill new">🌱 ${cntNew} yeni</span>
    <span class="stat-pill err">🔴 ${cntErrors} hatalı</span>
    <span class="stat-pill unsure" style="color:#f5c45e">🤔 ${cntUnsure} kararsız</span>
    <span class="stat-pill ok">✅ ${cntKnown} biliniyor</span>
  `;

    document.getElementById('modeNew').disabled = cntNew === 0;
    document.getElementById('modeErrors').disabled = cntErrors === 0;
    document.getElementById('modeKnown').disabled = cntKnown === 0;
    if (document.getElementById('modeUnsure')) document.getElementById('modeUnsure').disabled = cntUnsure === 0;

    const labGroupBtn = document.getElementById('modeLabGroup');
    if (labGroupBtn) {
        labGroupBtn.style.display = state.lang === 'es' ? 'none' : '';
        labGroupBtn.disabled = cntLabGroup === 0;
    }

    showScreen('groupScreen');
}

// ── SESSION LOGIC ──
function startSession(mode) {
    const groupNum = state.currentGroup;
    const key = `group${groupNum}`;
    const words = activeWords()[key] || [];

    if (words.length === 0) {
        alert(`Grup ${groupNum} henüz boş.`);
        return;
    }

    const progress = loadProgress();
    const gp = getGroupProgress(progress, groupNum);
    const knownSet = new Set(gp.known);
    const errorSet = new Set(gp.errors);
    const unsureSet = new Set(gp.unsure);

    let indices = [];

    if (mode === 'new') {
        indices = words.map((_, i) => i).filter(i => !knownSet.has(i) && !errorSet.has(i) && !unsureSet.has(i));
    } else if (mode === 'errors') {
        indices = [...gp.errors];
    } else if (mode === 'unsure') {
        indices = [...gp.unsure];
    } else if (mode === 'known') {
        indices = [...gp.known];
    }

    if (indices.length === 0) {
        alert('Bu modda çalışılacak kelime yok!');
        return;
    }

    const queue = shuffle(indices).map(idx => ({ idx, word: words[idx] }));

    state.currentMode = mode;
    state.sessionQueue = queue;
    state.sessionIndex = 0;
    state.sessionCorrect = 0;
    state.sessionWrong = 0;
    state.sessionUnsure = 0;
    state.isFlipped = false;

    document.getElementById('fcGroupTitle').textContent = activeGroupName(groupNum);
    const modeLabels = { new: '🌱 Yeni', errors: '🔴 Hatalar', known: '✅ Bildiklerim', unsure: '🤔 Kararsızlar' };
    document.getElementById('fcModeBadge').textContent = modeLabels[mode] || mode;

    document.getElementById('sessionComplete').classList.add('hidden');
    showScreen('flashcardScreen');
    renderCard();
}

function renderCard() {
    const total = state.sessionQueue.length;
    const idx = state.sessionIndex;

    if (idx >= total) {
        showSessionComplete();
        return;
    }

    const { word } = state.sessionQueue[idx];

    const card = document.getElementById('flashCard');
    state.isFlipped = false;
    card.classList.remove('flipped');

    const pct = total > 0 ? Math.round((idx / total) * 100) : 0;
    document.getElementById('fcProgressFill').style.width = pct + '%';
    document.getElementById('fcProgressText').textContent = `${idx + 1} / ${total}`;

    document.getElementById('cardWordFront').textContent = word.en || '—';
    document.getElementById('cardWordBack').textContent = word.tr || '—';
    document.getElementById('cardWordBackEn').textContent = word.en || '';

    document.getElementById('btnWrong').disabled = false;
    document.getElementById('btnCorrect').disabled = false;
    document.getElementById('btnUnsure').disabled = false;

    const cardScene = document.getElementById('cardScene');
    cardScene.classList.remove('anim-in', 'anim-out');
    void cardScene.offsetWidth;
    cardScene.classList.add('anim-in');
}

function flipCard() {
    if (state.sessionIndex >= state.sessionQueue.length) return;

    state.isFlipped = !state.isFlipped;
    const card = document.getElementById('flashCard');

    if (state.isFlipped) {
        card.classList.add('flipped');
    } else {
        card.classList.remove('flipped');
    }
}

function answerCard(type) {
    if (state.sessionIndex >= state.sessionQueue.length) return;
    const { idx, word } = state.sessionQueue[state.sessionIndex];

    if (state.currentMode === 'sandbox') {
        if (type === 'correct') state.sessionCorrect++;
        else if (type === 'wrong') state.sessionWrong++;
        else state.sessionUnsure++;
    } else {
        const progress = loadProgress();
        const gp = getGroupProgress(progress, state.currentGroup);

        if (type === 'correct') {
            state.sessionCorrect++;
            if (!gp.known.includes(idx)) gp.known.push(idx);
            gp.errors = gp.errors.filter(e => e !== idx);
            gp.unsure = gp.unsure.filter(e => e !== idx);
        } else if (type === 'wrong') {
            state.sessionWrong++;
            if (!gp.errors.includes(idx)) gp.errors.push(idx);
            gp.known = gp.known.filter(e => e !== idx);
            gp.unsure = gp.unsure.filter(e => e !== idx);
        } else if (type === 'unsure') {
            state.sessionUnsure++;
            if (!gp.unsure.includes(idx)) gp.unsure.push(idx);
            gp.known = gp.known.filter(e => e !== idx);
            gp.errors = gp.errors.filter(e => e !== idx);
        }

        const todayStart = new Date().setHours(0, 0, 0, 0);
        progress.timeLogs = progress.timeLogs.filter(
            l => !(l.en === word.en && l.ts >= todayStart)
        );
        progress.timeLogs.push({ en: word.en, tr: word.tr, ts: Date.now(), type: type });

        saveProgress(progress);
    }

    const cardScene = document.getElementById('cardScene');
    cardScene.classList.remove('anim-in');
    cardScene.classList.add('anim-out');

    setTimeout(() => {
        state.sessionIndex++;
        renderCard();
    }, 200);
}

function showSessionComplete() {
    const total = state.sessionQueue.length;
    const correct = state.sessionCorrect;
    const wrong = state.sessionWrong;
    const unsure = state.sessionUnsure || 0;

    document.getElementById('completeStats').innerHTML = `
    <div class="cstat total">
      <span>📚 Toplam kart</span><span>${total}</span>
    </div>
    <div class="cstat ok">
      <span>✅ Biliyorum</span><span>${correct}</span>
    </div>
    <div class="cstat err">
      <span>❌ Bilmiyorum</span><span>${wrong}</span>
    </div>
    ${unsure > 0 ? `<div class="cstat" style="display:flex; justify-content:space-between; color:#f5c45e; font-weight:600; font-size:1.1rem; margin-top:8px;"><span>🤔 Kararsızım</span><span>${unsure}</span></div>` : ''}
    ${total > 0 ? `<div class="cstat total"><span>🎯 Başarı</span><span>${Math.round((correct / total) * 100)}%</span></div>` : ''}
  `;

    document.getElementById('fcProgressFill').style.width = '100%';
    document.getElementById('fcProgressText').textContent = `${total} / ${total}`;
    document.getElementById('sessionComplete').classList.remove('hidden');
}

// ── VERBS LAB MODULE ──
function renderLab() {
    state.currentMode = 'lab-global';
    document.getElementById('labTitle').textContent = `🧪 Kelime Laboratuvarı`;
    document.getElementById('btnBackLab').innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Dashboard`;

    const grid = document.getElementById('labGrid');
    grid.innerHTML = verbsLabData.map(v => `
        <div class="verb-card">
            <div class="verb-row"><span class="v-tag">V1</span><span class="v-word">${v.v1}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v1}')">🔊</button></div>
            <div class="verb-row"><span class="v-tag">V2</span><span class="v-word">${v.v2}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v2}')">🔊</button></div>
            <div class="verb-row"><span class="v-tag">V3</span><span class="v-word">${v.v3}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v3}')">🔊</button></div>
            <div class="v-tr">${v.tr}</div>
        </div>
    `).join('');
    showScreen('labScreen');
}

function startLabForGroup(groupNum) {
    const key = `group${groupNum}`;
    const words = allWords[key] || [];

    const groupVerbs = words.filter(w => verbsLabData.some(vd => vd && vd.v1 === w.en));
    const labItems = groupVerbs.map(w => verbsLabData.find(v => v && v.v1 === w.en)).filter(Boolean);

    state.currentMode = 'lab-group';
    document.getElementById('labTitle').textContent = `🧪 Grup ${groupNum} Fiilleri`;
    document.getElementById('btnBackLab').innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Gruba Dön`;

    const grid = document.getElementById('labGrid');
    if (labItems.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Bu grupta kayıtlı fiil bulunamadı.</div>';
    } else {
        grid.innerHTML = labItems.map(v => `
            <div class="verb-card">
                <div class="verb-row"><span class="v-tag">V1</span><span class="v-word">${v.v1}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v1}')">🔊</button></div>
                <div class="verb-row"><span class="v-tag">V2</span><span class="v-word">${v.v2}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v2}')">🔊</button></div>
                <div class="verb-row"><span class="v-tag">V3</span><span class="v-word">${v.v3}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v3}')">🔊</button></div>
                <div class="v-tr">${v.tr}</div>
            </div>
        `).join('');
    }
    showScreen('labScreen');
}

// ── MATCHING MODULE ──
let matchState = {
    selectedEng: null,
    selectedTr: null,
    words: []
};

function startMatch() {
    let pot = [];
    Object.values(allWords).forEach(group => {
        pot.push(...group);
    });

    if (pot.length === 0) {
        alert('Eşleştirme oyunu için kelime bulunamadı.');
        return;
    }

    const selectedCount = Math.min(pot.length, 6);
    const selected = shuffle(pot).slice(0, selectedCount);

    let engList = selected.map((w, i) => ({ id: i, text: w.en }));
    let trList = selected.map((w, i) => ({ id: i, text: w.tr }));

    engList = shuffle(engList);
    trList = shuffle(trList);

    matchState.selectedEng = null;
    matchState.selectedTr = null;
    matchState.words = selected;

    const engCol = document.getElementById('matchColEng');
    const trCol = document.getElementById('matchColTr');

    engCol.innerHTML = engList.map(item => `<button class="match-btn eng-btn" data-id="${item.id}">${item.text}</button>`).join('');
    trCol.innerHTML = trList.map(item => `<button class="match-btn tr-btn" data-id="${item.id}">${item.text}</button>`).join('');

    document.querySelectorAll('.eng-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('matched')) return;
            document.querySelectorAll('.eng-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            matchState.selectedEng = btn;
            checkMatch();
        });
    });

    document.querySelectorAll('.tr-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('matched')) return;
            document.querySelectorAll('.tr-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            matchState.selectedTr = btn;
            checkMatch();
        });
    });

    showScreen('matchScreen');
}

function checkMatch() {
    if (!matchState.selectedEng || !matchState.selectedTr) return;

    const eBtn = matchState.selectedEng;
    const tBtn = matchState.selectedTr;

    if (eBtn.dataset.id === tBtn.dataset.id) {
        eBtn.classList.remove('active');
        tBtn.classList.remove('active');
        eBtn.classList.add('matched');
        tBtn.classList.add('matched');

        const matchedCount = document.querySelectorAll('.eng-btn.matched').length;
        if (matchedCount === matchState.words.length) {
            setTimeout(() => {
                alert('🎉 Tebrikler! Tüm kelimeleri başarıyla eşleştirdiniz!');
            }, 300);
        }
    } else {
        eBtn.classList.add('wrong');
        tBtn.classList.add('wrong');
        setTimeout(() => {
            eBtn.classList.remove('wrong', 'active');
            tBtn.classList.remove('wrong', 'active');
        }, 400);
    }
    matchState.selectedEng = null;
    matchState.selectedTr = null;
}

// ── SANDBOX MODULE ──
function startSandbox() {
    const progress = loadProgress();
    let errorIndicesWithGroups = [];

    const totalGrp = activeTotalGroups();
    for (let i = 1; i <= totalGrp; i++) {
        const key = `group${i}`;
        const gp = getGroupProgress(progress, i);
        if (gp.errors && gp.errors.length > 0 && allWords[key]) {
            gp.errors.forEach(idx => {
                if (allWords[key][idx]) {
                    errorIndicesWithGroups.push({ groupNum: i, idx: idx, word: allWords[key][idx] });
                }
            });
        }
    }

    if (errorIndicesWithGroups.length === 0) {
        alert('Harika! Sistemde hatalı bildiğiniz kelime yok.');
        return;
    }

    state.currentMode = 'sandbox';
    state.currentGroup = null;
    state.sessionQueue = shuffle(errorIndicesWithGroups);
    state.sessionIndex = 0;
    state.sessionCorrect = 0;
    state.sessionWrong = 0;
    state.sessionUnsure = 0;
    state.isFlipped = false;

    document.getElementById('fcGroupTitle').textContent = `Sandbox (${errorIndicesWithGroups.length} Hata)`;
    document.getElementById('fcModeBadge').textContent = '🏖️ Pekiştirme (No Stats)';
    document.getElementById('sessionComplete').classList.add('hidden');

    showScreen('flashcardScreen');
    renderCard();
}

// ── UTILITIES ──
function playAudio(text, lang = 'en-US') {
    if (!window.speechSynthesis) return;
    const safeText = text.replace('/', ' or ');
    const utterance = new SpeechSynthesisUtterance(safeText);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

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
                        <span class="notif-item-icon">${n.icon}</span>
                        <div class="notif-item-text">
                            <strong>${n.title}</strong>
                            <div>${n.message}</div>
                            <div class="notif-item-time">${n.time}</div>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    return { addNotification, clearNotifications, renderNotifs, getNotifs };
})();

// ── USER PROFILE & PASSWORD MANAGER EXTENSIONS ──
AuthManager.updateProfile = function (newName) {
    const session = AuthManager.getSession();
    if (!session) return { ok: false, error: 'Oturum bulunamadı.' };

    const users = JSON.parse(localStorage.getItem('lumina_users') || '[]');
    const userIndex = users.findIndex(u => u.email === session.email);
    if (userIndex === -1) return { ok: false, error: 'Kullanıcı bulunamadı.' };

    const trimmedName = newName.trim() || session.email.split('@')[0];
    users[userIndex].name = trimmedName;
    localStorage.setItem('lumina_users', JSON.stringify(users));

    session.name = trimmedName;
    localStorage.setItem('lumina_session', JSON.stringify(session));

    updateUserUI(session);
    NotificationManager.addNotification('Profil Güncellendi', 'İsminiz başarıyla güncellendi.', '✏️');
    return { ok: true, user: session };
};

AuthManager.changePassword = function (oldPassword, newPassword) {
    const session = AuthManager.getSession();
    if (!session) return { ok: false, error: 'Oturum bulunamadı.' };

    if (!oldPassword || !newPassword) return { ok: false, error: 'Lütfen tüm alanları doldurun.' };
    if (newPassword.length < 6) return { ok: false, error: 'Yeni şifre en az 6 karakter olmalıdır.' };

    const users = JSON.parse(localStorage.getItem('lumina_users') || '[]');
    const user = users.find(u => u.email === session.email);
    if (!user) return { ok: false, error: 'Kullanıcı bulunamadı.' };

    let hash = 0;
    for (let i = 0; i < oldPassword.length; i++) {
        const char = oldPassword.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const oldHashStr = hash.toString(36);

    if (user.passwordHash !== oldHashStr) {
        return { ok: false, error: 'Mevcut şifreniz hatalı.' };
    }

    let newHash = 0;
    for (let i = 0; i < newPassword.length; i++) {
        const char = newPassword.charCodeAt(i);
        newHash = ((newHash << 5) - newHash) + char;
        newHash = newHash & newHash;
    }
    user.passwordHash = newHash.toString(36);

    localStorage.setItem('lumina_users', JSON.stringify(users));
    NotificationManager.addNotification('Şifre Değiştirildi', 'Şifreniz başarıyla güncellendi.', '🔑');
    return { ok: true };
};

function updateUserUI(session) {
    if (!session) return;

    const initial = (session.name || session.email).charAt(0).toUpperCase();
    const displayName = session.name || session.email.split('@')[0];

    const topAvatar = document.getElementById('topUserAvatar');
    const menuAvatar = document.getElementById('menuUserAvatar');
    const maAvatar = document.getElementById('maAvatar');
    const dashAvatar = document.getElementById('dashUserAvatar');

    if (topAvatar) topAvatar.textContent = initial;
    if (menuAvatar) menuAvatar.textContent = initial;
    if (maAvatar) maAvatar.textContent = initial;
    if (dashAvatar) dashAvatar.textContent = initial;

    const topName = document.getElementById('topUserName');
    const menuName = document.getElementById('menuUserName');
    const menuEmail = document.getElementById('menuUserEmail');
    const dashEmail = document.getElementById('dashUserEmail');

    if (topName) topName.textContent = displayName;
    if (menuName) menuName.textContent = displayName;
    if (menuEmail) menuEmail.textContent = session.email;
    if (dashEmail) dashEmail.textContent = session.email;

    const roleBadge = document.getElementById('menuUserRoleBadge');
    const maBadge = document.getElementById('maRoleBadge');
    const isAdmin = session.role === 'admin';

    [roleBadge, maBadge].forEach(b => {
        if (b) {
            b.textContent = isAdmin ? '⚡ Admin' : '👤 Kullanıcı';
            b.className = 'user-role-badge ' + (isAdmin ? 'admin' : 'user');
        }
    });

    updateTopBarFlag();
}

function updateTopBarFlag() {
    const flagEl = document.getElementById('topUserLangFlag');
    if (!flagEl) return;
    const flags = { 'en': '🇬🇧', 'es': '🇪🇸', 'de': '🇩🇪', 'fr': '🇫🇷', 'no': '🇳🇴' };
    flagEl.textContent = flags[state.lang] || '🇬🇧';
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
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

function saveProfileChanges() {
    const newName = document.getElementById('maNameInput').value;
    const errEl = document.getElementById('maError');
    const succEl = document.getElementById('maSuccess');

    errEl.classList.add('hidden');
    succEl.classList.add('hidden');

    const result = AuthManager.updateProfile(newName);
    if (result.ok) {
        succEl.textContent = '✅ Profil bilgileriniz kaydedildi!';
        succEl.classList.remove('hidden');
        setTimeout(() => closeModal('manageAccountModal'), 1000);
    } else {
        errEl.textContent = '⚠️ ' + result.error;
        errEl.classList.remove('hidden');
    }
}

function savePasswordChanges() {
    const oldPass = document.getElementById('cpOldPassword').value;
    const newPass = document.getElementById('cpNewPassword').value;
    const confPass = document.getElementById('cpConfirmPassword').value;

    const errEl = document.getElementById('cpError');
    const succEl = document.getElementById('cpSuccess');

    errEl.classList.add('hidden');
    succEl.classList.add('hidden');

    if (newPass !== confPass) {
        errEl.textContent = '⚠️ Yeni şifreler birbiriyle eşleşmiyor.';
        errEl.classList.remove('hidden');
        return;
    }

    const result = AuthManager.changePassword(oldPass, newPass);
    if (result.ok) {
        succEl.textContent = '✅ Şifreniz başarıyla değiştirildi!';
        succEl.classList.remove('hidden');
        setTimeout(() => closeModal('changePasswordModal'), 1000);
    } else {
        errEl.textContent = '⚠️ ' + result.error;
        errEl.classList.remove('hidden');
    }
}

window.authSignOut = function () {
    openModal('logoutConfirmModal');
};

window.executeSignOut = function () {
    closeModal('logoutConfirmModal');
    AuthManager.signOut();
    const topBar = document.getElementById('globalTopBar');
    if (topBar) topBar.classList.add('hidden');
    document.getElementById('userDropdownMenu')?.classList.add('hidden');
    showScreen('authScreen');
};

// ── INITIALIZATION ──
document.addEventListener('DOMContentLoaded', async () => {
    loadSavedTheme();
    NotificationManager.renderNotifs();

    // Initial language load
    await loadLanguageData('English');
    await loadVerbsLabData();

    // Reset Progress Button
    document.getElementById('btnResetProgress')?.addEventListener('click', () => {
        if (confirm('Tüm ilerlemeniz kalıcı olarak silinecek. Emin misiniz?')) {
            localStorage.removeItem(activeLSKey());
            renderDashboard();
        }
    });

    // Navigation buttons
    document.getElementById('btnBack')?.addEventListener('click', renderDashboard);
    document.getElementById('btnBackFC')?.addEventListener('click', () => openGroup(state.currentGroup));

    // Card mode buttons
    document.getElementById('modeNew')?.addEventListener('click', () => startSession('new'));
    document.getElementById('modeErrors')?.addEventListener('click', () => startSession('errors'));
    document.getElementById('modeUnsure')?.addEventListener('click', () => startSession('unsure'));
    document.getElementById('modeKnown')?.addEventListener('click', () => startSession('known'));
    document.getElementById('modeLabGroup')?.addEventListener('click', () => startLabForGroup(state.currentGroup));

    // Flashcard interaction
    document.getElementById('flashCard')?.addEventListener('click', flipCard);
    document.getElementById('btnCorrect')?.addEventListener('click', () => answerCard('correct'));
    document.getElementById('btnUnsure')?.addEventListener('click', () => answerCard('unsure'));
    document.getElementById('btnWrong')?.addEventListener('click', () => answerCard('wrong'));

    document.getElementById('btnRestartSession')?.addEventListener('click', () => {
        document.getElementById('sessionComplete').classList.add('hidden');
        startSession(state.currentMode);
    });
    document.getElementById('btnBackToGroup')?.addEventListener('click', () => {
        document.getElementById('sessionComplete').classList.add('hidden');
        openGroup(state.currentGroup);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        const screen = document.querySelector('.screen.active')?.id;
        if (screen !== 'flashcardScreen') return;
        if (document.getElementById('sessionComplete').classList.contains('hidden') === false) return;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

        switch (e.key) {
            case ' ':
            case 'ArrowUp':
                e.preventDefault();
                flipCard();
                break;
            case 'ArrowRight':
            case '1':
                answerCard('correct');
                break;
            case 'ArrowLeft':
            case '2':
                answerCard('wrong');
                break;
            case 'ArrowDown':
            case '3':
                answerCard('unsure');
                break;
        }
    });

    // Modules
    document.getElementById('btnGoLab')?.addEventListener('click', renderLab);
    document.getElementById('btnGoMatch')?.addEventListener('click', startMatch);
    document.getElementById('btnGoSandbox')?.addEventListener('click', startSandbox);
    document.getElementById('btnBackLab')?.addEventListener('click', () => {
        if (state.currentMode === 'lab-group') {
            openGroup(state.currentGroup);
        } else {
            renderDashboard();
        }
    });
    document.getElementById('btnBackMatch')?.addEventListener('click', renderDashboard);
    document.getElementById('btnRefreshMatch')?.addEventListener('click', startMatch);

    // Shuffle
    document.getElementById('btnShuffleSession')?.addEventListener('click', () => {
        if (!state.sessionQueue || state.sessionQueue.length === 0) return;
        const remaining = state.sessionQueue.slice(state.sessionIndex);
        if (remaining.length < 2) return;

        const shuffled = shuffle(remaining);
        state.sessionQueue = [
            ...state.sessionQueue.slice(0, state.sessionIndex),
            ...shuffled
        ];

        const btn = document.getElementById('btnShuffleSession');
        const oldText = btn.innerHTML;
        btn.innerHTML = '✅ İlerisi Karıştırıldı';
        setTimeout(() => btn.innerHTML = oldText, 1000);

        renderCard();
    });

    // Language Selectors
    const btnLangEn = document.getElementById('btnLangEn');
    const btnLangEs = document.getElementById('btnLangEs');
    const btnLangDe = document.getElementById('btnLangDe');
    const btnLangFr = document.getElementById('btnLangFr');
    const btnLangNo = document.getElementById('btnLangNo');

    if (btnLangEn) {
        btnLangEn.addEventListener('click', async () => {
            state.lang = 'en';
            document.body.classList.remove('theme-es', 'theme-de', 'theme-fr', 'theme-no');
            await loadLanguageData('English');
            renderDashboard();
        });
    }

    if (btnLangEs) {
        btnLangEs.addEventListener('click', async () => {
            state.lang = 'es';
            document.body.classList.remove('theme-de', 'theme-fr', 'theme-no');
            document.body.classList.add('theme-es');
            await loadLanguageData('Spanish');
            renderDashboard();
        });
    }

    if (btnLangDe) {
        btnLangDe.addEventListener('click', async () => {
            state.lang = 'de';
            document.body.classList.remove('theme-es', 'theme-fr', 'theme-no');
            document.body.classList.add('theme-de');
            await loadLanguageData('German');
            renderDashboard();
        });
    }

    if (btnLangFr) {
        btnLangFr.addEventListener('click', async () => {
            state.lang = 'fr';
            document.body.classList.remove('theme-es', 'theme-de', 'theme-no');
            document.body.classList.add('theme-fr');
            await loadLanguageData('French');
            renderDashboard();
        });
    }

    if (btnLangNo) {
        btnLangNo.addEventListener('click', async () => {
            state.lang = 'no';
            document.body.classList.remove('theme-es', 'theme-de', 'theme-fr');
            document.body.classList.add('theme-no');
            await loadLanguageData('Norwegian');
            renderDashboard();
        });
    }

    const btnSwitchLang = document.getElementById('btnSwitchLang');
    if (btnSwitchLang) {
        btnSwitchLang.addEventListener('click', () => {
            showScreen('languageScreen');
        });
    }

    // Top bar & modal UI listeners
    document.getElementById('btnThemeToggle')?.addEventListener('click', toggleTheme);

    const notifBtn = document.getElementById('btnNotifToggle');
    const notifPop = document.getElementById('notifPopover');
    if (notifBtn && notifPop) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifPop.classList.toggle('hidden');
            document.getElementById('userDropdownMenu')?.classList.add('hidden');
        });
    }

    document.getElementById('btnClearNotifs')?.addEventListener('click', () => {
        NotificationManager.clearNotifications();
    });

    const dropTrigger = document.getElementById('userDropdownTrigger');
    const dropMenu = document.getElementById('userDropdownMenu');
    const dropWrapper = document.querySelector('.user-dropdown-wrapper');

    if (dropTrigger && dropMenu) {
        dropTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dropMenu.classList.toggle('hidden');
            dropWrapper?.classList.toggle('active', !isHidden);
            document.getElementById('notifPopover')?.classList.add('hidden');
        });
    }

    document.getElementById('btnOpenManageAccount')?.addEventListener('click', () => openModal('manageAccountModal'));
    document.getElementById('btnOpenChangePassword')?.addEventListener('click', () => openModal('changePasswordModal'));

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-dropdown-wrapper')) {
            dropMenu?.classList.add('hidden');
            dropWrapper?.classList.remove('active');
        }
        if (!e.target.closest('.notif-wrapper')) {
            notifPop?.classList.add('hidden');
        }
    });

    // Check existing session
    const session = AuthManager.getSession();
    if (session) {
        updateUserUI(session);
        showScreen('languageScreen');
    } else {
        showScreen('authScreen');
    }
});