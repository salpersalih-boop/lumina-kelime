/* ============================================================
   RACE ARENA — COMPLETE GAME SYSTEM
   Yarış Arenası: Hızlı Yazma, Hızlı Şık, Hızlı Eşleştirme
   Puan sistemi localStorage'da lumina_race_stats key'inde saklanır.
============================================================ */

// ── RACE STATS MANAGER ──
const RaceStatsManager = (() => {
    const LS_BASE = 'lumina_race_stats';
    const statsKey = () => {
        const sess = AuthManager.getSession();
        return sess && !sess.guest && sess.uid ? `${LS_BASE}_${sess.uid}` : LS_BASE;
    };

    function getStats() {
        try {
            const raw = localStorage.getItem(statsKey());
            return raw ? JSON.parse(raw) : getDefault();
        } catch { return getDefault(); }
    }

    function getDefault() {
        return {
            totalScore: 0,
            highScore: 0,
            gamesPlayed: 0,
            gamesWon: 0,
            totalCorrect: 0,
            totalWrong: 0,
            bestTime: null,
            streak: 0,
            maxStreak: 0,
            lastPlayDate: null,
            dailyHighScore: 0,
            dailyDate: null,
            typing: { played: 0, totalScore: 0, highScore: 0 },
            quiz: { played: 0, totalScore: 0, highScore: 0 },
            match: { played: 0, totalScore: 0, highScore: 0 }
        };
    }

    function saveStats(stats) {
        localStorage.setItem(LS_KEY, JSON.stringify(stats));
    }

    function recordGame(gameType, score, correct, wrong, timeSec) {
        const stats = getStats();
        stats.totalScore += score;
        stats.gamesPlayed++;
        stats.totalCorrect += correct;
        stats.totalWrong += wrong;

        if (score > stats.highScore) stats.highScore = score;
        if (timeSec && (!stats.bestTime || timeSec < stats.bestTime)) stats.bestTime = timeSec;

        // Streak
        const today = new Date().toDateString();
        if (stats.lastPlayDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            stats.streak = (stats.lastPlayDate === yesterday) ? stats.streak + 1 : 1;
        }
        if (stats.streak > stats.maxStreak) stats.maxStreak = stats.streak;
        stats.lastPlayDate = today;

        // Daily high score
        if (stats.dailyDate !== today) {
            stats.dailyDate = today;
            stats.dailyHighScore = score;
        } else if (score > stats.dailyHighScore) {
            stats.dailyHighScore = score;
        }

        // Won if >50% correct
        if (correct > wrong) stats.gamesWon++;

        // Per-game stats
        const gk = stats[gameType] || { played: 0, totalScore: 0, highScore: 0 };
        gk.played++;
        gk.totalScore += score;
        if (score > gk.highScore) gk.highScore = score;
        stats[gameType] = gk;

        saveStats(stats);
        return stats;
    }

    function reset() {
        localStorage.removeItem(LS_KEY);
    }

    return { getStats, recordGame, reset };
})();

// ── RANK SYSTEM ──
const RACE_RANKS = [
    { title: 'Çaylak', icon: '🥉', minScore: 0 },
    { title: 'Acemi', icon: '🥈', minScore: 500 },
    { title: 'Çırak', icon: '🥇', minScore: 1500 },
    { title: 'Orta', icon: '⭐', minScore: 3000 },
    { title: 'Yetenekli', icon: '🌟', minScore: 5000 },
    { title: 'Uzman', icon: '💎', minScore: 8000 },
    { title: 'Usta', icon: '👑', minScore: 12000 },
    { title: 'Efsane', icon: '🏆', minScore: 20000 }
];

function getRaceRank(totalScore) {
    let rank = RACE_RANKS[0];
    let nextRank = RACE_RANKS[1];
    for (let i = RACE_RANKS.length - 1; i >= 0; i--) {
        if (totalScore >= RACE_RANKS[i].minScore) {
            rank = RACE_RANKS[i];
            nextRank = RACE_RANKS[i + 1] || null;
            break;
        }
    }
    return { rank, nextRank, level: RACE_RANKS.indexOf(rank) + 1 };
}

// ── RACE HUB ──
function openRaceHub() {
    refreshRaceHubUI();
    showScreen('raceHubScreen');
}

