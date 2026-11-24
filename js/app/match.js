/* ============================================================
   LUMINA — EŞLEŞTİR & KAZAN (oyunlaştırılmış eşleştirme)
   - Tur: 6 kelime çifti, 60 sn. Son 10 sn sayaç kırmızı ve nabız atar.
   - Doğru eşleşme: 100 puan + seri (combo) bonusu; yanlış: −25 puan, seri sıfırlanır.
   - Hepsi süre bitmeden doğruysa tur hemen biter, kalan her saniye +10 bonus.
   - Skorlar localStorage'da dil başına tutulur: son, önceki, rekor, en kötü.
   - Sonuç dört senaryodan biriyle gösterilir: yeni rekor, iyi iş, hırslandırma, ısınma turu.
   Efektler kendi canvas parçacık motoruyla çizilir (dış kütüphane yok).
============================================================ */

// ── Parçacık motoru: konfeti, yıldız, kıvılcım, köz, nazar boncuğu ──
const MatchFx = (() => {
    let cv = null, ctx = null, parts = [], raf = null;
    const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    function ensure() {
        if (cv) return;
        cv = document.getElementById('mgFx');
        ctx = cv.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
    }
    function resize() {
        if (!cv) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function star(x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
            ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill();
    }
    function nazar(r) {
        [['#1d4ed8', 1], ['#ffffff', 0.72], ['#7dd3fc', 0.5], ['#0f172a', 0.24]].forEach(([c, k]) => {
            ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r * k, 0, Math.PI * 2); ctx.fill();
        });
    }

    function draw(p) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.fade)) * p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        switch (p.shape) {
            case 'rect':   ctx.scale(1, Math.cos(p.tilt)); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); break;
            case 'star':   star(0, 0, p.size * 0.7); break;
            case 'circle': ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); break;
            case 'glow':   ctx.shadowColor = p.color; ctx.shadowBlur = p.size * 2; ctx.beginPath(); ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2); ctx.fill(); break;
            case 'nazar':  nazar(p.size / 2); break;
        }
        ctx.restore();
    }

    function loop() {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        parts = parts.filter(p => {
            p.vx *= p.drag; p.vy = p.vy * p.drag + p.g;
            p.x += p.vx + Math.sin(p.life * p.wobble) * p.sway;
            p.y += p.vy; p.rot += p.vr; p.tilt += p.vt; p.life--;
            draw(p);
            return p.life > 0 && p.y < innerHeight + 60 && p.y > -260;
        });
        raf = parts.length ? requestAnimationFrame(loop) : null;
        if (!raf) ctx.clearRect(0, 0, innerWidth, innerHeight);
    }

    // angle: radyan (−π/2 yukarı), spread: yayılma açısı, power: ilk hız (px/kare)
    function burst(o) {
        ensure();
        let count = o.count || 40;
        if (reduced()) count = Math.ceil(count / 4);
        const colors = o.colors || ['#6366f1', '#3b82f6', '#f97316', '#facc15', '#22c55e', '#ec4899'];
        const shapes = o.shapes || ['rect', 'rect', 'circle', 'star'];
        for (let i = 0; i < count; i++) {
            const a = (o.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (o.spread ?? Math.PI / 2);
            const v = (o.power ?? 10) * (0.45 + Math.random() * 0.75);
            const life = (o.life ?? 110) * (0.7 + Math.random() * 0.6);
            parts.push({
                x: o.x + (Math.random() - 0.5) * (o.jitter || 0), y: o.y,
                vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                g: o.gravity ?? 0.22, drag: o.drag ?? 0.985,
                size: (o.size ?? 10) * (0.6 + Math.random() * 0.8),
                color: colors[(Math.random() * colors.length) | 0],
                shape: shapes[(Math.random() * shapes.length) | 0],
                rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
                tilt: Math.random() * 6.28, vt: 0.08 + Math.random() * 0.15,
                sway: o.sway ?? 0.6, wobble: 0.05 + Math.random() * 0.08,
                life, fade: Math.min(40, life / 2), alpha: o.alpha ?? 1
            });
        }
        if (!raf) raf = requestAnimationFrame(loop);
    }

    function clear() { parts = []; }
    return { burst, clear };
})();

