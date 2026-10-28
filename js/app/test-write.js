/* ============================================================
   LUMINA — TEST VE YAZMA MODLARI
   Test merkezi, yazma merkezi, özel tekrar
============================================================ */

// ── TEST HUB ──
let testSourceMode = 'known'; // 'known' veya 'all'
let writeSourceMode = 'known'; // 'known' veya 'all'

function openTestHub() {
    const p = loadProgress();
    const gp = getGroupProgress(p, state.currentGroup);
    const wordsInGroup = activeWords()[`group${state.currentGroup}`] || [];

    // Başlık
    document.getElementById('testHubTitle').textContent = `📝 Test Merkezi — ${activeGroupName(state.currentGroup)}`;

    // sayaçlar
    const testErrCount = (gp.testErrors || []).length;
    const knownCount = (gp.known || []).length;
    const allCount = wordsInGroup.length;
    document.getElementById('hubCountTestErrors').textContent = testErrCount;
    document.getElementById('hubCountTestKnown').textContent = knownCount;

    // Kaynak seçim sayıçlarını güncelle
    document.getElementById('hubCountTest').textContent = `${knownCount} kelime`;
    document.getElementById('hubCountTestAll').textContent = `${allCount} kelime`;

    // Seçim durumunu yansıt
    _updateTestSourceUI();

    // Test başlatma butonunu devre dışı bırak eğer yetersiz kelime varsa
    _updateTestHubButtons();

    // Hata butonu devre dışı bırak eğer hata yoksa
    const errBtn = document.getElementById('hubBtnTestErrors');
    if (errBtn) errBtn.disabled = testErrCount === 0;

    // Panelleri gizle
    document.getElementById('testHubErrorsPanel').classList.add('hidden');
    document.getElementById('testHubKnownPanel').classList.add('hidden');

    showScreen('testHubScreen');
}

function _updateTestSourceUI() {
    const knownBtn = document.getElementById('testSourceKnown');
    const allBtn = document.getElementById('testSourceAll');
    if (!knownBtn || !allBtn) return;
    if (testSourceMode === 'known') {
        knownBtn.classList.add('active');
        allBtn.classList.remove('active');
    } else {
        allBtn.classList.add('active');
        knownBtn.classList.remove('active');
    }
    _updateTestHubButtons();
}

function _updateTestHubButtons() {
    const p = loadProgress();
    const gp = getGroupProgress(p, state.currentGroup);
    const wordsInGroup = activeWords()[`group${state.currentGroup}`] || [];
    const knownCount = (gp.known || []).length;
    const allCount = wordsInGroup.length;

    const useAll = testSourceMode === 'all';
    const activeCount = useAll ? allCount : knownCount;

    const testBtn = document.getElementById('hubBtnTest');
    const repeatBtn = document.getElementById('hubBtnTestRepeat');
    if (testBtn) {
        testBtn.disabled = activeCount < 4;
    }
    if (repeatBtn) {
        repeatBtn.disabled = knownCount < 4;
    }
}

function _updateWriteSourceUI() {
    const knownBtn = document.getElementById('writeSourceKnown');
    const allBtn = document.getElementById('writeSourceAll');
    if (!knownBtn || !allBtn) return;
    if (writeSourceMode === 'known') {
        knownBtn.classList.add('active');
        allBtn.classList.remove('active');
    } else {
        allBtn.classList.add('active');
        knownBtn.classList.remove('active');
    }
    _updateWriteHubButtons();
}

function _updateWriteHubButtons() {
    const p = loadProgress();
    const gp = getGroupProgress(p, state.currentGroup);
    const wordsInGroup = activeWords()[`group${state.currentGroup}`] || [];
    const knownCount = (gp.known || []).length;
    const allCount = wordsInGroup.length;

    const useAll = writeSourceMode === 'all';
    const activeCount = useAll ? allCount : knownCount;

    const writeBtn = document.getElementById('hubBtnWrite');
    const repeatBtn = document.getElementById('hubBtnWriteRepeat');
    if (writeBtn) {
        writeBtn.disabled = activeCount === 0;
    }
    if (repeatBtn) {
        repeatBtn.disabled = knownCount === 0;
    }
}