function refreshRaceHubUI() {
    const stats = RaceStatsManager.getStats();
    document.getElementById('rsTotalScore').textContent = stats.totalScore.toLocaleString();
    document.getElementById('rsGamesPlayed').textContent = stats.gamesPlayed;
    document.getElementById('rsHighScore').textContent = stats.highScore.toLocaleString();
    document.getElementById('rsStreak').textContent = stats.streak;

    // Rank
    const { rank, nextRank, level } = getRaceRank(stats.totalScore);
    document.getElementById('raceRankTitle').textContent = rank.title;
    document.querySelector('.rank-icon').textContent = rank.icon;

    const fill = document.getElementById('raceRankFill');
    const text = document.getElementById('raceRankText');
    if (nextRank) {
        const progress = (stats.totalScore - rank.minScore) / (nextRank.minScore - rank.minScore) * 100;
        fill.style.width = Math.min(progress, 100) + '%';
        text.textContent = `Seviye ${level} • ${stats.totalScore}/${nextRank.minScore} puan`;
    } else {
        fill.style.width = '100%';
        text.textContent = `Seviye ${level} • Maksimum rütbe! 🏆`;
    }
}

function showRaceStatsModal() {
    const stats = RaceStatsManager.getStats();
    const el = document.getElementById('raceFullStats');
    el.innerHTML = `
        <div class="race-full-stat"><span class="fs-icon">🏆</span><span class="fs-val">${stats.totalScore.toLocaleString()}</span><span class="fs-lbl">Toplam Puan</span></div>
        <div class="race-full-stat"><span class="fs-icon">⭐</span><span class="fs-val">${stats.highScore.toLocaleString()}</span><span class="fs-lbl">En Yüksek Puan</span></div>
        <div class="race-full-stat"><span class="fs-icon">🎮</span><span class="fs-val">${stats.gamesPlayed}</span><span class="fs-lbl">Oynanan Oyun</span></div>
        <div class="race-full-stat"><span class="fs-icon">🏅</span><span class="fs-val">${stats.gamesWon}</span><span class="fs-lbl">Kazanılan</span></div>
        <div class="race-full-stat"><span class="fs-icon">✅</span><span class="fs-val">${stats.totalCorrect}</span><span class="fs-lbl">Doğru Cevap</span></div>
        <div class="race-full-stat"><span class="fs-icon">❌</span><span class="fs-val">${stats.totalWrong}</span><span class="fs-lbl">Yanlış Cevap</span></div>
        <div class="race-full-stat"><span class="fs-icon">🔥</span><span class="fs-val">${stats.streak} / ${stats.maxStreak}</span><span class="fs-lbl">Seri / En İyi Seri</span></div>
        <div class="race-full-stat"><span class="fs-icon">📅</span><span class="fs-val">${stats.dailyHighScore}</span><span class="fs-lbl">Günlük En Yüksek</span></div>
        <div class="race-full-stat"><span class="fs-icon">⌨️</span><span class="fs-val">${stats.typing.played} (${stats.typing.highScore})</span><span class="fs-lbl">Yazma (En Yüksek)</span></div>
        <div class="race-full-stat"><span class="fs-icon">⚡</span><span class="fs-val">${stats.quiz.played} (${stats.quiz.highScore})</span><span class="fs-lbl">Şık (En Yüksek)</span></div>
        <div class="race-full-stat"><span class="fs-icon">🔗</span><span class="fs-val">${stats.match.played} (${stats.match.highScore})</span><span class="fs-lbl">Eşleştirme (En Yüksek)</span></div>
        <div class="race-full-stat"><span class="fs-icon">⏱️</span><span class="fs-val">${stats.bestTime ? stats.bestTime.toFixed(1) + 's' : '—'}</span><span class="fs-lbl">En Hızlı Süre</span></div>
    `;
    openModal('raceStatsModal');
}

window.resetRaceStats = function () {
    if (confirm('Tüm yarış istatistiklerin silinecek. Emin misin?')) {
        RaceStatsManager.reset();
        closeModal('raceStatsModal');
        refreshRaceHubUI();
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.addNotification('İstatistikler Sıfırlandı', 'Yarış istatistiklerin temizlendi.', '🗑️');
        }
    }
};

