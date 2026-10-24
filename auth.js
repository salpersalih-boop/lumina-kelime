/* ============================================================
   LUMINA — KİMLİK DOĞRULAMA (Firebase Authentication) + İLERLEME SENKRONU
   - E-posta/şifre, Google, şifre sıfırlama (gerçek e-posta), e-posta doğrulama
   - Misafir modu (hesapsız, yalnızca bu cihazda)
   - İlerleme: localStorage (hızlı) + Firestore (cihazlar arası)
   Gerekenler: firebase-config.js (önce yüklenir), Firebase compat SDK'ları
============================================================ */

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}

const PROGRESS_BASE_KEYS = {
    en: 'lumina_progress_en',
    es: 'lumina_progress_es',
    de: 'lumina_progress_de',
    fr: 'lumina_progress_fr',
    no: 'lumina_progress_no',
    sv: 'lumina_progress_sv',
    futbol: 'lumina_progress_futbol'
};

const AuthManager = (() => {
    const GUEST_FLAG = 'lumina_guest';
    const cfg = (window.LUMINA_CONFIG && window.LUMINA_CONFIG.firebase) || {};
    const configured = typeof firebase !== 'undefined'
        && !!cfg.apiKey && !/BURAYA|YOUR_|PROJE_ID/i.test(cfg.apiKey + (cfg.projectId || ''));

    let auth = null;
    let db = null;
    let session = null;
    let firstStateSeen = false;
    const changeListeners = [];

    let resolveReady;
    const ready = new Promise(res => { resolveReady = res; });

    function readGuestFlag() {
        try { return localStorage.getItem(GUEST_FLAG) === '1'; } catch { return false; }
    }
    function setGuestFlag(on) {
        try { on ? localStorage.setItem(GUEST_FLAG, '1') : localStorage.removeItem(GUEST_FLAG); } catch { /* yoksay */ }
    }

    function guestSession() {
        return { uid: 'guest', guest: true, email: '', name: 'Misafir', picture: '', role: 'user', authProvider: 'guest', emailVerified: false };
    }

    function buildSession(user, role) {
        const providers = (user.providerData || []).map(p => p.providerId);
        const isGoogle = providers.includes('google.com') && !providers.includes('password');
        return {
            uid: user.uid,
            guest: false,
            email: user.email || '',
            name: user.displayName || (user.email ? user.email.split('@')[0] : 'Kullanıcı'),
            picture: user.photoURL || '',
            role: role || 'user',
            authProvider: isGoogle ? 'google' : 'password',
            emailVerified: !!user.emailVerified
        };
    }

    function emit() { changeListeners.forEach(fn => { try { fn(session); } catch (e) { console.error(e); } }); }

    // ── Hata mesajları (Türkçe) ──
    const ERRORS = {
        'auth/invalid-email': 'Geçerli bir e-posta adresi girin.',
        'auth/missing-email': 'Lütfen e-posta adresinizi girin.',
        'auth/user-disabled': 'Bu hesap devre dışı bırakılmış.',
        'auth/user-not-found': 'Bu e-posta ile kayıtlı hesap bulunamadı.',
        'auth/wrong-password': 'E-posta veya şifre hatalı.',
        'auth/invalid-credential': 'E-posta veya şifre hatalı.',
        'auth/invalid-login-credentials': 'E-posta veya şifre hatalı.',
        'auth/email-already-in-use': 'Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.',
        'auth/weak-password': 'Şifre en az 6 karakter olmalıdır.',
        'auth/too-many-requests': 'Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin.',
        'auth/network-request-failed': 'İnternet bağlantısı kurulamadı. Bağlantınızı kontrol edin.',
        'auth/requires-recent-login': 'Güvenlik için lütfen çıkış yapıp tekrar giriş yapın.',
        'auth/account-exists-with-different-credential': 'Bu e-posta başka bir giriş yöntemiyle kayıtlı. O yöntemle giriş yapın.',
        'auth/unauthorized-domain': 'Bu alan adı Firebase\'de yetkilendirilmemiş (Authentication → Settings → Authorized domains).',
        'auth/operation-not-allowed': 'Bu giriş yöntemi Firebase Console\'da etkin değil.',
        'auth/popup-blocked': 'Tarayıcı açılır pencereyi engelledi.',
        'permission-denied': 'Bu işlem için yetkiniz yok.'
    };
    function errText(e) {
        const code = e && e.code;
        return ERRORS[code] || ('Beklenmeyen bir hata oluştu' + (code ? ` (${code})` : '') + '.');
    }
    function notConfigured() {
        return { ok: false, error: 'Firebase henüz yapılandırılmadı. firebase-config.js dosyasına proje ayarlarınızı girin ya da "Misafir" olarak devam edin.' };
    }

    // ── Firestore: kullanıcı profili + rol ──
    async function loadRoleAndTouchProfile(user) {
        if (!db) return 'user';
        const ref = db.collection('users').doc(user.uid);
        let role = 'user';
        try {
            const snap = await ref.get();
            if (snap.exists && snap.data().role === 'admin') role = 'admin';
            await ref.set({
                email: user.email || '',
                name: user.displayName || '',
                photoURL: user.photoURL || '',
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.warn('Kullanıcı profili okunamadı/yazılamadı:', e.code || e.message);
        }
        return role;
    }

    // Eski sürümde e-postaya göre tutulan ilerlemeyi yeni (uid) anahtara taşı
    function migrateLegacyProgress(user) {
        if (!user.email) return;
        const email = user.email.toLowerCase();
        Object.values(PROGRESS_BASE_KEYS).forEach(base => {
            try {
                const newKey = `${base}_${user.uid}`;
                const oldKey = `${base}_${email}`;
                if (!localStorage.getItem(newKey) && localStorage.getItem(oldKey)) {
                    localStorage.setItem(newKey, localStorage.getItem(oldKey));
                }
            } catch { /* yoksay */ }
        });
    }

    function init() {
        if (!configured) {
            console.info('ℹ️ Firebase yapılandırılmadı: yalnızca misafir modu kullanılabilir.');
            session = readGuestFlag() ? guestSession() : null;
            firstStateSeen = true;
            resolveReady(session);
            return;
        }

        firebase.initializeApp(cfg);
        auth = firebase.auth();
        auth.languageCode = 'tr';
        db = firebase.firestore();

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                setGuestFlag(false);
                migrateLegacyProgress(user);
                const role = await loadRoleAndTouchProfile(user);
                session = buildSession(user, role);
                SyncManager.pullAll(session).catch(e => console.warn('Senkron hatası:', e.message));
            } else {
                session = readGuestFlag() ? guestSession() : null;
            }
            if (!firstStateSeen) {
                firstStateSeen = true;
                resolveReady(session);
            } else {
                emit();
            }
        });

        // Google yönlendirme akışından dönüşte hataları yakala
        auth.getRedirectResult().catch(e => {
            if (e && e.code) authShowMsg('siError', '⚠️ ' + errText(e));
        });
    }

    // ── Herkese açık işlemler ──
    async function signUp(email, password, name) {
        email = (email || '').trim().toLowerCase();
        if (!email || !password) return { ok: false, error: 'E-posta ve şifre zorunludur.' };
        if (password.length < 6) return { ok: false, error: 'Şifre en az 6 karakter olmalıdır.' };
        if (!auth) return notConfigured();
        try {
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            const displayName = (name || '').trim() || email.split('@')[0];
            await cred.user.updateProfile({ displayName });
            cred.user.sendEmailVerification().catch(() => { /* kritik değil */ });
            await refreshSession();
            return { ok: true, user: session };
        } catch (e) {
            return { ok: false, error: errText(e) };
        }
    }

    async function signIn(email, password) {
        email = (email || '').trim().toLowerCase();
        if (!auth) return notConfigured();
        try {
            await auth.signInWithEmailAndPassword(email, password);
            await refreshSession();
            return { ok: true, user: session };
        } catch (e) {
            return { ok: false, error: errText(e) };
        }
    }

    async function signInWithGoogle() {
        if (!auth) return notConfigured();
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
            await auth.signInWithPopup(provider);
            await refreshSession();
            return { ok: true, user: session };
        } catch (e) {
            if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
                return { ok: false, silent: true };
            }
            if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
                try { await auth.signInWithRedirect(provider); return { ok: false, silent: true }; }
                catch (e2) { return { ok: false, error: errText(e2) }; }
            }
            return { ok: false, error: errText(e) };
        }
    }

    async function sendPasswordReset(email) {
        email = (email || '').trim();
        if (!email) return { ok: false, error: 'Lütfen e-posta adresinizi girin.' };
        if (!auth) return notConfigured();
        try {
            await auth.sendPasswordResetEmail(email);
        } catch (e) {
            // Hesap var/yok bilgisini sızdırmamak için "user-not-found" başarı gibi gösterilir
            if (e.code !== 'auth/user-not-found') return { ok: false, error: errText(e) };
        }
        return { ok: true, message: '✅ Bu adres kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.' };
    }

    async function updateProfileName(newName) {
        if (!auth || !auth.currentUser) return { ok: false, error: 'Oturum bulunamadı.' };
        const user = auth.currentUser;
        const name = (newName || '').trim() || (user.email ? user.email.split('@')[0] : 'Kullanıcı');
        try {
            await user.updateProfile({ displayName: name });
            if (db) db.collection('users').doc(user.uid).set({ name }, { merge: true }).catch(() => { });
            await refreshSession();
            return { ok: true, user: session };
        } catch (e) {
            return { ok: false, error: errText(e) };
        }
    }

    async function changePassword(oldPassword, newPassword) {
        if (!auth || !auth.currentUser) return { ok: false, error: 'Oturum bulunamadı.' };
        if (!oldPassword || !newPassword) return { ok: false, error: 'Lütfen tüm alanları doldurun.' };
        if (newPassword.length < 6) return { ok: false, error: 'Yeni şifre en az 6 karakter olmalıdır.' };
        const user = auth.currentUser;
        try {
            const cred = firebase.auth.EmailAuthProvider.credential(user.email, oldPassword);
            await user.reauthenticateWithCredential(cred);
            await user.updatePassword(newPassword);
            return { ok: true };
        } catch (e) {
            if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                return { ok: false, error: 'Mevcut şifreniz hatalı.' };
            }
            return { ok: false, error: errText(e) };
        }
    }

    async function refreshSession() {
        if (auth && auth.currentUser) {
            await auth.currentUser.reload().catch(() => { });
            const role = session && session.uid === auth.currentUser.uid ? session.role : 'user';
            session = buildSession(auth.currentUser, role);
        }
        return session;
    }

    function continueAsGuest() {
        setGuestFlag(true);
        session = guestSession();
        return session;
    }

    async function signOut() {
        await SyncManager.flush().catch(() => { });
        setGuestFlag(false);
        if (auth) { try { await auth.signOut(); } catch (e) { console.warn(e); } }
        session = null;
    }

    function progressKey(langCode) {
        const base = PROGRESS_BASE_KEYS[langCode] || PROGRESS_BASE_KEYS.en;
        return session && !session.guest && session.uid ? `${base}_${session.uid}` : base;
    }

    return {
        ready,
        init,
        isConfigured: () => configured,
        getSession: () => session,
        isLoggedIn: () => session !== null,
        onChange: fn => changeListeners.push(fn),
        getDb: () => db,
        signUp, signIn, signInWithGoogle, sendPasswordReset,
        updateProfile: updateProfileName,
        changePassword, continueAsGuest, signOut, progressKey
    };
})();