function renderTestHubErrors() {
    const p = loadProgress();
    const gp = getGroupProgress(p, state.currentGroup);
    const wordsInGroup = activeWords()[`group${state.currentGroup}`] || [];
    const listEl = document.getElementById('testHubErrorsList');

    // Diğer paneli kapat
    document.getElementById('testHubKnownPanel').classList.add('hidden');

    if (!gp.testErrors || gp.testErrors.length === 0) {
        listEl.innerHTML = '<div class="hub-empty">Henüz test hatanız bulunmuyor.</div>';
    } else {
        listEl.innerHTML = gp.testErrors.map(errItem => {
            let sentence, tr, en;
            if (typeof errItem === 'object') {
                tr = errItem.tr || '-';
                en = errItem.en || '-';
                sentence = errItem.sentence || getTestSentence(en);
                const userAns = errItem.userAns || '-';
                return `<div class="hub-list-item">
                    <div class="item-left">
                        <div class="item-tr">${escapeHtml(sentence)}</div>
                        <div class="item-wrong">Senin cevabın: <strong>${escapeHtml(userAns)}</strong></div>
                    </div>
                    <div class="item-right">
                        <div class="item-label">Doğru Cevap</div>
                        <div class="item-correct">${escapeHtml(en)}</div>
                    </div>
                </div>`;
            } else {
                const wObj = wordsInGroup.find(w => w.id === errItem);
                if (!wObj) return '';
                sentence = getTestSentence(wObj.en);
                return `<div class="hub-list-item">
                    <div class="item-left">
                        <div class="item-tr">${escapeHtml(sentence)}</div>
                        <div class="item-wrong">İpucu: ${escapeHtml(wObj.tr)}</div>
                    </div>
                    <div class="item-right">
                        <div class="item-label">Doğru Cevap</div>
                        <div class="item-correct">${escapeHtml(wObj.en)}</div>
                    </div>
                </div>`;
            }
        }).join('');
    }

    document.getElementById('testHubErrorsPanel').classList.remove('hidden');
}

function renderTestHubKnown() {
    const p = loadProgress();
    const gp = getGroupProgress(p, state.currentGroup);
    const wordsInGroup = activeWords()[`group${state.currentGroup}`] || [];
    const listEl = document.getElementById('testHubKnownList');

    // Diğer paneli kapat
    document.getElementById('testHubErrorsPanel').classList.add('hidden');

    if (!gp.known || gp.known.length === 0) {
        listEl.innerHTML = '<div class="hub-empty">Henüz bilinen kelime bulunmuyor.</div>';
    } else {
        listEl.innerHTML = gp.known.map(wordId => {
            const wObj = wordsInGroup.find(w => w.id === wordId);
            if (!wObj) return '';
            return `<div class="hub-list-item">
                <div class="item-left">
                    <div class="item-word">${escapeHtml(wObj.en)}</div>
                    <div class="item-wrong" style="color:var(--text-muted);">${escapeHtml(wObj.tr)}</div>
                </div>
                <div class="item-check">✓</div>
            </div>`;
        }).join('');
    }

    document.getElementById('testHubKnownPanel').classList.remove('hidden');
}

// ── WRITE HUB ──
function openWriteHub() {
    const p = loadProgress();
    const gp = getGroupProgress(p, state.currentGroup);
    const wordsInGroup = activeWords()[`group${state.currentGroup}`] || [];

    // Başlık
    document.getElementById('writeHubTitle').textContent = `✍️ Yazı Merkezi — ${activeGroupName(state.currentGroup)}`;

    // sayaçlar
    const writeErrCount = (gp.writeErrors || []).length;
    const knownCount = (gp.known || []).length;
    const allCount = wordsInGroup.length;
    document.getElementById('hubCountWriteErrors').textContent = writeErrCount;
    document.getElementById('hubCountWriteKnown').textContent = knownCount;

    // Kaynak seçim sayıçlarını güncelle
    document.getElementById('hubCountWrite').textContent = `${knownCount} kelime`;
    const writeBtn = document.getElementById('hubBtnWrite');
    if (writeBtn) writeBtn.disabled = knownCount === 0;

    // Hata butonu devre dışı bırak eğer hata yoksa
    const errBtn = document.getElementById('hubBtnWriteErrors');
    if (errBtn) errBtn.disabled = writeErrCount === 0;

    // Panelleri gizle
    document.getElementById('writeHubErrorsPanel').classList.add('hidden');
    document.getElementById('writeHubKnownPanel').classList.add('hidden');

    showScreen('writeHubScreen');
}