// ── HELPER: Gather all words from allWords into flat array ──
function getAllWordsFlat() {
    const words = [];
    const aw = activeWords();
    for (const key of Object.keys(aw)) {
        const group = aw[key];
        if (Array.isArray(group)) {
            for (const w of group) {
                if (w && w.en && w.tr) words.push({ en: w.en, tr: w.tr });
            }
        }
    }
    return words;
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getRandomWords(count) {
    const all = getAllWordsFlat();
    if (all.length === 0) return [];
    const shuffled = shuffleArray(all);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ── SCORE POP ANIMATION ──
function showScorePop(x, y, text, negative) {
    const pop = document.createElement('div');
    pop.className = 'score-pop' + (negative ? ' negative' : '');
    pop.textContent = text;
    pop.style.left = x + 'px';
    pop.style.top = y + 'px';
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 800);
}

// ── COUNTDOWN HELPER ──
function runCountdown(countdownId, numId, callback) {
    const overlay = document.getElementById(countdownId);
    const numEl = document.getElementById(numId);
    overlay.classList.remove('hidden');
    let count = 3;
    numEl.textContent = count;

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            numEl.textContent = count;
        } else {
            numEl.textContent = 'GO!';
            setTimeout(() => {
                overlay.classList.add('hidden');
                callback();
            }, 400);
            clearInterval(interval);
        }
    }, 700);
}

/* ══════════════════════════════════════════════════════════
   A) HIZLI YAZMA YARIŞI
══════════════════════════════════════════════════════════ */
const TypingRace = (() => {
    let words = [];
    let currentIndex = 0;
    let score = 0;
    let combo = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let timer = null;
    let timeLeft = 0;
    const TIME_PER_WORD = 8; // seconds per word
    const TOTAL_WORDS = 10;

    function start() {
        words = getRandomWords(TOTAL_WORDS);
        if (words.length === 0) {
            alert('Kelime bulunamadı. Lütfen önce bir dil seçin ve kelime yükleyin.');
            return;
        }
        currentIndex = 0;
        score = 0;
        combo = 0;
        totalCorrect = 0;
        totalWrong = 0;

        document.getElementById('typingResults').classList.add('hidden');
        document.getElementById('typingGameArea').style.display = '';
        document.getElementById('typingCurrentScore').textContent = '0';
        document.getElementById('typingCombo').textContent = '';
        document.getElementById('typingFeedback').textContent = '';
        document.getElementById('typingFeedback').className = 'typing-feedback';

        showScreen('typingRaceScreen');

        runCountdown('typingCountdown', 'typingCountdownNum', () => {
            showWord();
            document.getElementById('typingInput').focus();
        });
    }

    function showWord() {
        if (currentIndex >= words.length) {
            endGame();
            return;
        }

        const word = words[currentIndex];
        document.getElementById('typingTargetWord').textContent = word.en;
        document.getElementById('typingHintWord').textContent = word.tr;
        document.getElementById('typingProgressText').textContent = `${currentIndex + 1} / ${words.length}`;
        document.getElementById('typingInput').value = '';
        document.getElementById('typingInput').className = 'typing-race-input';
        document.getElementById('typingFeedback').textContent = '';
        document.getElementById('typingFeedback').className = 'typing-feedback';

        // Char feedback indicators
        const charFb = document.getElementById('typingCharFeedback');
        charFb.innerHTML = word.en.split('').map(() => '<span class="char pending"></span>').join('');

        // Timer
        timeLeft = TIME_PER_WORD;
        updateTimerBar();
        clearInterval(timer);
        timer = setInterval(() => {
            timeLeft -= 0.1;
            updateTimerBar();
            if (timeLeft <= 0) {
                handleTimeout();
            }
        }, 100);
    }

    function updateTimerBar() {
        const fill = document.getElementById('typingTimerFill');
        const pct = Math.max(0, (timeLeft / TIME_PER_WORD) * 100);
        fill.style.width = pct + '%';
        fill.classList.toggle('warning', pct < 30);
    }

    function handleInput() {
        const input = document.getElementById('typingInput');
        const target = words[currentIndex].en.toLowerCase();
        const typed = input.value.toLowerCase();

        // Update char feedback
        const chars = document.querySelectorAll('#typingCharFeedback .char');
        for (let i = 0; i < chars.length; i++) {
            if (i < typed.length) {
                chars[i].className = 'char ' + (typed[i] === target[i] ? 'ok' : 'err');
            } else {
                chars[i].className = 'char pending';
            }
        }

        // Check if complete
        if (typed === target) {
            clearInterval(timer);
            handleCorrect();
        }
    }

    function handleCorrect() {
        totalCorrect++;
        combo++;
        const timeBonus = Math.round(timeLeft * 10);
        const comboBonus = Math.min(combo - 1, 5) * 5;
        const wordScore = 50 + timeBonus + comboBonus;
        score += wordScore;

        document.getElementById('typingCurrentScore').textContent = score;
        document.getElementById('typingCombo').textContent = combo > 1 ? `🔥 x${combo}` : '';
        document.getElementById('typingInput').className = 'typing-race-input correct';

        const fb = document.getElementById('typingFeedback');
        fb.textContent = `✅ Doğru! +${wordScore} puan`;
        fb.className = 'typing-feedback success';

        setTimeout(() => {
            currentIndex++;
            showWord();
        }, 600);
    }

    function handleTimeout() {
        clearInterval(timer);
        totalWrong++;
        combo = 0;

        document.getElementById('typingCombo').textContent = '';
        document.getElementById('typingInput').className = 'typing-race-input wrong';

        const fb = document.getElementById('typingFeedback');
        fb.textContent = `⏰ Süre doldu! Doğru: ${words[currentIndex].en}`;
        fb.className = 'typing-feedback error';

        setTimeout(() => {
            currentIndex++;
            showWord();
        }, 1200);
    }

    function endGame() {
        clearInterval(timer);
        document.getElementById('typingGameArea').style.display = 'none';

        const stats = RaceStatsManager.recordGame('typing', score, totalCorrect, totalWrong, null);

        document.getElementById('typingFinalScore').textContent = score;
        document.getElementById('typingResultsStats').innerHTML = `
            <div class="race-result-stat"><span class="stat-val">${totalCorrect}</span><span class="stat-lbl">Doğru</span></div>
            <div class="race-result-stat"><span class="stat-val">${totalWrong}</span><span class="stat-lbl">Yanlış</span></div>
            <div class="race-result-stat"><span class="stat-val">${words.length}</span><span class="stat-lbl">Toplam Kelime</span></div>
            <div class="race-result-stat"><span class="stat-val">${Math.round((totalCorrect / words.length) * 100)}%</span><span class="stat-lbl">Başarı Oranı</span></div>
        `;
        document.getElementById('typingResults').classList.remove('hidden');
    }

    function cleanup() {
        clearInterval(timer);
    }

    return { start, handleInput, cleanup };
})();

