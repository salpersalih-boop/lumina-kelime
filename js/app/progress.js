/* ============================================================
   LUMINA — İLERLEME
   Aktif dil yardımcıları ve localStorage ilerleme kaydı (senkron: auth.js → SyncManager)
============================================================ */

// ── DYNAMIC HELPERS ──
function activeTotalGroups() {
    const lang = LANGUAGE_BY_CODE[state.lang];
    return groupCounts[state.lang] || (lang && lang.defaultGroups) || 1;
}

function activeLSKey() {
    // Kullanıcıya özel anahtar: lumina_progress_<dil>_<uid> (misafir: kullanıcısız anahtar)
    return AuthManager.progressKey(state.lang);
}

function activeGroupName(i) {
    const lang = LANGUAGE_BY_CODE[state.lang];
    return `${(lang && lang.groupLabel) || 'Grup'} ${i}`;
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
        p[`group${i}`] = { known: [], errors: [], unsure: [], testErrors: [], writeErrors: [] };
    }
    return p;
}

function saveProgress(progress) {
    const key = activeLSKey();
    localStorage.setItem(key, JSON.stringify(progress));
    SyncManager.touch(key);
    SyncManager.schedulePush(state.lang);
}

function resetActiveProgress() {
    const key = activeLSKey();
    localStorage.removeItem(key);
    localStorage.removeItem('lumina_ts_' + key);
    SyncManager.remove(state.lang);
}

function getGroupProgress(progress, groupNum) {
    const key = `group${groupNum}`;
    if (!progress[key]) progress[key] = { known: [], errors: [], unsure: [], testErrors: [], writeErrors: [] };
    if (!progress[key].unsure) progress[key].unsure = [];
    if (!progress[key].errors) progress[key].errors = [];
    if (!progress[key].known) progress[key].known = [];
    if (!progress[key].testErrors) progress[key].testErrors = [];
    if (!progress[key].writeErrors) progress[key].writeErrors = [];
    return progress[key];
}