/* ============================================================
   İLERLEME SENKRONU — users/{uid}/progress/{lang}  {json, updatedAt}
============================================================ */
const SyncManager = (() => {
    const timers = {};
    const TS_PREFIX = 'lumina_ts_';
    let pending = new Set();

    function docRef(uid, lang) {
        const db = AuthManager.getDb();
        return db ? db.collection('users').doc(uid).collection('progress').doc(lang) : null;
    }
    function currentSession() {
        const s = AuthManager.getSession();
        return s && !s.guest && s.uid ? s : null;
    }
    function getTs(key) { try { return Number(localStorage.getItem(TS_PREFIX + key)) || 0; } catch { return 0; } }

    async function push(lang) {
        const s = currentSession();
        const ref = s && docRef(s.uid, lang);
        if (!ref) return;
        const key = AuthManager.progressKey(lang);
        const json = localStorage.getItem(key);
        if (!json) return;
        await ref.set({ json, updatedAt: getTs(key) || Date.now() });
        pending.delete(lang);
    }

    function schedulePush(lang) {
        if (!currentSession()) return;
        pending.add(lang);
        clearTimeout(timers[lang]);
        timers[lang] = setTimeout(() => push(lang).catch(e => console.warn('İlerleme yedeklenemedi:', e.code || e.message)), 1500);
    }

    async function flush() {
        const langs = [...pending];
        pending = new Set();
        langs.forEach(l => clearTimeout(timers[l]));
        await Promise.all(langs.map(l => push(l).catch(() => { })));
    }

    async function remove(lang) {
        const s = currentSession();
        const ref = s && docRef(s.uid, lang);
        if (ref) { try { await ref.delete(); } catch (e) { console.warn(e.code || e.message); } }
    }

    // Girişten sonra: sunucudaki ile yereli karşılaştır, yeni olan kazanır
    async function pullAll(session) {
        if (!session || session.guest) return;
        let changedLocal = false;
        for (const lang of Object.keys(PROGRESS_BASE_KEYS)) {
            const ref = docRef(session.uid, lang);
            if (!ref) return;
            const key = `${PROGRESS_BASE_KEYS[lang]}_${session.uid}`;
            const localJson = localStorage.getItem(key);
            const localTs = getTs(key);
            const snap = await ref.get();
            if (snap.exists) {
                const remote = snap.data();
                if (!localJson || (remote.updatedAt || 0) > localTs) {
                    try { JSON.parse(remote.json); } catch { continue; }
                    localStorage.setItem(key, remote.json);
                    localStorage.setItem(TS_PREFIX + key, String(remote.updatedAt || Date.now()));
                    changedLocal = true;
                } else if (localTs > (remote.updatedAt || 0)) {
                    schedulePush(lang);
                }
            } else if (localJson) {
                if (!localTs) localStorage.setItem(TS_PREFIX + key, String(Date.now()));
                schedulePush(lang);
            }
        }
        if (changedLocal && document.getElementById('dashboard')?.classList.contains('active')
            && typeof renderDashboard === 'function') {
            renderDashboard();
        }
    }

    window.addEventListener('pagehide', () => { flush(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

    return { schedulePush, flush, remove, pullAll, touch: key => { try { localStorage.setItem(TS_PREFIX + key, String(Date.now())); } catch { } } };
})();

/* ============================================================
   AUTH ARAYÜZ FONKSİYONLARI
============================================================ */
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

function authShowMsg(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
}

async function authSignIn() {
    const email = document.getElementById('siEmail').value;
    const password = document.getElementById('siPassword').value;
    document.getElementById('siError').classList.add('hidden');

    if (!email || !password) { authShowMsg('siError', '⚠️ Lütfen tüm alanları doldurun.'); return; }

    authSetLoading('btnSignIn', true);
    const result = await AuthManager.signIn(email, password);
    authSetLoading('btnSignIn', false);
    if (result.ok) authGoToDashboard(result.user);
    else authShowMsg('siError', '⚠️ ' + result.error);
}

async function authSignUp() {
    const name = document.getElementById('suName').value;
    const email = document.getElementById('suEmail').value;
    const password = document.getElementById('suPassword').value;

    document.getElementById('suError').classList.add('hidden');
    document.getElementById('suSuccess').classList.add('hidden');

    if (!email || !password) { authShowMsg('suError', '⚠️ E-posta ve şifre zorunludur.'); return; }

    authSetLoading('btnSignUp', true);
    const result = await AuthManager.signUp(email, password, name);
    authSetLoading('btnSignUp', false);
    if (result.ok) {
        authShowMsg('suSuccess', '✅ Hesabınız oluşturuldu! Doğrulama e-postası gönderildi. Giriş yapılıyor…');
        setTimeout(() => authGoToDashboard(result.user), 900);
    } else {
        authShowMsg('suError', '⚠️ ' + result.error);
    }
}

async function authForgotPassword() {
    const email = document.getElementById('fpEmail').value;
    document.getElementById('fpError').classList.add('hidden');
    document.getElementById('fpSuccess').classList.add('hidden');

    authSetLoading('btnForgot', true);
    const result = await AuthManager.sendPasswordReset(email);
    authSetLoading('btnForgot', false);
    if (result.ok) authShowMsg('fpSuccess', result.message);
    else authShowMsg('fpError', '⚠️ ' + result.error);
}

async function googleSignIn() {
    const result = await AuthManager.signInWithGoogle();
    if (result.ok) authGoToDashboard(result.user);
    else if (!result.silent) authShowMsg('siError', '⚠️ ' + result.error);
}

function authGuest() {
    const s = AuthManager.continueAsGuest();
    authGoToDashboard(s);
}

function authToggleEye(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = typeof btnId === 'string' ? document.getElementById(btnId) : btnId;
    if (!input) return;
    if (input.type === 'password') { input.type = 'text'; if (btn) btn.textContent = '🙈'; }
    else { input.type = 'password'; if (btn) btn.textContent = '👁'; }
}

function authGoToDashboard(user) {
    updateUserUI(user);
    const topBar = document.getElementById('globalTopBar');
    if (topBar) topBar.classList.remove('hidden');
    NotificationManager.addNotification('Hoş Geldiniz', `${user.name || user.email} ile oturum açıldı.`, '👋');
    showScreen('languageScreen');
}

document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    const activePanel = document.querySelector('.auth-panel.active');
    if (!activePanel || !document.getElementById('authScreen')?.classList.contains('active')) return;
    if (activePanel.id === 'panelSignIn') { authSignIn(); e.preventDefault(); }
    if (activePanel.id === 'panelSignUp') { authSignUp(); e.preventDefault(); }
    if (activePanel.id === 'panelForgot') { authForgotPassword(); e.preventDefault(); }
});

// ── Profil / şifre modalları ──
async function saveProfileChanges() {
    const errEl = document.getElementById('maError');
    const succEl = document.getElementById('maSuccess');
    errEl.classList.add('hidden');
    succEl.classList.add('hidden');

    const result = await AuthManager.updateProfile(document.getElementById('maNameInput').value);
    if (result.ok) {
        updateUserUI(result.user);
        NotificationManager.addNotification('Profil Güncellendi', 'İsminiz başarıyla güncellendi.', '✏️');
        succEl.textContent = '✅ Profil bilgileriniz kaydedildi!';
        succEl.classList.remove('hidden');
        setTimeout(() => closeModal('manageAccountModal'), 1000);
    } else {
        errEl.textContent = '⚠️ ' + result.error;
        errEl.classList.remove('hidden');
    }
}

async function savePasswordChanges() {
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
    const result = await AuthManager.changePassword(oldPass, newPass);
    if (result.ok) {
        NotificationManager.addNotification('Şifre Değiştirildi', 'Şifreniz başarıyla güncellendi.', '🔑');
        succEl.textContent = '✅ Şifreniz başarıyla değiştirildi!';
        succEl.classList.remove('hidden');
        setTimeout(() => closeModal('changePasswordModal'), 1000);
    } else {
        errEl.textContent = '⚠️ ' + result.error;
        errEl.classList.remove('hidden');
    }
}

function resetToAuthScreen() {
    if (typeof TypingRace !== 'undefined') TypingRace.cleanup();
    if (typeof QuickQuiz !== 'undefined') QuickQuiz.cleanup();
    if (typeof SpeedMatch !== 'undefined') SpeedMatch.cleanup();

    document.body.classList.remove('google-user');
    document.getElementById('globalTopBar')?.classList.add('hidden');
    document.getElementById('userDropdownMenu')?.classList.add('hidden');
    document.querySelector('.user-dropdown-wrapper')?.classList.remove('active');
    document.getElementById('notifPopover')?.classList.add('hidden');

    ['siEmail', 'siPassword', 'suEmail', 'suPassword', 'suName', 'fpEmail'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    authShowPanel('signin');
    showScreen('authScreen');
}

window.authSignOut = function () { openModal('logoutConfirmModal'); };

window.executeSignOut = async function () {
    closeModal('logoutConfirmModal');
    await AuthManager.signOut();
    resetToAuthScreen();
};

// Başka sekmede çıkış yapılırsa bu sekmeyi de çıkışa al
AuthManager.onChange(s => {
    if (!s) resetToAuthScreen();
    else if (typeof updateUserUI === 'function') updateUserUI(s);
});

AuthManager.init();
