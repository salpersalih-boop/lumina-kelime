/* ============================================================
   LUMINA — TÖMER MODÜLÜ (kişisel çalışma alanı)
   İçerik iki yerden okunur:
   1) data/tomer/ (yerel; GitHub'a gönderilmez — .gitignore)
   2) Firestore "tomer" koleksiyonu (yalnızca sahibinin hesabı okuyabilir — firestore.rules)
   İkisi de yoksa TÖMER kartı "Yakında" görünür.
   Akış: TÖMER → seviye (A1–B2) → Kelime | Gramer
   Gramer: konu → özet/notlar → test → sonuç; analiz, akıllı geri bildirim, grafikler.
   İlerleme: localStorage + Firestore senkronu (progress/tomergr).
============================================================ */
const TomerModule = (() => {
    const BASE = './data/tomer/';
    const PROGRESS_CODE = 'tomergr';
    const TEST_SIZE = 12;

    let index = null;          // data/tomer/index.json
    let available = false;
    let source = null;         // 'local' | 'cloud'
    let cloudBusy = false;
    let level = null;          // seçili seviye objesi
    let grammar = null;        // seçili seviyenin grammar.json'u
    const grammarCache = {};
    let topicId = null;
    let test = null;           // { kind, topics, questions, i, answers }

    const $ = id => document.getElementById(id);
    const wrap = id => $(id)?.querySelector('.tm-wrap');

    // ── veri ──
    // ── bulut (Firestore) ──
    function cloudCol() {
        const s = AuthManager.getSession();
        const db = AuthManager.getDb();
        return s && !s.guest && db ? db.collection('tomer') : null;
    }
    async function cloudGet(id) {
        const col = cloudCol();
        if (!col) throw new Error('Giriş yapılmadı');
        const snap = await col.doc(id).get();
        if (!snap.exists) throw new Error('Bulutta yok: ' + id);
        return snap.data();
    }

    async function checkAvailability() {
        const valid = ix => ix && Array.isArray(ix.levels) && ix.levels.some(l => l.available);
        // 1) yerel klasör
        try {
            const r = await fetch(BASE + 'index.json', { cache: 'no-store' });
            if (!r.ok) throw new Error(r.status);
            const ix = await r.json();
            if (valid(ix)) { index = ix; source = 'local'; return (available = true); }
        } catch { /* yerelde yok */ }
        // 2) hesaba özel bulut kopyası
        try {
            const ix = JSON.parse((await cloudGet('index')).json);
            if (valid(ix)) { index = ix; source = 'cloud'; return (available = true); }
        } catch { /* yetki yok ya da yüklenmemiş */ }
        index = null; source = null;
        return (available = false);
    }

    async function loadGrammar(levelId) {
        if (grammarCache[levelId]) return grammarCache[levelId];
        let g;
        if (source === 'cloud') {
            g = JSON.parse((await cloudGet(`${levelId}_grammar`)).json);
        } else {
            const r = await fetch(`${BASE}${levelId}/grammar.json`, { cache: 'no-store' });
            if (!r.ok) throw new Error('Gramer dosyası okunamadı');
            g = await r.json();
        }
        return (grammarCache[levelId] = g);
    }

    async function wordsCsv(levelId) {
        if (source === 'cloud') return (await cloudGet(`${levelId}_words`)).csv;
        return fetchCsvText(`tomer/${levelId}/words.csv`);
    }

    // Yerel içeriği hesaba yükle (yalnızca firestore.rules'taki e-posta yazabilir)
    async function uploadToCloud() {
        const col = cloudCol();
        if (!col) { alert('Önce Google hesabınla (salpersalih@gmail.com) giriş yapmalısın.'); return; }
        if (source !== 'local') { alert('Yükleme için uygulamayı kendi bilgisayarında (Baslat.bat) açmalısın.'); return; }
        cloudBusy = true; open();
        try {
            const now = Date.now();
            for (const l of index.levels.filter(x => x.available)) {
                const g = await (await fetch(`${BASE}${l.id}/grammar.json`, { cache: 'no-store' })).text();
                const w = await fetchCsvText(`tomer/${l.id}/words.csv`);
                await col.doc(`${l.id}_grammar`).set({ json: g, updatedAt: now });
                await col.doc(`${l.id}_words`).set({ csv: w, updatedAt: now });
            }
            await col.doc('index').set({ json: JSON.stringify(index), updatedAt: now });
            alert('✅ TÖMER içeriği hesabına yüklendi. Canlı sitede bu hesapla giriş yapınca TÖMER açılacak.');
        } catch (e) {
            alert(e.code === 'permission-denied'
                ? '⛔ Yetki yok. firestore.rules dosyasını Firebase\'de yayınladığından ve salpersalih@gmail.com ile giriş yaptığından emin ol.'
                : 'Yükleme başarısız: ' + (e.message || e));
        } finally { cloudBusy = false; open(); }
    }

    async function deleteFromCloud() {
        const col = cloudCol();
        if (!col || !confirm('TÖMER içeriği buluttan silinsin mi? (İlerleme kayıtların silinmez.)')) return;
        cloudBusy = true; open();
        try {
            const ids = ['index'];
            (index ? index.levels : []).forEach(l => ids.push(`${l.id}_grammar`, `${l.id}_words`));
            await Promise.all(ids.map(id => col.doc(id).delete()));
            alert('Buluttaki TÖMER içeriği silindi.');
        } catch (e) {
            alert(e.code === 'permission-denied' ? '⛔ Yetki yok.' : 'Silinemedi: ' + (e.message || e));
        } finally { cloudBusy = false; await checkAvailability(); if (available) open(); else showScreen('languageScreen'); }
    }

    // ── ilerleme ──
    const progressKey = () => AuthManager.progressKey(PROGRESS_CODE);
    function loadProgress() {
        try {
            const p = JSON.parse(localStorage.getItem(progressKey()) || 'null');
            if (p && p.v === 1) return p;
        } catch { }
        return { v: 1, topics: {}, tags: {}, qs: {}, sessions: [] };
    }
    function saveProgress(p) {
        const key = progressKey();
        localStorage.setItem(key, JSON.stringify(p));
        SyncManager.touch(key);
        SyncManager.schedulePush(PROGRESS_CODE);
    }
    const tKey = id => `${level.id}:${id}`;
    const pct = (c, t) => t ? Math.round(c / t * 100) : null;

    function topicStats(p, id) {
        const s = p.topics[tKey(id)];
        return s ? { ...s, acc: pct(s.c, s.t) } : null;
    }

    // ── yardımcılar ──
    function inline(text) {
        return escapeHtml(text)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>');
    }
    function renderNotes(lines) {
        let html = '', inList = false;
        for (const line of lines) {
            if (line.startsWith('- ')) {
                if (!inList) { html += '<ul>'; inList = true; }
                html += `<li>${inline(line.slice(2))}</li>`;
                continue;
            }
            if (inList) { html += '</ul>'; inList = false; }
            if (line.startsWith('## ')) html += `<h3>${inline(line.slice(3))}</h3>`;
            else html += `<p>${inline(line)}</p>`;
        }
        if (inList) html += '</ul>';
        return html;
    }
    const optLabel = o => o === '-' ? '— (artikel yok)' : o;
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
    }
    function accClass(acc) {
        if (acc === null || acc === undefined) return 'none';
        return acc >= 80 ? 'good' : acc >= 60 ? 'mid' : 'bad';
    }
    function topicTitle(id) {
        const t = grammar.topics.find(x => x.id === id);
        return t ? `${t.id} ${t.tr}` : id;
    }
    const backBtn = (label, fn) => `<button type="button" class="tm-back" data-act="${fn}">← ${escapeHtml(label)}</button>`;

    // ── ekran 1: seviye seçimi ──
    async function open() {
        if (!available && !(await checkAvailability())) return;
        document.body.classList.remove(...LANGUAGES.filter(l => l.theme).map(l => `theme-${l.theme}`));
        document.body.classList.add('theme-tomer');
        const w = wrap('tomerScreen');
        w.innerHTML = `
          ${backBtn('Diller', 'langs')}
          <header class="tm-head"><h1>TÖMER</h1><p>Seviyeni seç</p></header>
          <div class="tm-levels">
            ${index.levels.map(l => `
              <button type="button" class="tm-level${l.available ? '' : ' is-off'}" data-level="${escapeHtml(l.id)}"${l.available ? '' : ' disabled'}>
                <span class="tm-level-badge">${escapeHtml(l.label)}</span>
                <span class="tm-level-book">${l.available ? escapeHtml(l.book || '') : 'Yakında'}</span>
              </button>`).join('')}
          </div>
          ${cloudPanel()}`;
        showScreen('tomerScreen');
    }

    function cloudPanel() {
        const s = AuthManager.getSession();
        const signedIn = s && !s.guest;
        if (source === 'cloud') {
            return `<section class="tm-card tm-cloud"><h3>☁️ Hesabına özel içerik</h3>
              <p>Bu içerik sadece senin hesabında (${escapeHtml(s.email || '')}) görünür. B2'yi bitirdiğinde buradan silebilirsin.</p>
              <div class="tm-actions"><button type="button" class="btn-secondary" data-act="cloud-del"${cloudBusy ? ' disabled' : ''}>🗑 Buluttan Sil</button></div></section>`;
        }
        return `<section class="tm-card tm-cloud"><h3>☁️ Canlı sitede de kullan</h3>
          <p>İçerik şu an sadece bu bilgisayarda. Hesabına yüklersen canlı sitede yalnızca <strong>salpersalih@gmail.com</strong> ile giriş yapınca görünür; GitHub'a yine gitmez.</p>
          ${signedIn ? '' : '<p class="tm-warn">Yüklemek için önce Google hesabınla giriş yap (misafir modunda yüklenemez).</p>'}
          <div class="tm-actions">
            <button type="button" class="btn-primary" data-act="cloud-up"${!signedIn || cloudBusy ? ' disabled' : ''}>${cloudBusy ? 'Yükleniyor…' : '☁️ Hesabıma Yükle'}</button>
            ${signedIn ? `<button type="button" class="btn-secondary" data-act="cloud-del"${cloudBusy ? ' disabled' : ''}>🗑 Buluttan Sil</button>` : ''}
          </div></section>`;
    }

    // ── ekran 2: Kelime / Gramer ──
    async function openLevel(levelId) {
        level = index.levels.find(l => l.id === levelId);
        if (!level || !level.available) return;
        try { grammar = await loadGrammar(level.id); }
        catch (e) { alert('TÖMER içeriği yüklenemedi: ' + e.message); return; }
        showLevel();
    }

    function showLevel() {
        const p = loadProgress();
        const totals = overall(p);
        const words = LANGUAGE_BY_CODE['tomer' + level.id];
        wrap('tomerLevelScreen').innerHTML = `
          ${backBtn('Seviyeler', 'levels')}
          <header class="tm-head"><h1>TÖMER · ${escapeHtml(level.label)}</h1><p>${escapeHtml(grammar.book || '')}</p></header>
          <div class="tm-choice">
            <button type="button" class="tm-choice-card" data-act="words">
              <span class="tm-choice-icon">📚</span><strong>Kelime</strong>
              <span>${words ? 'Ünite ünite kelime kartları, test ve yazma' : ''}</span>
            </button>
            <button type="button" class="tm-choice-card" data-act="grammar">
              <span class="tm-choice-icon">📝</span><strong>Gramer</strong>
              <span>${grammar.topics.length} konu · özet, notlar ve konu testleri</span>
              ${totals.t ? `<span class="tm-pill ${accClass(totals.acc)}">Doğruluk %${totals.acc}</span>` : ''}
            </button>
          </div>`;
        showScreen('tomerLevelScreen');
    }

    async function openWords() {
        const code = 'tomer' + level.id;
        if (!LANGUAGE_BY_CODE[code]) return;
        await selectLanguage(code);
    }

    // ── ekran 3: gramer konu listesi ──
    function showGrammar() {
        const p = loadProgress();
        const totals = overall(p);
        const units = grammar.units.map(u => {
            const ts = grammar.topics.filter(t => t.unit === u.n);
            if (!ts.length) return '';
            return `
              <section class="tm-unit">
                <h3>Ünite ${u.n} · ${escapeHtml(u.en)} <span>${escapeHtml(u.tr)}</span></h3>
                ${ts.map(t => {
                    const s = topicStats(p, t.id);
                    return `
                    <button type="button" class="tm-topic" data-topic="${escapeHtml(t.id)}">
                      <span class="tm-topic-code">${escapeHtml(t.id)}</span>
                      <span class="tm-topic-name"><strong>${escapeHtml(t.tr)}</strong><small>${escapeHtml(t.title)} · ${t.questions.length} soru</small></span>
                      <span class="tm-pill ${accClass(s && s.acc)}">${s ? '%' + s.acc : 'Yeni'}</span>
                    </button>`;
                }).join('')}
              </section>`;
        }).join('');
        wrap('tomerGrammarScreen').innerHTML = `
          ${backBtn('TÖMER ' + level.label, 'level')}
          <header class="tm-head"><h1>Gramer · ${escapeHtml(level.label)}</h1>
            <p>${totals.t ? `Genel doğruluk %${totals.acc} · ${totals.t} soru çözüldü` : 'Bir konu seç: önce özeti oku, sonra testi çöz.'}</p></header>
          <div class="tm-actions">
            <button type="button" class="btn-primary" data-act="stats">📊 Analiz ve Grafikler</button>
            <button type="button" class="btn-secondary" data-act="weak">🎯 Eksiklerimi Çalış</button>
          </div>
          ${units}`;
        showScreen('tomerGrammarScreen');
    }

    // ── ekran 4: konu özeti ──
    function showTopic(id) {
        topicId = id;
        const t = grammar.topics.find(x => x.id === id);
        if (!t) return;
        const p = loadProgress();
        const s = topicStats(p, id);
        const weakTag = worstTag(p, id);
        wrap('tomerTopicScreen').innerHTML = `
          ${backBtn('Konular', 'grammar')}
          <header class="tm-head"><h1>${escapeHtml(t.id)} ${escapeHtml(t.tr)}</h1><p>${escapeHtml(t.title)}</p></header>
          ${s ? `<div class="tm-topic-stat"><span class="tm-pill ${accClass(s.acc)}">Doğruluk %${s.acc}</span>
                 <span>${s.att} test · en iyi %${s.best}</span>
                 ${weakTag ? `<span class="tm-warn">En çok hata: <strong>${escapeHtml(weakTag.tag)}</strong> (${weakTag.wrong}/${weakTag.t} yanlış)</span>` : ''}</div>` : ''}
          <article class="tm-notes">${renderNotes(t.notes)}</article>
          <div class="tm-actions">
            <button type="button" class="btn-primary" data-act="start">Teste Başla (${Math.min(TEST_SIZE, t.questions.length)} soru)</button>
          </div>`;
        showScreen('tomerTopicScreen');
    }

    // ── ekran 5: test ──
    function startTest(kind, questions, topics) {
        if (!questions.length) return;
        test = {
            kind, topics,
            questions: questions.map(q => ({ ...q, opts: shuffle(q.o) })),
            i: 0, answers: []
        };
        renderQuestion();
        showScreen('tomerTestScreen');
    }

    function startTopicTest() {
        const t = grammar.topics.find(x => x.id === topicId);
        if (!t) return;
        startTest('topic', shuffle(t.questions).slice(0, TEST_SIZE).map(q => ({ ...q, topic: t.id })), [t.id]);
    }

    function startWeakTest() {
        const p = loadProgress();
        const pool = [];
        grammar.topics.forEach(t => {
            const s = topicStats(p, t.id);
            if (!s || s.acc >= 80) return;
            t.questions.forEach(q => {
                const qs = p.qs[`${level.id}:${q.id}`];
                const wrong = qs ? qs.t - qs.c : 0;
                pool.push({ ...q, topic: t.id, w: (100 - s.acc) + wrong * 30 + Math.random() * 20 });
            });
        });
        if (!pool.length) {
            alert('Henüz eksik konu yok. Önce birkaç konu testi çöz; %80\'in altında kalan konular burada toplanır.');
            return;
        }
        pool.sort((a, b) => b.w - a.w);
        const picked = shuffle(pool.slice(0, TEST_SIZE));
        startTest('weak', picked, [...new Set(picked.map(q => q.topic))]);
    }

    function renderQuestion() {
        const q = test.questions[test.i];
        const n = test.questions.length;
        const answered = test.answers[test.i];
        const correct = q.o[0];
        wrap('tomerTestScreen').innerHTML = `
          ${backBtn(test.kind === 'topic' ? 'Konuya dön' : 'Konular', test.kind === 'topic' ? 'topic' : 'grammar')}
          <div class="tm-progress"><div style="width:${Math.round(test.i / n * 100)}%"></div></div>
          <p class="tm-qmeta">Soru ${test.i + 1} / ${n} · ${escapeHtml(topicTitle(q.topic))}${q.src === 'kitap' ? ' · <span class="tm-src">kitaptan</span>' : ''}</p>
          <h2 class="tm-question">${inline(q.q).replace(/___/g, '<span class="tm-blank">____</span>')}</h2>
          <div class="tm-options">
            ${q.opts.map((o, k) => {
                let cls = '';
                if (answered) cls = o === correct ? ' correct' : (o === answered.choice ? ' wrong' : ' dim');
                return `<button type="button" class="tm-option${cls}" data-opt="${k}"${answered ? ' disabled' : ''}>${escapeHtml(optLabel(o))}</button>`;
            }).join('')}
          </div>
          ${answered ? `
            <div class="tm-feedback ${answered.ok ? 'ok' : 'no'}">
              <strong>${answered.ok ? '✅ Doğru!' : `❌ Yanlış. Doğrusu: ${escapeHtml(optLabel(correct))}`}</strong>
              <p>${inline(q.ex)}</p>
            </div>
            <div class="tm-actions"><button type="button" class="btn-primary" data-act="next">${test.i + 1 < n ? 'Sonraki Soru →' : 'Sonucu Gör'}</button></div>` : ''}`;
    }

    function answer(k) {
        const q = test.questions[test.i];
        if (test.answers[test.i]) return;
        const choice = q.opts[k];
        const ok = choice === q.o[0];
        test.answers[test.i] = { choice, ok };

        // Her cevap anında kaydedilir (test yarıda bırakılsa da analiz eksik kalmaz)
        const p = loadProgress();
        const tk = tKey(q.topic);
        const ts = p.topics[tk] || (p.topics[tk] = { att: 0, c: 0, t: 0, best: 0, last: 0, lastAt: 0 });
        ts.t++; if (ok) ts.c++;
        const tg = p.tags[`${tk}|${q.tag}`] || (p.tags[`${tk}|${q.tag}`] = { c: 0, t: 0 });
        tg.t++; if (ok) tg.c++;
        const qk = `${level.id}:${q.id}`;
        const qs = p.qs[qk] || (p.qs[qk] = { c: 0, t: 0 });
        qs.t++; if (ok) qs.c++;
        saveProgress(p);
        renderQuestion();
    }

    function next() {
        if (test.i + 1 < test.questions.length) { test.i++; renderQuestion(); return; }
        finishTest();
    }

    function finishTest() {
        const c = test.answers.filter(a => a && a.ok).length;
        const n = test.questions.length;
        const score = pct(c, n);
        const p = loadProgress();
        const now = Date.now();
        // konu bazında test sonucu
        test.topics.forEach(id => {
            const qsIdx = test.questions.map((q, i) => q.topic === id ? i : -1).filter(i => i >= 0);
            const cc = qsIdx.filter(i => test.answers[i] && test.answers[i].ok).length;
            const s = p.topics[tKey(id)];
            if (!s || !qsIdx.length) return;
            const acc = pct(cc, qsIdx.length);
            s.att++; s.last = acc; s.best = Math.max(s.best || 0, acc); s.lastAt = now;
        });
        p.sessions.push({ at: now, lv: level.id, kind: test.kind, topics: test.topics, c, t: n });
        if (p.sessions.length > 300) p.sessions = p.sessions.slice(-300);
        saveProgress(p);

        // bu testteki hata dağılımı
        const wrongTags = {};
        test.questions.forEach((q, i) => {
            if (test.answers[i] && !test.answers[i].ok) {
                const k = `${topicTitle(q.topic)} → ${q.tag}`;
                wrongTags[k] = (wrongTags[k] || 0) + 1;
            }
        });
        const wrongList = test.questions.map((q, i) => ({ q, a: test.answers[i] })).filter(x => x.a && !x.a.ok);
        const msg = score >= 90 ? 'Harika! Bu konuya hâkimsin. 🎉'
            : score >= 70 ? 'İyi gidiyorsun; birkaç noktayı tekrar edersen tamam. 👍'
                : score >= 50 ? 'Fena değil ama eksiklerin var. Notlara dönüp testi tekrar çöz. 💪'
                    : 'Bu konuyu yeniden çalışmalısın. Önce özeti oku, sonra tekrar dene. 📖';

        wrap('tomerTestScreen').innerHTML = `
          <header class="tm-head"><h1>Sonuç: %${score}</h1><p>${c} / ${n} doğru · ${escapeHtml(msg)}</p></header>
          <div class="tm-score-ring ${accClass(score)}" style="--p:${score}"><span>%${score}</span></div>
          ${Object.keys(wrongTags).length ? `
            <section class="tm-card"><h3>Bu testte zorlandığın yerler</h3>
              <ul class="tm-taglist">${Object.entries(wrongTags).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><span>${escapeHtml(k)}</span><b>${v} yanlış</b></li>`).join('')}</ul>
            </section>` : ''}
          ${wrongList.length ? `
            <section class="tm-card"><h3>Yanlış cevapların</h3>
              ${wrongList.map(({ q, a }) => `
                <div class="tm-review">
                  <p class="tm-review-q">${inline(q.q).replace(/___/g, '<span class="tm-blank">____</span>')}</p>
                  <p><span class="tm-bad">Senin cevabın: ${escapeHtml(optLabel(a.choice))}</span> · <span class="tm-good">Doğrusu: ${escapeHtml(optLabel(q.o[0]))}</span></p>
                  <p class="tm-review-ex">${inline(q.ex)}</p>
                </div>`).join('')}
            </section>` : ''}
          <div class="tm-actions">
            <button type="button" class="btn-primary" data-act="${test.kind === 'topic' ? 'start' : 'weak'}">🔁 Tekrar Çöz</button>
            ${test.kind === 'topic' ? '<button type="button" class="btn-secondary" data-act="topic">📖 Konu Notları</button>' : ''}
            <button type="button" class="btn-secondary" data-act="stats">📊 Analiz</button>
            <button type="button" class="btn-secondary" data-act="grammar">Konular</button>
          </div>`;
    }

    // ── analiz ──
    function overall(p) {
        let c = 0, t = 0;
        Object.entries(p.topics).forEach(([k, s]) => { if (k.startsWith(level.id + ':')) { c += s.c; t += s.t; } });
        return { c, t, acc: pct(c, t) };
    }

    function worstTag(p, id) {
        const prefix = tKey(id) + '|';
        let worst = null;
        Object.entries(p.tags).forEach(([k, s]) => {
            if (!k.startsWith(prefix) || s.t < 2) return;
            const wrong = s.t - s.c;
            if (wrong === 0) return;
            const rate = wrong / s.t;
            if (!worst || rate > worst.rate || (rate === worst.rate && wrong > worst.wrong)) worst = { tag: k.slice(prefix.length), wrong, t: s.t, rate };
        });
        return worst && worst.rate >= 0.34 ? worst : null;
    }

    function feedback(p) {
        const items = [];
        const studied = grammar.topics.map(t => ({ t, s: topicStats(p, t.id) })).filter(x => x.s && x.s.t >= 3);
        const weak = studied.filter(x => x.s.acc < 60).sort((a, b) => a.s.acc - b.s.acc);
        const mid = studied.filter(x => x.s.acc >= 60 && x.s.acc < 80).sort((a, b) => a.s.acc - b.s.acc);
        const strong = studied.filter(x => x.s.acc >= 80);

        weak.slice(0, 4).forEach(({ t, s }) => {
            const wt = worstTag(p, t.id);
            items.push({ kind: 'bad', topic: t.id,
                text: `<strong>${escapeHtml(t.tr)}</strong> konusunda eksiksin (%${s.acc}).` +
                    (wt ? ` En çok <strong>"${escapeHtml(wt.tag)}"</strong> kısmında hata yapıyorsun (${wt.wrong}/${wt.t} yanlış).` : '') +
                    ' Notlara göz atıp testi tekrar çöz.' });
        });
        mid.slice(0, 3).forEach(({ t, s }) => {
            const wt = worstTag(p, t.id);
            items.push({ kind: 'mid', topic: t.id,
                text: `<strong>${escapeHtml(t.tr)}</strong> fena değil (%${s.acc})` +
                    (wt ? `, ama <strong>"${escapeHtml(wt.tag)}"</strong> kısmını karıştırıyorsun.` : '; biraz daha pratikle oturur.') });
        });
        // trend
        const sess = p.sessions.filter(x => x.lv === level.id);
        if (sess.length >= 4) {
            const half = Math.min(5, Math.floor(sess.length / 2));
            const avg = arr => arr.reduce((a, x) => a + x.c / x.t, 0) / arr.length * 100;
            const recent = avg(sess.slice(-half)), before = avg(sess.slice(-half * 2, -half));
            const diff = Math.round(recent - before);
            if (diff >= 5) items.push({ kind: 'good', text: `📈 Son ${half} testte ortalaman <strong>%${diff}</strong> yükseldi. Böyle devam!` });
            else if (diff <= -5) items.push({ kind: 'mid', text: `📉 Son ${half} testte ortalaman <strong>%${-diff}</strong> düştü. Zayıf konulara dönmek iyi olabilir.` });
        }
        if (strong.length) items.push({ kind: 'good', text: `✅ Çok iyisin: ${strong.slice(0, 6).map(x => `<strong>${escapeHtml(x.t.id)}</strong>`).join(', ')}${strong.length > 6 ? ` ve ${strong.length - 6} konu daha` : ''}.` });
        const untouched = grammar.units.filter(u => !grammar.topics.some(t => t.unit === u.n && topicStats(p, t.id)));
        if (untouched.length && studied.length) items.push({ kind: 'info', text: `Henüz hiç çözmediğin üniteler: ${untouched.map(u => u.n).join(', ')}.` });
        if (!items.length) items.push({ kind: 'info', text: 'Analiz için önce birkaç konu testi çöz. Her konuda en az 3 soru çözdükçe burada sana özel öneriler çıkar.' });
        return items;
    }

    function lineChart(sess) {
        const pts = sess.slice(-20);
        if (pts.length < 2) return '<p class="tm-empty">Grafik için en az 2 test çözmelisin.</p>';
        const W = 640, H = 220, L = 36, R = 12, T = 14, B = 28;
        const x = i => L + (W - L - R) * (pts.length === 1 ? 0 : i / (pts.length - 1));
        const y = v => T + (H - T - B) * (1 - v / 100);
        const vals = pts.map(s => Math.round(s.c / s.t * 100));
        const path = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
        const area = `${path} L${x(vals.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
        const grid = [0, 25, 50, 75, 100].map(g => `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}" class="tm-grid"/><text x="${L - 6}" y="${y(g) + 4}" text-anchor="end" class="tm-axis">%${g}</text>`).join('');
        const dots = vals.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4" class="tm-dot"><title>Test ${sess.length - pts.length + i + 1}: %${v}</title></circle>`).join('');
        return `<svg viewBox="0 0 ${W} ${H}" class="tm-chart" role="img" aria-label="Test başarı grafiği">
            <defs><linearGradient id="tmArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent-1)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent-1)" stop-opacity="0"/></linearGradient></defs>
            ${grid}<path d="${area}" fill="url(#tmArea)"/><path d="${path}" class="tm-line"/>${dots}
            <text x="${L}" y="${H - 6}" class="tm-axis">eski</text><text x="${W - R}" y="${H - 6}" text-anchor="end" class="tm-axis">son test</text></svg>`;
    }

    function unitBars(p) {
        return grammar.units.map(u => {
            let c = 0, t = 0;
            grammar.topics.filter(x => x.unit === u.n).forEach(x => { const s = p.topics[tKey(x.id)]; if (s) { c += s.c; t += s.t; } });
            const acc = pct(c, t);
            return `<div class="tm-bar-row"><span class="tm-bar-label">Ünite ${u.n}</span>
                <span class="tm-bar"><i class="${accClass(acc)}" style="width:${acc || 0}%"></i></span>
                <span class="tm-bar-val">${acc === null ? '—' : '%' + acc}</span></div>`;
        }).join('');
    }

    function showStats() {
        const p = loadProgress();
        const totals = overall(p);
        const sess = p.sessions.filter(s => s.lv === level.id);
        const studied = grammar.topics.filter(t => topicStats(p, t.id)).length;
        const fb = feedback(p);
        const ranked = grammar.topics.map(t => ({ t, s: topicStats(p, t.id) })).filter(x => x.s && x.s.t >= 3).sort((a, b) => a.s.acc - b.s.acc);
        wrap('tomerStatsScreen').innerHTML = `
          ${backBtn('Konular', 'grammar')}
          <header class="tm-head"><h1>Analiz · ${escapeHtml(level.label)}</h1><p>Gelişimini ve eksiklerini buradan takip et.</p></header>
          <div class="tm-kpis">
            <div class="tm-kpi"><b>${totals.acc === null ? '—' : '%' + totals.acc}</b><span>Genel doğruluk</span></div>
            <div class="tm-kpi"><b>${totals.t}</b><span>Çözülen soru</span></div>
            <div class="tm-kpi"><b>${sess.length}</b><span>Tamamlanan test</span></div>
            <div class="tm-kpi"><b>${studied}/${grammar.topics.length}</b><span>Çalışılan konu</span></div>
          </div>
          <section class="tm-card"><h3>💡 Sana özel geri bildirim</h3>
            <ul class="tm-feedback-list">${fb.map(f => `<li class="${f.kind}"><span>${f.text}</span>${f.topic ? `<button type="button" class="tm-mini" data-topic="${escapeHtml(f.topic)}">Çalış</button>` : ''}</li>`).join('')}</ul>
          </section>
          <section class="tm-card"><h3>📈 Test başarı grafiği (son 20 test)</h3>${lineChart(sess)}</section>
          <section class="tm-card"><h3>📊 Ünitelere göre doğruluk</h3>${unitBars(p)}</section>
          ${ranked.length ? `<section class="tm-card"><h3>Konular (zayıftan güçlüye)</h3>
              ${ranked.map(({ t, s }) => `<button type="button" class="tm-topic slim" data-topic="${escapeHtml(t.id)}">
                <span class="tm-topic-code">${escapeHtml(t.id)}</span><span class="tm-topic-name"><strong>${escapeHtml(t.tr)}</strong><small>${s.t} soru · ${s.att} test</small></span>
                <span class="tm-pill ${accClass(s.acc)}">%${s.acc}</span></button>`).join('')}</section>` : ''}
          <div class="tm-actions"><button type="button" class="btn-primary" data-act="weak">🎯 Eksiklerimi Çalış</button></div>`;
        showScreen('tomerStatsScreen');
    }

    // ── olaylar ──
    function onClick(e) {
        const lv = e.target.closest('[data-level]');
        if (lv && !lv.disabled) { openLevel(lv.dataset.level); return; }
        const tp = e.target.closest('[data-topic]');
        if (tp) { showTopic(tp.dataset.topic); return; }
        const op = e.target.closest('[data-opt]');
        if (op && !op.disabled) { answer(+op.dataset.opt); return; }
        const act = e.target.closest('[data-act]')?.dataset.act;
        switch (act) {
            case 'langs': showScreen('languageScreen'); break;
            case 'levels': open(); break;
            case 'level': showLevel(); break;
            case 'words': openWords(); break;
            case 'grammar': showGrammar(); break;
            case 'topic': showTopic(topicId); break;
            case 'start': startTopicTest(); break;
            case 'weak': startWeakTest(); break;
            case 'stats': showStats(); break;
            case 'next': next(); break;
            case 'cloud-up': uploadToCloud(); break;
            case 'cloud-del': deleteFromCloud(); break;
        }
    }
    function bind() {
        ['tomerScreen', 'tomerLevelScreen', 'tomerGrammarScreen', 'tomerTopicScreen', 'tomerTestScreen', 'tomerStatsScreen']
            .forEach(id => $(id)?.addEventListener('click', onClick));
        // Klavye: test sırasında 1-4 ile şık, Enter ile sonraki
        document.addEventListener('keydown', e => {
            if (!$('tomerTestScreen')?.classList.contains('active') || !test) return;
            if (/^[1-4]$/.test(e.key)) { const b = document.querySelector(`#tomerTestScreen [data-opt="${+e.key - 1}"]`); if (b && !b.disabled) b.click(); }
            else if (e.key === 'Enter') document.querySelector('#tomerTestScreen [data-act="next"]')?.click();
        });
    }
    bind();

    return {
        checkAvailability, open, wordsCsv, isAvailable: () => available, getSource: () => source,
        // geri hareketiyle dönülünce güncel haliyle çiz
        refresh(id) {
            if (!level || !grammar) return false;
            if (id === 'tomerLevelScreen') { showLevel(); return true; }
            if (id === 'tomerGrammarScreen') { showGrammar(); return true; }
            if (id === 'tomerStatsScreen') { showStats(); return true; }
            if (id === 'tomerTopicScreen' && topicId) { showTopic(topicId); return true; }
            return false;
        }
    };
})();

// İçerik var mı? (yerel klasör ya da hesaba özel bulut) Varsa TÖMER kartını aktif et.
// Oturum değişince (giriş/çıkış) yeniden kontrol edilir.
function tomerRefreshCard() {
    const before = TomerModule.isAvailable();
    TomerModule.checkAvailability().then(ok => {
        if (ok === before || typeof renderLanguageCards !== 'function') return;
        renderLanguageCards();
        if (document.getElementById('languageScreen')?.classList.contains('active')) fetchAndShowLangCounts();
    });
}
tomerRefreshCard();
AuthManager.onChange(() => tomerRefreshCard());