/* ══════════════════════════════════════════════════════════
   B) HIZLI DOĞRU ŞIK YARIŞI
══════════════════════════════════════════════════════════ */
const QuickQuiz = (() => {
    let words = [];
    let allPool = [];
    let currentIndex = 0;
    let score = 0;
    let combo = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let timer = null;
    let timeLeft = 0;
    let questionStartTime = 0;
    const TIME_PER_Q = 10;
    const TOTAL_QS = 10;

    function start() {
        allPool = getAllWordsFlat();
        if (allPool.length < 4) {
            alert('En az 4 kelime gerekli. Lütfen önce bir dil seçin ve kelime yükleyin.');
            return;
        }
        words = shuffleArray(allPool).slice(0, Math.min(TOTAL_QS, allPool.length));
        currentIndex = 0;
        score = 0;
        combo = 0;
        totalCorrect = 0;
        totalWrong = 0;

        document.getElementById('quizResults').classList.add('hidden');
        document.getElementById('quizGameArea').style.display = '';
        document.getElementById('quizCurrentScore').textContent = '0';
        document.getElementById('quizCombo').textContent = '';
        document.getElementById('quizFeedback').textContent = '';

        showScreen('quickQuizScreen');

        runCountdown('quizCountdown', 'quizCountdownNum', () => {
            showQuestion();
        });
    }

    function showQuestion() {
        if (currentIndex >= words.length) {
            endGame();
            return;
        }

        const word = words[currentIndex];
        document.getElementById('quizQuestionWord').textContent = word.en;
        document.getElementById('quizQuestionHint').textContent = 'Bu kelimenin Türkçe karşılığı nedir?';
        document.getElementById('quizProgressText').textContent = `${currentIndex + 1} / ${words.length}`;
        document.getElementById('quizFeedback').textContent = '';

        // Generate options (1 correct + 3 wrong, shuffled)
        const correctAnswer = word.tr;
        const wrongOptions = shuffleArray(allPool.filter(w => w.tr !== correctAnswer))
            .slice(0, 3)
            .map(w => w.tr);
        const options = shuffleArray([correctAnswer, ...wrongOptions]);

        const optionsEl = document.getElementById('quizOptions');
        optionsEl.innerHTML = options.map(opt => `
            <button class="quiz-option-btn" data-answer="${escapeHtml(opt)}">${escapeHtml(opt)}</button>
        `).join('');

        // Add click handlers
        optionsEl.querySelectorAll('.quiz-option-btn').forEach(btn => {
            btn.addEventListener('click', () => handleAnswer(btn, correctAnswer));
        });

        // Timer
        timeLeft = TIME_PER_Q;
        questionStartTime = Date.now();
        updateQuizTimer();
        clearInterval(timer);
        timer = setInterval(() => {
            timeLeft -= 0.1;
            updateQuizTimer();
            if (timeLeft <= 0) {
                handleQuizTimeout(correctAnswer);
            }
        }, 100);
    }

    function updateQuizTimer() {
        const fill = document.getElementById('quizTimerFill');
        const pct = Math.max(0, (timeLeft / TIME_PER_Q) * 100);
        fill.style.width = pct + '%';
        fill.classList.toggle('warning', pct < 30);
    }

    function handleAnswer(btn, correctAnswer) {
        clearInterval(timer);
        const chosen = btn.dataset.answer;
        const isCorrect = chosen === correctAnswer;
        const responseTime = (Date.now() - questionStartTime) / 1000;

        // Disable all buttons
        document.querySelectorAll('.quiz-option-btn').forEach(b => b.classList.add('disabled'));

        if (isCorrect) {
            btn.classList.add('correct');
            totalCorrect++;
            combo++;
            const speedBonus = Math.round(Math.max(0, timeLeft) * 8);
            const comboBonus = Math.min(combo - 1, 5) * 8;
            const qScore = 60 + speedBonus + comboBonus;
            score += qScore;

            document.getElementById('quizCurrentScore').textContent = score;
            document.getElementById('quizCombo').textContent = combo > 1 ? `🔥 x${combo}` : '';
            document.getElementById('quizFeedback').textContent = `✅ Doğru! +${qScore} puan (${responseTime.toFixed(1)}s)`;
            document.getElementById('quizFeedback').style.color = 'var(--accent-ok)';
        } else {
            btn.classList.add('wrong');
            totalWrong++;
            combo = 0;

            // Highlight correct
            document.querySelectorAll('.quiz-option-btn').forEach(b => {
                if (b.dataset.answer === correctAnswer) b.classList.add('correct');
            });

            const penalty = Math.max(0, score > 10 ? -10 : 0);
            score = Math.max(0, score + penalty);

            document.getElementById('quizCurrentScore').textContent = score;
            document.getElementById('quizCombo').textContent = '';
            document.getElementById('quizFeedback').textContent = `❌ Yanlış! Doğru: ${correctAnswer}`;
            document.getElementById('quizFeedback').style.color = 'var(--accent-3)';
        }

        setTimeout(() => {
            currentIndex++;
            showQuestion();
        }, 1000);
    }

    function handleQuizTimeout(correctAnswer) {
        clearInterval(timer);
        totalWrong++;
        combo = 0;

        document.querySelectorAll('.quiz-option-btn').forEach(b => {
            b.classList.add('disabled');
            if (b.dataset.answer === correctAnswer) b.classList.add('correct');
        });

        document.getElementById('quizCombo').textContent = '';
        document.getElementById('quizFeedback').textContent = `⏰ Süre doldu! Doğru: ${correctAnswer}`;
        document.getElementById('quizFeedback').style.color = 'var(--accent-3)';

        setTimeout(() => {
            currentIndex++;
            showQuestion();
        }, 1200);
    }

    function endGame() {
        clearInterval(timer);
        document.getElementById('quizGameArea').style.display = 'none';

        RaceStatsManager.recordGame('quiz', score, totalCorrect, totalWrong, null);

        document.getElementById('quizFinalScore').textContent = score;
        document.getElementById('quizResultsStats').innerHTML = `
            <div class="race-result-stat"><span class="stat-val">${totalCorrect}</span><span class="stat-lbl">Doğru</span></div>
            <div class="race-result-stat"><span class="stat-val">${totalWrong}</span><span class="stat-lbl">Yanlış</span></div>
            <div class="race-result-stat"><span class="stat-val">${words.length}</span><span class="stat-lbl">Toplam Soru</span></div>
            <div class="race-result-stat"><span class="stat-val">${Math.round((totalCorrect / words.length) * 100)}%</span><span class="stat-lbl">Başarı Oranı</span></div>
        `;
        document.getElementById('quizResults').classList.remove('hidden');
    }

    function cleanup() {
        clearInterval(timer);
    }

    return { start, cleanup };
})();