// ── Oyun ──
const MatchGame = (() => {
    const ROUND_SEC = 60, PAIRS = 6, POINTS = 100, COMBO_STEP = 20, COMBO_MAX = 5, WRONG = 25, BONUS_PER_SEC = 10;
    const RING = 2 * Math.PI * 26;

    const g = {
        phase: 'idle', round: 0, score: 0, combo: 0, correct: 0, wrong: 0,
        endAt: 0, timer: null, left: ROUND_SEC, selEng: null, selTr: null, words: [], lastSecond: null
    };
    const $ = id => document.getElementById(id);

    // ── skor kaydı (dil başına) ──
    function statsKey() {
        const s = typeof AuthManager !== 'undefined' && AuthManager.getSession();
        return 'lumina_match_stats' + (s && s.uid && !s.guest ? '_' + s.uid : '');
    }
    function loadAll() { try { return JSON.parse(localStorage.getItem(statsKey()) || '{}') || {}; } catch { return {}; } }
    function loadStats() { return Object.assign({ games: 0, last: null, best: null, worst: null }, loadAll()[state.lang] || {}); }
    function saveStats(st) {
        const all = loadAll(); all[state.lang] = st;
        try { localStorage.setItem(statsKey(), JSON.stringify(all)); } catch { /* yoksay */ }
    }

    function wordPool() {
        const pot = [];
        Object.values(allWords || {}).forEach(grp => (grp || []).forEach(w => { if (w && w.en && w.tr) pot.push(w); }));
        // Aynı çeviri iki kez çıkmasın (eşleşme belirsiz olur)
        const seen = new Set();
        return shuffle(pot).filter(w => { const k = w.tr.trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    }

    // ── tur başlat ──
    function start(fresh) {
        const pool = wordPool();
        if (!pool.length) { alert('Eşleştirme oyunu için kelime bulunamadı.'); return; }
        stopTimer();
        MatchFx.clear();
        if (fresh) g.round = 0;
        g.round += 1;
        Object.assign(g, { phase: 'intro', score: 0, combo: 0, correct: 0, wrong: 0, left: ROUND_SEC, selEng: null, selTr: null, lastSecond: null });
        g.words = pool.slice(0, Math.min(PAIRS, pool.length));

        $('mgResult').classList.add('hidden');
        $('mgPerfect').classList.add('hidden');
        $('matchScreen').classList.remove('mg-danger', 'mg-shake');
        renderHud();
        renderBoard();
        if ($('matchScreen').classList.contains('active') === false) showScreen('matchScreen');

        const banner = $('mgBanner');
        banner.innerHTML = `<span>Tur ${g.round}</span><b>BAŞLA!</b>`;
        banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show');
        setTimeout(() => { if (g.phase === 'intro') { g.phase = 'play'; startTimer(); } }, 850);
    }

    function renderBoard() {
        const eng = shuffle(g.words.map((w, i) => ({ id: i, text: w.en })));
        const tr = shuffle(g.words.map((w, i) => ({ id: i, text: w.tr })));
        const tile = (it, side, i) => `<button class="mg-tile mg-${side}" data-id="${it.id}" data-side="${side}" style="--i:${i}"><span>${escapeHtml(it.text)}</span></button>`;
        $('matchColEng').innerHTML = eng.map((it, i) => tile(it, 'eng', i)).join('');
        $('matchColTr').innerHTML = tr.map((it, i) => tile(it, 'tr', i + 0.5)).join('');
    }

    function renderHud() {
        $('mgRound').textContent = `Tur ${g.round}`;
        setScore(g.score, false);
        const st = loadStats();
        $('mgBest').textContent = st.best == null ? '—' : st.best;
        renderCombo();
        renderTime(ROUND_SEC);
        $('mgProgFill').style.width = '0%';
        $('mgProgText').textContent = `0 / ${g.words.length || PAIRS}`;
    }

    function setScore(v, bump = true) {
        const el = $('mgScore');
        el.textContent = v;
        if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    }

    function renderCombo() {
        const el = $('mgCombo');
        const mult = Math.min(COMBO_MAX, Math.max(1, g.combo));
        el.innerHTML = g.combo >= 3 ? `<i>🔥</i> x${mult}` : `x${mult}`;
        el.classList.toggle('hot', g.combo >= 3);
        if (g.combo >= 2) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    }

    // ── sayaç ──
    function startTimer() {
        g.endAt = performance.now() + ROUND_SEC * 1000;
        g.timer = setInterval(tick, 100);
        tick();
    }
    function stopTimer() { clearInterval(g.timer); g.timer = null; }

    function tick() {
        if (!$('matchScreen').classList.contains('active')) { stopTimer(); g.phase = 'idle'; hideLayers(); return; }   // ekrandan çıkıldı
        const ms = Math.max(0, g.endAt - performance.now());
        g.left = ms / 1000;
        renderTime(g.left);
        if (ms <= 0) finish('timeout');
    }

    function renderTime(sec) {
        const s = Math.ceil(sec);
        const timer = $('mgTimer');
        $('mgTime').textContent = s;
        $('mgRingFg').style.strokeDashoffset = String(RING * (1 - sec / ROUND_SEC));
        timer.classList.toggle('warn', s <= 20 && s > 10);
        timer.classList.toggle('danger', s <= 10);
        $('matchScreen').classList.toggle('mg-danger', s <= 10 && g.phase === 'play');
        if (s !== g.lastSecond) {
            g.lastSecond = s;
            if (s <= 10 && g.phase === 'play') { timer.classList.remove('beat'); void timer.offsetWidth; timer.classList.add('beat'); }
        }
    }

    // ── tıklama ──
    function onTileClick(btn) {
        if (g.phase !== 'play' && g.phase !== 'intro') return;
        if (btn.classList.contains('done')) return;
        const side = btn.dataset.side;
        const key = side === 'eng' ? 'selEng' : 'selTr';
        if (g[key] === btn) { btn.classList.remove('sel'); g[key] = null; return; }
        g[key]?.classList.remove('sel');
        btn.classList.add('sel');
        g[key] = btn;
        if (g.selEng && g.selTr) check();
    }

    function check() {
        const a = g.selEng, b = g.selTr;
        g.selEng = g.selTr = null;
        if (a.dataset.id === b.dataset.id) {
            g.combo += 1; g.correct += 1;
            const gain = POINTS + COMBO_STEP * (Math.min(COMBO_MAX, g.combo) - 1);
            g.score += gain;
            [a, b].forEach(el => { el.classList.remove('sel'); el.classList.add('ok'); });
            setTimeout(() => [a, b].forEach(el => { el.classList.remove('ok'); el.classList.add('done'); }), 520);
            const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
            const mx = (ra.left + ra.right + rb.left + rb.right) / 4, my = (ra.top + ra.bottom + rb.top + rb.bottom) / 4;
            MatchFx.burst({ x: mx, y: my, count: 22, power: 6, spread: Math.PI * 2, gravity: 0.12, life: 55, size: 8,
                colors: ['#22c55e', '#4ade80', '#facc15', '#a7f3d0'], shapes: ['star', 'circle', 'glow'] });
            floatText(mx, my - 10, `+${gain}`, g.combo >= 3 ? 'hot' : 'ok');
            setScore(g.score);
            renderCombo();
            const pct = (g.correct / g.words.length) * 100;
            $('mgProgFill').style.width = pct + '%';
            $('mgProgText').textContent = `${g.correct} / ${g.words.length}`;
            if (g.correct === g.words.length) finish('perfect');
        } else {
            g.combo = 0; g.wrong += 1;
            g.score = Math.max(0, g.score - WRONG);
            [a, b].forEach(el => { el.classList.remove('sel'); el.classList.add('bad'); });
            setTimeout(() => [a, b].forEach(el => el.classList.remove('bad')), 480);
            const r = b.getBoundingClientRect();
            floatText(r.left + r.width / 2, r.top, `−${WRONG}`, 'bad');
            setScore(g.score);
            renderCombo();
        }
    }

    function floatText(x, y, text, kind) {
        const el = document.createElement('div');
        el.className = `mg-float ${kind}`;
        el.textContent = text;
        el.style.left = x + 'px'; el.style.top = y + 'px';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    // ── tur sonu ──
    function finish(reason) {
        if (g.phase === 'end') return;
        g.phase = 'end';
        stopTimer();
        $('matchScreen').classList.remove('mg-danger');
        const secLeft = reason === 'perfect' ? Math.floor(g.left) : 0;
        const bonus = secLeft * BONUS_PER_SEC;
        const base = g.score;
        const total = base + bonus;

        const prev = loadStats();
        const kind = scenario(total, prev);
        const next = {
            games: prev.games + 1,
            previous: prev.last,
            last: total,
            best: prev.best == null ? total : Math.max(prev.best, total),
            worst: prev.worst == null ? total : Math.min(prev.worst, total)
        };
        saveStats(next);
        const result = { reason, base, bonus, secLeft, total, kind, prev, next };

        if (reason === 'perfect') showPerfect(result);
        else {
            $('mgTime').textContent = '0';
            const banner = $('mgBanner');
            banner.innerHTML = `<span>Süre</span><b>DOLDU!</b>`;
            banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show');
            setTimeout(() => showResult(result), 900);
        }
    }

    // A: yeni rekor · D: en kötü skor · C: öncekinden kötü · B: iyi / eşit / daha iyi
    function scenario(total, st) {
        if (st.games === 0 || st.best == null || total > st.best) return 'record';
        if (st.worst != null && total < st.worst) return 'worst';
        if (st.last != null && total < st.last) return 'worse';
        return 'good';
    }

    // Hepsi doğru: anlık tebrik kartı; beklemeden yeni kelimelere geçilebilir
    let perfectTimer = null;
    function showPerfect(r) {
        const el = $('mgPerfect');
        el.innerHTML = `
          <div class="mg-perfect-card">
            <div class="mg-rays"></div>
            <div class="mg-perfect-ic">⭐</div>
            <h3>MÜKEMMEL!</h3>
            <p>Hepsini doğru eşleştirdin</p>
            <div class="mg-bonus"><span>⏱ ${r.secLeft} sn kaldı</span><b>+<em id="mgBonusNum">0</em> bonus</b></div>
            <button class="mg-btn-next mg-btn-sm" id="mgPerfectNext">Hemen yeni kelimeler ⚡</button>
          </div>`;
        el.classList.remove('hidden');
        countUp($('mgBonusNum'), 0, r.bonus, 700);
        const cx = innerWidth / 2, cy = innerHeight / 2;
        MatchFx.burst({ x: cx, y: cy, count: 70, power: 13, spread: Math.PI * 2, gravity: 0.18, size: 11,
            colors: ['#facc15', '#fde68a', '#f97316', '#ffffff'], shapes: ['star', 'star', 'glow', 'rect'] });
        $('mgPerfectNext').onclick = () => { clearTimeout(perfectTimer); start(false); };
        clearTimeout(perfectTimer);
        perfectTimer = setTimeout(() => { if (!el.classList.contains('hidden')) { el.classList.add('hidden'); showResult(r); } }, 2300);
    }

    const SCENES = {
        record: { cls: 'record', icon: '🏆', title: 'İNANILMAZ! Yeni Rekor Kırdın! 🏆' },
        good:   { cls: 'good',   icon: '🚀', title: 'Harika İş!' },
        worse:  { cls: 'worse',  icon: '🔥', title: 'Bir önceki turda daha hızlıydın!' },
        worst:  { cls: 'worst',  icon: '🧿', title: 'Bunu ısınma turu sayalım! 😅' }
    };

    function subtitle(r) {
        const { prev, total } = r;
        switch (r.kind) {
            case 'record':
                return prev.best == null ? 'İlk turun, çıtayı sen belirledin. Şimdi kendini geç!'
                    : `Eski rekorunu <b>+${total - prev.best}</b> puanla geçtin.`;
            case 'good':
                if (prev.last != null && total > prev.last) return 'Bir önceki skorunu geride bıraktın, hızına yetişilmiyor! 🚀';
                if (r.reason === 'perfect') return 'Hepsi doğru! Bu tempoda rekor çok yakın. 🚀';
                return 'Formunu korudun, bir sonraki turda rekora saldır! 🚀';
            case 'worse':
                return 'Pes etmek yok, rekorunu geri almaya hazır mısın? 🔥';
            default:
                return 'En düşük skorun bu oldu ama şimdi gerçek gücünü gösterme zamanı!';
        }
    }

    function showResult(r) {
        const sc = SCENES[r.kind];
        const fmt = v => v == null ? '—' : v;
        const el = $('mgResult');
        el.className = `mg-result scene-${sc.cls}`;
        el.innerHTML = `
          <div class="mg-result-card">
            <div class="mg-scene-fx"></div>
            <div class="mg-scene-ic"><span>${sc.icon}</span></div>
            ${r.kind === 'worst' ? '<div class="mg-stamp">ISINMA TURU</div>' : ''}
            <h3 class="mg-scene-title">${sc.title}</h3>
            <p class="mg-scene-sub">${subtitle(r)}</p>
            <div class="mg-stats">
              <div class="mg-stat now" style="--d:0"><small>Mevcut Skor</small><b id="mgResNow">0</b></div>
              <div class="mg-stat" style="--d:1"><small>Önceki Skor</small><b>${fmt(r.prev.last)}</b></div>
              <div class="mg-stat best ${r.kind === 'record' ? 'new' : ''}" style="--d:2"><small>En İyi (Rekor)</small><b>${fmt(r.next.best)}</b>${r.kind === 'record' ? '<i>YENİ</i>' : ''}</div>
              <div class="mg-stat worst" style="--d:3"><small>En Kötü Skor</small><b>${fmt(r.next.worst)}</b></div>
            </div>
            <div class="mg-breakdown">
              <span>✅ ${g.correct} doğru</span><span>❌ ${g.wrong} hata</span>
              <span>${r.bonus ? `⏱ +${r.bonus} süre bonusu` : '⏱ Süre doldu'}</span>
            </div>
            <button class="mg-btn-next" id="mgNext"><span>Devam Et (Yeni Kelimeler)</span> <b>→</b></button>
            <button class="mg-btn-ghost" id="mgExit">Dashboard'a dön</button>
          </div>`;
        el.classList.remove('hidden');
        countUp($('mgResNow'), 0, r.total, 900);
        $('mgNext').onclick = () => start(false);
        $('mgExit').onclick = () => { el.classList.add('hidden'); renderDashboard(); };
        setTimeout(() => $('mgNext')?.focus({ preventScroll: true }), 300);
        sceneFx(r.kind);
    }

    function sceneFx(kind) {
        const W = innerWidth, H = innerHeight;
        if (kind === 'record') {
            const gold = ['#facc15', '#fde047', '#f59e0b', '#ffffff', '#6366f1', '#ec4899', '#22c55e'];
            const wave = () => {
                MatchFx.burst({ x: 0, y: H, angle: -Math.PI / 3, spread: 0.7, power: 19, count: 70, colors: gold });
                MatchFx.burst({ x: W, y: H, angle: -2 * Math.PI / 3, spread: 0.7, power: 19, count: 70, colors: gold });
                MatchFx.burst({ x: W / 2, y: H * 0.22, angle: -Math.PI / 2, spread: Math.PI * 1.2, power: 11, count: 36, colors: gold, shapes: ['star', 'star', 'glow'] });
            };
            wave(); setTimeout(wave, 450); setTimeout(wave, 900);
            setTimeout(() => MatchFx.burst({ x: W / 2, y: -20, angle: Math.PI / 2, spread: 0.6, power: 3, jitter: W, count: 120,
                gravity: 0.08, sway: 1.2, life: 260, colors: gold, shapes: ['rect', 'star'] }), 300);
        } else if (kind === 'good') {
            const greens = ['#22c55e', '#4ade80', '#2dd4bf', '#a3e635', '#ffffff', '#3b82f6'];
            MatchFx.burst({ x: 0, y: H, angle: -Math.PI / 3, spread: 0.6, power: 15, count: 55, colors: greens, shapes: ['rect', 'circle'] });
            MatchFx.burst({ x: W, y: H, angle: -2 * Math.PI / 3, spread: 0.6, power: 15, count: 55, colors: greens, shapes: ['rect', 'circle'] });
            setTimeout(() => MatchFx.burst({ x: W / 2, y: -20, angle: Math.PI / 2, spread: 0.5, power: 2, jitter: W, count: 60,
                gravity: 0.06, sway: 1, life: 220, colors: greens }), 250);
        } else if (kind === 'worse') {
            const fire = ['#f97316', '#fb923c', '#ef4444', '#facc15', '#fdba74'];
            const embers = () => MatchFx.burst({ x: W / 2, y: H + 10, angle: -Math.PI / 2, spread: 0.5, power: 6, jitter: W, count: 45,
                gravity: -0.02, drag: 0.99, sway: 0.9, life: 170, size: 7, colors: fire, shapes: ['glow', 'circle'] });
            embers(); setTimeout(embers, 600); setTimeout(embers, 1200);
        } else {
            const soft = () => MatchFx.burst({ x: W / 2, y: H + 20, angle: -Math.PI / 2, spread: 0.4, power: 3.5, jitter: W, count: 8,
                gravity: -0.01, drag: 0.995, sway: 1.4, life: 300, size: 20, alpha: 0.55, shapes: ['nazar'] });
            soft(); setTimeout(soft, 900);
        }
    }

    function countUp(el, from, to, ms) {
        if (!el) return;
        const t0 = performance.now();
        const step = (t) => {
            const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
            el.textContent = Math.round(from + (to - from) * e);
            if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    function hideLayers() {
        ['mgResult', 'mgPerfect'].forEach(id => $(id)?.classList.add('hidden'));
        clearTimeout(perfectTimer);
        MatchFx.clear();
    }

    // Başka ekrana geçilince (geri tuşu, menü) açık sonuç/tebrik katmanları kapansın
    new MutationObserver(() => { if (!$('matchScreen').classList.contains('active')) { if (g.phase !== 'idle') { stopTimer(); g.phase = 'idle'; } hideLayers(); } })
        .observe($('matchScreen'), { attributes: true, attributeFilter: ['class'] });

    // ── olaylar ──
    document.addEventListener('click', (e) => {
        const t = e.target.closest('#matchScreen .mg-tile');
        if (t) onTileClick(t);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !$('mgResult')?.classList.contains('hidden') && $('matchScreen')?.classList.contains('active')
            && document.activeElement?.id !== 'mgExit') { e.preventDefault(); start(false); }
    });

    return { start, stop: () => { stopTimer(); g.phase = 'idle'; } };
})();

function startMatch() { MatchGame.start(true); }