function renderWriteHubErrors() {
    const p = loadProgress();
    const gp = getGroupProgress(p, state.currentGroup);
    const wordsInGroup = activeWords()[`group${state.currentGroup}`] || [];
    const listEl = document.getElementById('writeHubErrorsList');

    // Diğer paneli kapat
    document.getElementById('writeHubKnownPanel').classList.add('hidden');

    if (!gp.writeErrors || gp.writeErrors.length === 0) {
        listEl.innerHTML = '<div class="hub-empty">Henüz yazı hatanız bulunmuyor.</div>';
    } else {
        listEl.innerHTML = gp.writeErrors.map(errItem => {
            let tr, en, userAns;
            if (typeof errItem === 'object') {
                tr = errItem.tr || '-';
                en = errItem.en || '-';
                userAns = errItem.userAns || '-';
            } else {
                const wObj = wordsInGroup.find(w => w.id === errItem);
                tr = wObj ? wObj.tr : '-';
                en = wObj ? wObj.en : '-';
                userAns = '-';
            }
            return `<div class="hub-list-item">
                <div class="item-left">
                    <div class="item-tr">Türkçe: <strong>${escapeHtml(tr)}</strong></div>
                    <div class="item-wrong">Senin cevabın: <strong>${escapeHtml(userAns)}</strong></div>
                </div>
                <div class="item-right">
                    <div class="item-label">Doğru Cevap</div>
                    <div class="item-correct">${escapeHtml(en)}</div>
                </div>
            </div>`;
        }).join('');
    }

    document.getElementById('writeHubErrorsPanel').classList.remove('hidden');
}

function renderWriteHubKnown() {
    const p = loadProgress();
    const gp = getGroupProgress(p, state.currentGroup);
    const wordsInGroup = activeWords()[`group${state.currentGroup}`] || [];
    const listEl = document.getElementById('writeHubKnownList');

    // Diğer paneli kapat
    document.getElementById('writeHubErrorsPanel').classList.add('hidden');

    if (!gp.known || gp.known.length === 0) {
        listEl.innerHTML = '<div class="hub-empty">Henüz bilinen kelime bulunmuyor.</div>';
    } else {
        listEl.innerHTML = gp.known.map(wordId => {
            const wObj = wordsInGroup.find(w => w.id === wordId);
            if (!wObj) return '';
            return `<div class="hub-list-item">
                <div class="item-left">
                    <div class="item-word">${escapeHtml(wObj.en)}</div>
                    <div class="item-wrong" style="color:var(--text-muted);">${escapeHtml(wObj.tr)}</div>
                </div>
                <div class="item-check">✓</div>
            </div>`;
        }).join('');
    }

    document.getElementById('writeHubKnownPanel').classList.remove('hidden');
}


const TEST_SENTENCE_BANK = {
    'schule': 'Ich gehe zur ______.',
    'haus': 'Das ist mein neues ______.',
    'wasser': 'Ich trinke jeden Tag ______.',
    'buch': 'Ich lese ein gutes ______.',
    'school': 'I am going to ______.',
    'house': 'This is my new ______.',
    'water': 'I drink ______ every day.',
    'book': 'I am reading a good ______.'
};

function getTestSentence(wordStr) {
    const w = wordStr.toLowerCase();
    if (TEST_SENTENCE_BANK[w]) {
        return TEST_SENTENCE_BANK[w];
    }
    // Fallback if we don't have a sentence for this word
    return `Lütfen şu kelimenin doğru karşılığını seçiniz: ______`;
}

function startTestMode(isErrorMode = false, useAllWords = false) {
    const p = loadProgress();
    const gp = getGroupProgress(p, state.currentGroup);
    const wordsInGroup = activeWords()[`group${state.currentGroup}`] || [];
    
    let pool = [];
    if (isErrorMode) {
        if (gp.testErrors && gp.testErrors.length > 0) {
            // testErrors may contain rich objects {id, tr, en, ...} or plain IDs
            pool = gp.testErrors.map(e => typeof e === 'object' ? e.id : e);
        }
    } else if (useAllWords) {
        // Bütün kelimeler - testSourceMode'a göre
        pool = wordsInGroup.map(w => w.id);
    } else {
        // Bildiklerimden
        if (gp.known && gp.known.length > 0) {
            pool = [...gp.known];
        }
    }
    
    if (pool.length < 4 && !isErrorMode) {
        alert("Test modunu başlatmak için bu grupta en az 4 kelime gereklidir.");
        return;
    } else if (pool.length === 0 && isErrorMode) {
        alert("Test modunda tekrar edilecek hatanız bulunmuyor.");
        return;
    }
    
    state.testQueue = pool.sort(() => Math.random() - 0.5);
    state.testIndex = 0;
    state.testCorrect = 0;
    state.testWrong = 0;
    
    document.getElementById('testGroupTitle').textContent = activeGroupName(state.currentGroup);
    document.getElementById('testSessionComplete').classList.add('hidden');
    
    showScreen('testScreen');
    showNextTestQuestion();
}