/* ══════════════════════════════════════════════════════════
   C) HIZLI EŞLEŞTİRME OYUNU
══════════════════════════════════════════════════════════ */
const SpeedMatch = (() => {
    let pairs = [];
    let matched = 0;
    let score = 0;
    let combo = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let selectedEn = null;
    let selectedTr = null;
    let timer = null;
    let timeLeft = 0;
    let startTime = 0;
    const PAIR_COUNT = 6;
    const GAME_TIME = 45;

    function start() {
        const allWords = getAllWordsFlat();
        if (allWords.length < PAIR_COUNT) {
            alert('En az 6 kelime gerekli. Lütfen önce bir dil seçin ve kelime yükleyin.');
            return;
        }
        pairs = shuffleArray(allWords).slice(0, PAIR_COUNT);
        matched = 0;
        score = 0;
        combo = 0;
        totalCorrect = 0;
        totalWrong = 0;
        selectedEn = null;
        selectedTr = null;

        document.getElementById('matchResults').classList.add('hidden');
        document.getElementById('matchGameArea').style.display = '';
        document.getElementById('matchCurrentScore').textContent = '0';
        document.getElementById('matchCombo').textContent = '';

        showScreen('speedMatchScreen');

        runCountdown('matchCountdown', 'matchCountdownNum', () => {
            renderBoard();
            startTimer();
        });
    }

    function renderBoard() {
        const enCol = document.getElementById('speedMatchColEn');
        const trCol = document.getElementById('speedMatchColTr');

        const enItems = shuffleArray(pairs.map((p, i) => ({ text: p.en, idx: i })));
        const trItems = shuffleArray(pairs.map((p, i) => ({ text: p.tr, idx: i })));

        enCol.innerHTML = enItems.map(item =>
            `<div class="speed-match-item en-item" data-idx="${item.idx}" data-side="en">${escapeHtml(item.text)}</div>`
        ).join('');

        trCol.innerHTML = trItems.map(item =>
            `<div class="speed-match-item tr-item" data-idx="${item.idx}" data-side="tr">${escapeHtml(item.text)}</div>`
        ).join('');

        // Add click handlers
        document.querySelectorAll('.speed-match-item').forEach(item => {
            item.addEventListener('click', () => handleItemClick(item));
        });
    }

    function handleItemClick(item) {
        if (item.classList.contains('matched')) return;

        const side = item.dataset.side;
        const idx = parseInt(item.dataset.idx);

        if (side === 'en') {
            // Deselect previous EN
            document.querySelectorAll('.en-item.selected').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            selectedEn = idx;
        } else {
            // Deselect previous TR
            document.querySelectorAll('.tr-item.selected').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            selectedTr = idx;
        }

        // Check match if both selected
        if (selectedEn !== null && selectedTr !== null) {
            checkMatch();
        }
    }

    function checkMatch() {
        if (selectedEn === selectedTr) {
            // Correct match!
            totalCorrect++;
            combo++;
            const comboBonus = Math.min(combo - 1, 4) * 10;
            const matchScore = 80 + comboBonus;
            score += matchScore;
            matched++;

            document.getElementById('matchCurrentScore').textContent = score;
            document.getElementById('matchCombo').textContent = combo > 1 ? `🔥 x${combo}` : '';

            // Mark as matched
            document.querySelectorAll(`.speed-match-item[data-idx="${selectedEn}"]`).forEach(el => {
                el.classList.remove('selected');
                el.classList.add('matched');
            });

            selectedEn = null;
            selectedTr = null;

            // Check if all matched
            if (matched >= pairs.length) {
                endGame();
            }
        } else {
            // Wrong match
            totalWrong++;
            combo = 0;
            score = Math.max(0, score - 5);

            document.getElementById('matchCurrentScore').textContent = score;
            document.getElementById('matchCombo').textContent = '';

            // Flash wrong
            const enItem = document.querySelector(`.en-item.selected`);
            const trItem = document.querySelector(`.tr-item.selected`);

            [enItem, trItem].forEach(el => {
                if (el) {
                    el.classList.add('wrong-flash');
                    el.classList.remove('selected');
                }
            });

            setTimeout(() => {
                document.querySelectorAll('.wrong-flash').forEach(el => el.classList.remove('wrong-flash'));
            }, 400);

            selectedEn = null;
            selectedTr = null;
        }
    }

    function startTimer() {
        timeLeft = GAME_TIME;
        startTime = Date.now();
        updateMatchTimer();
        clearInterval(timer);
        timer = setInterval(() => {
            timeLeft -= 0.1;
            updateMatchTimer();
            if (timeLeft <= 0) {
                endGame();
            }
        }, 100);
    }

    function updateMatchTimer() {
        const fill = document.getElementById('matchTimerFill');
        const pct = Math.max(0, (timeLeft / GAME_TIME) * 100);
        fill.style.width = pct + '%';
        fill.classList.toggle('warning', pct < 25);
    }

    function endGame() {
        clearInterval(timer);
        const elapsed = (Date.now() - startTime) / 1000;

        // Bonus for finishing early
        if (matched >= pairs.length && timeLeft > 0) {
            const timeBonus = Math.round(timeLeft * 5);
            score += timeBonus;
        }

        document.getElementById('matchGameArea').style.display = 'none';

        RaceStatsManager.recordGame('match', score, totalCorrect, totalWrong, elapsed);

        document.getElementById('matchFinalScore').textContent = score;
        document.getElementById('matchResultsStats').innerHTML = `
            <div class="race-result-stat"><span class="stat-val">${totalCorrect}</span><span class="stat-lbl">Doğru Eşleşme</span></div>
            <div class="race-result-stat"><span class="stat-val">${totalWrong}</span><span class="stat-lbl">Yanlış Deneme</span></div>
            <div class="race-result-stat"><span class="stat-val">${elapsed.toFixed(1)}s</span><span class="stat-lbl">Geçen Süre</span></div>
            <div class="race-result-stat"><span class="stat-val">${matched}/${pairs.length}</span><span class="stat-lbl">Eşleşen Çift</span></div>
        `;
        document.getElementById('matchResults').classList.remove('hidden');
    }

    function cleanup() {
        clearInterval(timer);
    }

    return { start, cleanup };
})();

