/* ============================================================
   LUMINA — KELİME ÇALIŞMA
   Grup ekranı, kart oturumu, oturum sonu
============================================================ */

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

    const cntTestErrors = (gp.testErrors || []).length;
    const cntWriteErrors = (gp.writeErrors || []).length;

    const groupVerbs = words.filter(w => verbsLabData.some(vd => vd && vd.v1 === w.en));
    const cntLabGroup = groupVerbs.length;

    document.getElementById('countNew').textContent = cntNew;
    document.getElementById('countErrors').textContent = cntErrors;
    document.getElementById('countKnown').textContent = cntKnown;
    if (document.getElementById('countUnsure')) document.getElementById('countUnsure').textContent = cntUnsure;
    if (document.getElementById('countTestErrors')) document.getElementById('countTestErrors').textContent = cntTestErrors;
    if (document.getElementById('countWriteErrors')) document.getElementById('countWriteErrors').textContent = cntWriteErrors;
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
    if (document.getElementById('modeTestErrors')) document.getElementById('modeTestErrors').disabled = false;
    if (document.getElementById('modeWriteErrors')) document.getElementById('modeWriteErrors').disabled = false;

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
    } else if (state.currentMode === 'weeklyReview') {
        if (type === 'correct') state.sessionCorrect++;
        else if (type === 'wrong') state.sessionWrong++;
        else state.sessionUnsure++;

        const progress = loadProgress();
        if (!progress.timeLogs) progress.timeLogs = [];
        const todayStart = new Date().setHours(0, 0, 0, 0);
        progress.timeLogs = progress.timeLogs.filter(
            l => !(l.en === word.en && l.ts >= todayStart)
        );
        progress.timeLogs.push({ en: word.en, tr: word.tr, ts: Date.now(), type: type });
        saveProgress(progress);
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