function showNextTestQuestion() {
    if (state.testIndex >= state.testQueue.length) {
        endTestSession();
        return;
    }
    
    const wordId = state.testQueue[state.testIndex];
    const wordsInGroup = activeWords()[`group${state.currentGroup}`];
    const targetWordObj = wordsInGroup.find(w => w.id === wordId);
    
    const sentence = getTestSentence(targetWordObj.en.trim());
    document.getElementById('testSentence').textContent = sentence;
    document.getElementById('testTrHint').textContent = `(İpucu: ${targetWordObj.tr})`;
    
    // Generate 3 random wrong options from the known pool
    let options = [targetWordObj];
    let knownPool = state.testQueue.filter(id => id !== wordId);
    knownPool = knownPool.sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < 3 && i < knownPool.length; i++) {
        options.push(wordsInGroup.find(w => w.id === knownPool[i]));
    }
    
    // Shuffle options
    options = options.sort(() => Math.random() - 0.5);
    
    const optionsContainer = document.getElementById('testOptions');
    optionsContainer.innerHTML = '';
    
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'btn-primary';
        btn.style.padding = '16px';
        btn.style.fontSize = '1.1rem';
        btn.style.borderRadius = 'var(--radius-sm)';
        btn.style.background = 'var(--bg-card)';
        btn.style.border = '1px solid var(--border)';
        btn.style.color = 'var(--text-primary)';
        btn.textContent = opt.en;
        
        btn.onclick = () => checkTestAnswer(opt.id, targetWordObj.id, btn);
        optionsContainer.appendChild(btn);
    });
    
    const pct = Math.round((state.testIndex / state.testQueue.length) * 100);
    document.getElementById('testProgressFill').style.width = pct + '%';
    document.getElementById('testProgressText').textContent = `${state.testIndex} / ${state.testQueue.length}`;
}

function checkTestAnswer(selectedId, targetId, btn) {
    // Disable all buttons to prevent multiple clicks
    const allBtns = document.getElementById('testOptions').querySelectorAll('button');
    allBtns.forEach(b => b.disabled = true);
    
    const p = loadProgress();
    const gp = getGroupProgress(p, state.currentGroup);
    
    if (selectedId === targetId) {
        state.testCorrect++;
        btn.style.background = 'rgba(78, 232, 160, 0.2)';
        btn.style.borderColor = 'var(--accent-ok)';
        
        gp.testErrors = (gp.testErrors || []).filter(e => (typeof e === 'object' ? e.id : e) !== targetId);
    } else {
        state.testWrong++;
        btn.style.background = 'rgba(245, 124, 110, 0.2)';
        btn.style.borderColor = 'var(--accent-3)';
        
    // Highlight correct answer
        allBtns.forEach(b => {
            const wordObj = activeWords()[`group${state.currentGroup}`].find(w => w.id === targetId);
            if (b.textContent === wordObj.en) {
                b.style.background = 'rgba(78, 232, 160, 0.2)';
                b.style.borderColor = 'var(--accent-ok)';
            }
        });
        
        // Yanlış soruyu en sona ekle
        state.testQueue.push(targetId);
        
        // Hata kaydını zengin obje olarak kaydet
        const wordsInGroup = activeWords()[`group${state.currentGroup}`];
        const targetWordObj = wordsInGroup.find(w => w.id === targetId);
        const selectedWordObj = wordsInGroup.find(w => w.id === selectedId);
        const sentence = getTestSentence(targetWordObj ? targetWordObj.en : '');
        const errObj = {
            id: targetId,
            tr: targetWordObj ? targetWordObj.tr : '-',
            en: targetWordObj ? targetWordObj.en : '-',
            sentence: sentence,
            userAns: selectedWordObj ? selectedWordObj.en : '?'
        };
        if (!gp.testErrors) gp.testErrors = [];
        const existIdx = gp.testErrors.findIndex(e => (typeof e === 'object' ? e.id : e) === targetId);
        if (existIdx >= 0) {
            gp.testErrors[existIdx] = errObj;
        } else {
            gp.testErrors.push(errObj);
        }
    }
    
    saveProgress(p);
    state.testIndex++;
    
    setTimeout(() => {
        showNextTestQuestion();
    }, 1500);
}