/* ══════════════════════════════════════════════════════════
   RACE ARENA — EVENT LISTENERS
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnGoRace')?.addEventListener('click', openRaceHub);
    document.getElementById('btnBackRaceHub')?.addEventListener('click', renderDashboard);
    document.getElementById('btnRaceStats')?.addEventListener('click', showRaceStatsModal);

    // Typing Race
    document.getElementById('btnStartTypingRace')?.addEventListener('click', () => TypingRace.start());
    document.getElementById('btnBackTypingRace')?.addEventListener('click', () => {
        TypingRace.cleanup();
        openRaceHub();
    });
    document.getElementById('typingInput')?.addEventListener('input', () => TypingRace.handleInput());
    document.getElementById('btnTypingReplay')?.addEventListener('click', () => TypingRace.start());
    document.getElementById('btnTypingBackHub')?.addEventListener('click', () => {
        TypingRace.cleanup();
        openRaceHub();
    });

    // Quick Quiz
    document.getElementById('btnStartQuickQuiz')?.addEventListener('click', () => QuickQuiz.start());
    document.getElementById('btnBackQuickQuiz')?.addEventListener('click', () => {
        QuickQuiz.cleanup();
        openRaceHub();
    });
    document.getElementById('btnQuizReplay')?.addEventListener('click', () => QuickQuiz.start());
    document.getElementById('btnQuizBackHub')?.addEventListener('click', () => {
        QuickQuiz.cleanup();
        openRaceHub();
    });

    // Speed Match
    document.getElementById('btnStartSpeedMatch')?.addEventListener('click', () => SpeedMatch.start());
    document.getElementById('btnBackSpeedMatch')?.addEventListener('click', () => {
        SpeedMatch.cleanup();
        openRaceHub();
    });
    document.getElementById('btnMatchReplay')?.addEventListener('click', () => SpeedMatch.start());
    document.getElementById('btnMatchBackHub')?.addEventListener('click', () => {
        SpeedMatch.cleanup();
        openRaceHub();
    });
});
