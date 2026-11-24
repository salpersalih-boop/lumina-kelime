/* ============================================================
   LUMINA — FİİL LAB, EŞLEŞTİRME, SANDBOX
   Fiil laboratuvarı, serbest çalışma, sesli okuma
============================================================ */

// ── VERBS LAB MODULE ──
function renderLab() {
    state.currentMode = 'lab-global';
    document.getElementById('labTitle').textContent = `🧪 Kelime Laboratuvarı`;
    document.getElementById('btnBackLab').innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Dashboard`;

    const grid = document.getElementById('labGrid');
    grid.innerHTML = verbsLabData.map(v => `
        <div class="verb-card">
            <div class="verb-row"><span class="v-tag">V1</span><span class="v-word">${escapeHtml(v.v1)}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v1}')">🔊</button></div>
            <div class="verb-row"><span class="v-tag">V2</span><span class="v-word">${escapeHtml(v.v2)}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v2}')">🔊</button></div>
            <div class="verb-row"><span class="v-tag">V3</span><span class="v-word">${escapeHtml(v.v3)}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v3}')">🔊</button></div>
            <div class="v-tr">${escapeHtml(v.tr)}</div>
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
                <div class="verb-row"><span class="v-tag">V1</span><span class="v-word">${escapeHtml(v.v1)}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v1}')">🔊</button></div>
                <div class="verb-row"><span class="v-tag">V2</span><span class="v-word">${escapeHtml(v.v2)}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v2}')">🔊</button></div>
                <div class="verb-row"><span class="v-tag">V3</span><span class="v-word">${escapeHtml(v.v3)}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v3}')">🔊</button></div>
                <div class="v-tr">${escapeHtml(v.tr)}</div>
            </div>
        `).join('');
    }
    showScreen('labScreen');
}

// Eşleştirme oyunu: js/app/match.js

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
function playAudio(text, lang) {
    if (!window.speechSynthesis || !text) return;
    const targetLang = lang || (LANGUAGE_BY_CODE[state.lang] || LANGUAGE_BY_CODE.en).tts;
    const safeText = text.toString().replace(/\s*\([^)]*\)/g, '').replace(/\//g, ' or ');   // (okunuş) kısmı okunmaz

    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(safeText);
        utterance.lang = targetLang;
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.warn('Ses okuma hatası:', e);
    }
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