function endTestSession() {
    document.getElementById('testProgressFill').style.width = '100%';
    document.getElementById('testProgressText').textContent = `${state.testQueue.length} / ${state.testQueue.length}`;
    
    const statsEl = document.getElementById('testCompleteStats');
    statsEl.innerHTML = `
        <div class="stat-item"><span class="val">${state.testCorrect}</span><span class="lbl">Doğru</span></div>
        <div class="stat-item"><span class="val">${state.testWrong}</span><span class="lbl">Yanlış</span></div>
    `;
    
    document.getElementById('testSessionComplete').classList.remove('hidden');
}

// Event Listeners for Test Mode
document.getElementById('btnRestartTest')?.addEventListener('click', () => startTestMode());
document.getElementById('btnBackTest')?.addEventListener('click', () => showScreen('testHubScreen'));
document.getElementById('btnBackToGroupTest')?.addEventListener('click', () => showScreen('testHubScreen'));

function startWriteMode(isErrorMode = false, useAllWords = false) {
    const p = loadProgress();
    const gp = getGroupProgress(p, state.currentGroup);
    const wordsInGroup = activeWords()[`group${state.currentGroup}`] || [];
    
    // Yelnızca bilinen kelimelerden oluşturulacak veya hatalardan
    let pool = [];
    if (isErrorMode) {
        if (gp.writeErrors && gp.writeErrors.length > 0) {
            pool = gp.writeErrors.map(e => typeof e === 'object' ? e.id : e);
        }
    } else if (useAllWords) {
        pool = wordsInGroup.map(w => w.id);
    } else {
        if (gp.known && gp.known.length > 0) {
            pool = [...gp.known];
        }
    }
    
    if (pool.length === 0) {
        if (isErrorMode) alert("Yazı modunda tekrar edilecek hatanız bulunmuyor.");
        else alert("Bu grupta yazı pratiği yapacak kadar bilinen kelime yok. Önce biraz kelime öğrenin.");
        return;
    }
    
    state.writeQueue = pool.sort(() => Math.random() - 0.5);
    state.writeIndex = 0;
    state.writeCorrect = 0;
    state.writeWrong = 0;
    
    document.getElementById('writeGroupTitle').textContent = activeGroupName(state.currentGroup);
    document.getElementById('writeSessionComplete').classList.add('hidden');
    document.getElementById('writeInput').value = '';
    document.getElementById('writeFeedback').textContent = '';
    
    showScreen('writeScreen');
    showNextWriteWord();
}

function showNextWriteWord() {
    if (state.writeIndex >= state.writeQueue.length) {
        endWriteSession();
        return;
    }
    
    const wordId = state.writeQueue[state.writeIndex];
    const wordObj = activeWords()[`group${state.currentGroup}`].find(w => w.id === wordId);
    
    document.getElementById('writeWordTr').textContent = wordObj.tr;
    document.getElementById('writeInput').value = '';
    document.getElementById('writeInput').focus();
    document.getElementById('writeFeedback').textContent = '';
    
    const pct = Math.round((state.writeIndex / state.writeQueue.length) * 100);
    document.getElementById('writeProgressFill').style.width = pct + '%';
    document.getElementById('writeProgressText').textContent = `${state.writeIndex} / ${state.writeQueue.length}`;
}

function checkWriteAnswer() {
    if (state.writeIndex >= state.writeQueue.length) return;
    
    const wordId = state.writeQueue[state.writeIndex];
    const wordObj = activeWords()[`group${state.currentGroup}`].find(w => w.id === wordId);
    const userInput = document.getElementById('writeInput').value.trim().toLowerCase();
    const correctAnswer = wordObj.en.trim().toLowerCase();
    const feedbackEl = document.getElementById('writeFeedback');
    
    const p = loadProgress();
    const gp = getGroupProgress(p, state.currentGroup);
    
    if (userInput === correctAnswer) {
        state.writeCorrect++;
        feedbackEl.style.color = "var(--accent-ok)";
        feedbackEl.textContent = "✅ Doğru!";
        
        // Hatalar arasından çıkar
        gp.writeErrors = (gp.writeErrors || []).filter(e => (typeof e === 'object' ? e.id : e) !== wordId);
    } else {
        state.writeWrong++;
        feedbackEl.style.color = "var(--accent-3)";
        feedbackEl.textContent = `❌ Yanlış! Doğrusu: ${wordObj.en}`;
        
        // Yanlış cevabı bu test oturumunun sonuna ekle ki bitmeden sorulsun
        state.writeQueue.push(wordId);

        // Hatayı detaylı kaydet
        if (!gp.writeErrors) gp.writeErrors = [];
        const existingIdx = gp.writeErrors.findIndex(e => (typeof e === 'object' ? e.id : e) === wordId);
        const errObj = { id: wordId, tr: wordObj.tr, en: wordObj.en, userAns: userInput || '-' };
        if (existingIdx >= 0) {
            gp.writeErrors[existingIdx] = errObj;
        } else {
            gp.writeErrors.push(errObj);
        }
    }
    
    saveProgress(p);
    state.writeIndex++;
    
    setTimeout(() => {
        showNextWriteWord();
    }, 1500);
}

function endWriteSession() {
    document.getElementById('writeProgressFill').style.width = '100%';
    document.getElementById('writeProgressText').textContent = `${state.writeQueue.length} / ${state.writeQueue.length}`;
    
    const statsEl = document.getElementById('writeCompleteStats');
    statsEl.innerHTML = `
        <div class="stat-item"><span class="val">${state.writeCorrect}</span><span class="lbl">Doğru</span></div>
        <div class="stat-item"><span class="val">${state.writeWrong}</span><span class="lbl">Yanlış</span></div>
    `;
    
    document.getElementById('writeSessionComplete').classList.remove('hidden');
}



// Event Listeners for Write Mode
document.getElementById('btnCheckWrite')?.addEventListener('click', checkWriteAnswer);
document.getElementById('writeInput')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') checkWriteAnswer();
});
document.getElementById('btnRestartWrite')?.addEventListener('click', () => startWriteMode());
document.getElementById('btnBackWrite')?.addEventListener('click', () => showScreen('writeHubScreen'));
document.getElementById('btnBackToGroupWrite')?.addEventListener('click', () => showScreen('writeHubScreen'));

function startCustomReview(timeframe) {
    const progress = loadProgress();
    const timeLogs = progress.timeLogs || [];
    const now = new Date();
    
    let startTime;
    let endTime = now.getTime(); // default: up to now
    
    if (timeframe === 'yesterday') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        startTime = startOfToday - 86400000;
        endTime = startOfToday;
    } else if (timeframe === 'week') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        startTime = startOfToday - (6 * 86400000);
    } else if (timeframe === 'month') {
        startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    } else {
        return; // fallback
    }
    
    const logsTarget = timeLogs.filter(l => l.ts >= startTime && l.ts < endTime).sort((a, b) => b.ts - a.ts);
    
    const uniqueWords = [];
    const seen = new Set();
    
    for (const log of logsTarget) {
        if (!seen.has(log.en)) {
            seen.add(log.en);
            uniqueWords.push({ en: log.en, tr: log.tr });
        }
    }
    
    if (uniqueWords.length === 0) {
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.addNotification('Bilgi', 'Tekrar edilecek kelime bulunamadı.', 'ℹ️');
        } else {
            alert('Tekrar edilecek kelime bulunamadı.');
        }
        return;
    }
    
    state.sessionQueue = uniqueWords.map((w, idx) => ({ idx, word: w })).sort(() => Math.random() - 0.5);
    state.sessionIndex = 0;
    state.sessionCorrect = 0;
    state.sessionWrong = 0;
    state.sessionUnsure = 0;
    state.currentMode = 'weeklyReview';
    
    document.getElementById('sessionComplete')?.classList.add('hidden');
    const badge = document.getElementById('fcModeBadge');
    if (badge) {
        const badgeLabels = { 'yesterday': 'Dünün Tekrarı', 'week': 'Haftalık Tekrar', 'month': 'Aylık Tekrar' };
        badge.textContent = badgeLabels[timeframe] || 'Tekrar';
        badge.className = 'fc-mode-badge sandbox';
    }
    
    showScreen('flashcardScreen');
    renderCard();
}
