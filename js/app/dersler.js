/* ============================================================
   LUMINA — DERSLERİM MODÜLÜ (kişiye özel ders çalışma ve soru çözme)
   Yalnızca OWNER hesabında görünür. İçerik iki yerden okunur:
   1) data/dersler/ (yerel; GitHub'a gönderilmez — .gitignore)
   2) Firestore "dersler" koleksiyonu (yalnızca OWNER okuyabilir — firestore.rules)
   Akış: Dersler → konu listesi → konu notları → normal sorular → klasik sorular
         → sonuç / yanlışlar → istenildiği zaman tekrar.
   İlerleme: localStorage + Firestore senkronu (progress/dersgr).
============================================================ */
const DerslerModule = (() => {
    const OWNER = 'salpersalih@gmail.com';
    const BASE = './data/dersler/';
    const PROGRESS_CODE = 'dersgr';
    const SCREENS = ['derslerScreen', 'derslerCourseScreen', 'derslerTopicScreen', 'derslerQuizScreen', 'derslerClassicScreen', 'derslerMistakesScreen'];
    const TYPE_LABEL = { mc: 'Çoktan seçmeli', tf: 'Doğru / Yanlış', fill: 'Boşluk doldurma', open: 'Açık uçlu', code: 'Kod yazma', calc: 'Hesaplama / çözüm' };

    let index = null;          // index.json
    let available = false;
    let source = null;         // 'local' | 'cloud'
    let cloudBusy = false;
    const courseCache = {};
    let course = null;         // seçili dersin tam içeriği
    let topicId = null;
    let quiz = null;           // { kind, items:[{q, topic}], i, answers:[] }
    let classic = null;        // { kind, items:[{q, topic}], i, shown, drafts:[], checks:[] }
    // Zorluk seçimi: 0 = tümü, 1 = temel, 2 = orta, 3 = zor (soruların lv alanı; yoksa temel sayılır)
    const LV_NAME = { 1: 'Temel', 2: 'Orta', 3: 'Zor' };
    let level = (() => { try { return +localStorage.getItem('lumina_dr_level') || 0; } catch { return 0; } })();
    const lvOf = q => q.lv || 1;
    const byLevel = arr => level ? arr.filter(q => lvOf(q) === level) : arr;
    const lvCount = (arr, l) => arr.filter(q => lvOf(q) === l).length;

    const $ = id => document.getElementById(id);
    const wrap = id => $(id)?.querySelector('.tm-wrap');
    const isOwner = () => {
        const s = AuthManager.getSession();
        return !!(s && !s.guest && (s.email || '').toLowerCase() === OWNER);
    };

    // ── bulut (Firestore) ──
    function cloudCol() {
        const db = AuthManager.getDb();
        return isOwner() && db ? db.collection('dersler') : null;
    }
    async function cloudGet(id) {
        const col = cloudCol();
        if (!col) throw new Error('Yetkili hesapla giriş yapılmadı');
        const snap = await col.doc(id).get();
        if (!snap.exists) throw new Error('Bulutta yok: ' + id);
        return JSON.parse(snap.data().json);
    }

    async function checkAvailability() {
        const valid = ix => ix && Array.isArray(ix.courses) && ix.courses.some(c => c.topics && c.topics.length);
        index = null; source = null; available = false;
        if (!isOwner()) return false;            // başka hiçbir hesap bu bölümü görmez
        try {
            const r = await fetch(BASE + 'index.json', { cache: 'no-store' });
            if (r.ok) {
                const ix = await r.json();
                if (valid(ix)) { index = ix; source = 'local'; return (available = true); }
            }
        } catch { /* yerelde yok */ }
        try {
            const ix = await cloudGet('index');
            if (valid(ix)) { index = ix; source = 'cloud'; return (available = true); }
        } catch { /* yetki yok ya da yüklenmemiş */ }
        return false;
    }

    async function loadCourse(id) {
        if (courseCache[id]) return courseCache[id];
        let c;
        if (source === 'cloud') c = await cloudGet(id);
        else {
            const r = await fetch(`${BASE}${id}.json`, { cache: 'no-store' });
            if (!r.ok) throw new Error('Ders dosyası okunamadı');
            c = await r.json();
        }
        return (courseCache[id] = c);
    }

    async function uploadToCloud() {
        const col = cloudCol();
        if (!col) { alert(`Önce ${OWNER} hesabıyla giriş yapmalısın.`); return; }
        if (source !== 'local') { alert('Yükleme için uygulamayı kendi bilgisayarında (Baslat.bat) açmalısın.'); return; }
        cloudBusy = true; open();
        try {
            const now = Date.now();
            for (const c of index.courses.filter(x => x.topics.length)) {
                const txt = await (await fetch(`${BASE}${c.id}.json`, { cache: 'no-store' })).text();
                await col.doc(c.id).set({ json: txt, updatedAt: now });
            }
            await col.doc('index').set({ json: JSON.stringify(index), updatedAt: now });
            alert('✅ Ders içerikleri hesabına yüklendi. Canlı sitede bu hesapla giriş yapınca "Derslerim" açılacak.');
        } catch (e) {
            alert(e.code === 'permission-denied'
                ? `⛔ Yetki yok. firestore.rules dosyasındaki "dersler" kuralını Firebase'de yayınladığından ve ${OWNER} ile giriş yaptığından emin ol.`
                : 'Yükleme başarısız: ' + (e.message || e));
        } finally { cloudBusy = false; open(); }
    }

    async function deleteFromCloud() {
        const col = cloudCol();
        if (!col || !confirm('Ders içerikleri buluttan silinsin mi? (İlerleme kayıtların silinmez.)')) return;
        cloudBusy = true; open();
        try {
            const ids = ['index', ...(index ? index.courses.map(c => c.id) : [])];
            await Promise.all(ids.map(id => col.doc(id).delete()));
            alert('Buluttaki ders içerikleri silindi.');
        } catch (e) {
            alert(e.code === 'permission-denied' ? '⛔ Yetki yok.' : 'Silinemedi: ' + (e.message || e));
        } finally {
            cloudBusy = false;
            Object.keys(courseCache).forEach(k => delete courseCache[k]);
            await checkAvailability();
            if (available) open(); else { refreshCard(); showScreen('languageScreen'); }
        }
    }

    // ── ilerleme ──
    const progressKey = () => AuthManager.progressKey(PROGRESS_CODE);
    function loadProgress() {
        try {
            const p = JSON.parse(localStorage.getItem(progressKey()) || 'null');
            if (p && p.v === 1) return p;
        } catch { }
        return { v: 1, notes: {}, topics: {}, qs: {}, classic: {}, sessions: [] };
    }
    function saveProgress(p) {
        const key = progressKey();
        localStorage.setItem(key, JSON.stringify(p));
        SyncManager.touch(key);
        SyncManager.schedulePush(PROGRESS_CODE);
    }
    const tKey = (cid, tid) => `${cid}:${tid}`;
    const qKey = (cid, tid, qid) => `${cid}:${tid}:${qid}`;
    const pct = (c, t) => t ? Math.round(c / t * 100) : null;
    function accClass(acc) {
        if (acc === null || acc === undefined) return 'none';
        return acc >= 80 ? 'good' : acc >= 60 ? 'mid' : 'bad';
    }

    function topicSummary(p, cid, t) {
        const s = p.topics[tKey(cid, t.id)];
        let graded = 0, ok = 0;
        (t.k ? Array.from({ length: t.k }, (_, i) => 'k' + (i + 1)) : (t.classic || []).map(q => q.id)).forEach(id => {
            const g = p.classic[qKey(cid, t.id, id)];
            if (g) { graded++; if (g.g === 'ok') ok++; else if (g.g === 'part') ok += 0.5; }
        });
        return {
            read: !!p.notes[tKey(cid, t.id)],
            acc: s ? pct(s.c, s.t) : null, att: s ? s.att : 0, best: s ? s.best : 0,
            graded, cacc: graded ? Math.round(ok / graded * 100) : null
        };
    }
    function courseSummary(p, c) {
        let read = 0, cc = 0, tt = 0;
        c.topics.forEach(t => {
            if (p.notes[tKey(c.id, t.id)]) read++;
            const s = p.topics[tKey(c.id, t.id)];
            if (s) { cc += s.c; tt += s.t; }
        });
        return { read, acc: pct(cc, tt), solved: tt };
    }

    // ── metin biçimlendirme (notlar ve model cevaplar) ──
    function inline(text) {
        // satır içi kodu önce yer tutucuya al (kalın/italik kodun içine ya da etrafına taşabilsin)
        const codes = [];
        const s = String(text).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
        return escapeHtml(s)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>')
            .replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${escapeHtml(codes[+i])}</code>`);
    }
    function renderRich(lines) {
        let html = '', list = null, table = null, i = 0;
        const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
        const closeTable = () => {
            if (!table) return;
            const [head, ...body] = table;
            html += `<div class="dr-table-wrap"><table class="dr-table"><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead>`
                + `<tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
            table = null;
        };
        while (i < lines.length) {
            const line = lines[i];
            if (line.startsWith('```')) {
                closeList(); closeTable();
                const lang = line.slice(3).trim();
                const code = [];
                i++;
                while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
                i++;
                html += `<pre class="dr-code"${lang ? ` data-lang="${escapeHtml(lang)}"` : ''}><code>${escapeHtml(code.join('\n'))}</code></pre>`;
                continue;
            }
            if (line.startsWith('|')) {
                closeList();
                const cells = line.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());
                (table || (table = [])).push(cells);
                i++; continue;
            }
            closeTable();
            const num = line.match(/^(\d+)\. (.*)$/);
            if (line.startsWith('- ') || num) {
                const want = num ? 'ol' : 'ul';
                if (list !== want) { closeList(); html += `<${want}>`; list = want; }
                html += `<li>${inline(num ? num[2] : line.slice(2))}</li>`;
                i++; continue;
            }
            closeList();
            if (line.startsWith('### ')) html += `<h4>${inline(line.slice(4))}</h4>`;
            else if (line.startsWith('## ')) html += `<h3>${inline(line.slice(3))}</h3>`;
            else if (line.startsWith('> ')) html += `<div class="dr-key">${inline(line.slice(2))}</div>`;
            else if (line.trim()) html += `<p>${inline(line)}</p>`;
            i++;
        }
        closeList(); closeTable();
        return html;
    }
    const rich = text => renderRich(String(text).split('\n'));
    const qText = q => inline(q).replace(/___/g, '<span class="tm-blank">____</span>');

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
    }
    const norm = s => String(s).toLocaleLowerCase('tr-TR').replace(/[−–—]/g, '-').replace(/×/g, '*').replace(/\s+/g, '').replace(/[.;,!]+$/, '');
    function levelBar(t) {
        const list = t ? t.normal.concat(t.classic) : course.topics.flatMap(x => x.normal.concat(x.classic));
        const chip = (l, label) => `<button type="button" class="dr-lv${level === l ? ' active' : ''}" data-lv="${l}">${label}<small>${l ? lvCount(list, l) : list.length}</small></button>`;
        return `<div class="dr-lvbar" role="group" aria-label="Zorluk seviyesi"><span>Seviye</span>${chip(0, 'Tümü')}${chip(1, 'Temel')}${chip(2, 'Orta')}${chip(3, 'Zor')}</div>`;
    }
    const lvChip = q => `<span class="dr-lvchip lv${lvOf(q)}">${LV_NAME[lvOf(q)]}</span>`;
    const backBtn = (label, act) => `<button type="button" class="tm-back" data-act="${act}">← ${escapeHtml(label)}</button>`;
    const topicOf = id => course.topics.find(t => t.id === id);
    const metaLine = (topic, extra) => `<p class="tm-qmeta dr-meta"><span class="dr-chip">${escapeHtml(course.code)}</span> Konu ${escapeHtml(topic.id)}: ${escapeHtml(topic.title)}${extra ? ' · ' + extra : ''}</p>`;

    // ── ekran 1: ders listesi ──
    async function open() {
        if (!available && !(await checkAvailability())) return;
        document.body.classList.remove(...LANGUAGES.filter(l => l.theme).map(l => `theme-${l.theme}`));
        document.body.classList.add('theme-dersler');
        const p = loadProgress();
        wrap('derslerScreen').innerHTML = `
          ${backBtn('Ana menü', 'langs')}
          <header class="tm-head"><h1>🎓 Derslerim</h1><p>5. dönem · ders notları, normal ve klasik sorular</p></header>
          <div class="dr-courses">
            ${index.courses.map(c => {
                const off = !c.topics.length;
                const nTot = c.topics.reduce((a, t) => a + t.n + t.k, 0);
                let sum = '';
                if (!off) {
                    let read = 0, cc = 0, tt = 0;
                    c.topics.forEach(t => { if (p.notes[tKey(c.id, t.id)]) read++; const s = p.topics[tKey(c.id, t.id)]; if (s) { cc += s.c; tt += s.t; } });
                    const acc = pct(cc, tt);
                    sum = `<span class="dr-course-prog"><i style="width:${Math.round(read / c.topics.length * 100)}%"></i></span>
                      <span class="dr-course-meta">${read}/${c.topics.length} konu okundu${acc === null ? '' : ` · <b class="tm-pill ${accClass(acc)}">%${acc}</b>`}</span>`;
                }
                return `
                <button type="button" class="dr-course${off ? ' is-off' : ''}" data-course="${escapeHtml(c.id)}"${off ? ' disabled' : ''}>
                  <span class="dr-course-icon">${c.icon || '📘'}</span>
                  <span class="dr-course-body">
                    <small>${escapeHtml(c.code)}</small>
                    <strong>${escapeHtml(c.title)}</strong>
                    <span class="dr-course-meta">${off ? 'Kaynak eklenince açılacak' : `${c.topics.length} konu · ${nTot} soru`}</span>
                    ${sum}
                  </span>
                </button>`;
            }).join('')}
          </div>
          ${cloudPanel()}`;
        showScreen('derslerScreen');
    }

    function cloudPanel() {
        const s = AuthManager.getSession();
        if (source === 'cloud') {
            return `<section class="tm-card tm-cloud"><h3>☁️ Hesabına özel içerik</h3>
              <p>Bu bölüm yalnızca ${escapeHtml(s.email || OWNER)} hesabında görünür; başka hesaplar ve GitHub erişemez.</p>
              <div class="tm-actions"><button type="button" class="btn-secondary" data-act="cloud-del"${cloudBusy ? ' disabled' : ''}>🗑 Buluttan Sil</button></div></section>`;
        }
        return `<section class="tm-card tm-cloud"><h3>☁️ Canlı sitede de kullan</h3>
          <p>İçerik şu an sadece bu bilgisayarda. Hesabına yüklersen canlı sitede yalnızca <strong>${OWNER}</strong> ile giriş yapınca görünür; GitHub'a gitmez.</p>
          <div class="tm-actions">
            <button type="button" class="btn-primary" data-act="cloud-up"${cloudBusy ? ' disabled' : ''}>${cloudBusy ? 'Yükleniyor…' : '☁️ Hesabıma Yükle'}</button>
            <button type="button" class="btn-secondary" data-act="cloud-del"${cloudBusy ? ' disabled' : ''}>🗑 Buluttan Sil</button>
          </div></section>`;
    }

    // ── ekran 2: konu listesi ──
    async function openCourse(id) {
        try { course = await loadCourse(id); }
        catch (e) { alert('Ders içeriği yüklenemedi: ' + e.message); return; }
        showCourse();
    }

    function showCourse() {
        const p = loadProgress();
        const cs = courseSummary(p, course);
        const mistakes = collectMistakes(p);
        wrap('derslerCourseScreen').innerHTML = `
          ${backBtn('Dersler', 'courses')}
          <header class="tm-head"><h1>${course.icon || ''} ${escapeHtml(course.title)}</h1><p>${escapeHtml(course.code)} · konular kaynaktaki sırayla</p></header>
          <div class="tm-kpis">
            <div class="tm-kpi"><b>${cs.read}/${course.topics.length}</b><span>Okunan konu</span></div>
            <div class="tm-kpi"><b>${cs.acc === null ? '—' : '%' + cs.acc}</b><span>Normal soru doğruluğu</span></div>
            <div class="tm-kpi"><b>${cs.solved}</b><span>Çözülen soru</span></div>
            <div class="tm-kpi"><b>${mistakes.normal.length + mistakes.classic.length}</b><span>Tekrar edilecek</span></div>
          </div>
          ${levelBar(null)}
          <div class="tm-actions">
            <button type="button" class="btn-primary" data-act="mistakes">🎯 Yanlışlarım</button>
            <button type="button" class="btn-secondary" data-act="mixed">🔀 Karışık Test${level ? ' · ' + LV_NAME[level] : ''} (tüm konular)</button>
          </div>
          <section class="dr-topics">
            ${course.topics.map(t => {
                const s = topicSummary(p, course.id, t);
                return `
                <button type="button" class="tm-topic dr-topic" data-topic="${escapeHtml(t.id)}">
                  <span class="tm-topic-code">${escapeHtml(t.id)}</span>
                  <span class="tm-topic-name"><strong>${escapeHtml(t.title)}</strong>
                    <small>${escapeHtml(t.src)} · ${byLevel(t.normal).length} normal + ${byLevel(t.classic).length} klasik soru</small></span>
                  <span class="dr-topic-pills">
                    <span class="tm-pill ${s.read ? 'good' : ''}" title="Not">${s.read ? '📖 ✓' : '📖'}</span>
                    <span class="tm-pill ${accClass(s.acc)}" title="Normal sorular">${s.acc === null ? 'Yeni' : '%' + s.acc}</span>
                    ${s.graded ? `<span class="tm-pill ${accClass(s.cacc)}" title="Klasik">✍ ${s.graded}/${t.classic.length}</span>` : ''}
                  </span>
                </button>`;
            }).join('')}
          </section>`;
        showScreen('derslerCourseScreen');
    }

    // ── ekran 3: konu notları ──
    function showTopic(id) {
        const t = topicOf(id);
        if (!t) return;
        topicId = id;
        const p = loadProgress();
        if (!p.notes[tKey(course.id, id)]) { p.notes[tKey(course.id, id)] = Date.now(); saveProgress(p); }
        const s = topicSummary(p, course.id, t);
        const i = course.topics.indexOf(t);
        const prev = course.topics[i - 1], nxt = course.topics[i + 1];
        wrap('derslerTopicScreen').innerHTML = `
          ${backBtn('Konular', 'course')}
          <header class="tm-head"><p class="dr-crumb">${escapeHtml(course.code)} · ${escapeHtml(course.title)} · Konu ${escapeHtml(t.id)}</p>
            <h1>${escapeHtml(t.title)}</h1><p class="dr-src">📄 Kaynak: ${escapeHtml(t.src)}</p></header>
          ${s.acc !== null || s.graded ? `<div class="tm-topic-stat">
              ${s.acc !== null ? `<span class="tm-pill ${accClass(s.acc)}">Normal %${s.acc}</span><span>${s.att} deneme · en iyi %${s.best}</span>` : ''}
              ${s.graded ? `<span class="tm-pill ${accClass(s.cacc)}">Klasik ${s.graded}/${t.classic.length} değerlendirildi</span>` : ''}</div>` : ''}
          ${levelBar(t)}
          <div class="tm-actions dr-sticky">
            <button type="button" class="btn-primary" data-act="quiz">✅ Normal Sorular (${byLevel(t.normal).length})</button>
            <button type="button" class="btn-secondary" data-act="classic">✍ Klasik Sorular (${byLevel(t.classic).length})</button>
          </div>
          <article class="tm-notes dr-notes">${renderRich(t.notes)}</article>
          <div class="tm-actions">
            <button type="button" class="btn-primary" data-act="quiz">✅ Normal Soruları Çöz</button>
            <button type="button" class="btn-secondary" data-act="classic">✍ Klasik Sorulara Geç</button>
          </div>
          <div class="dr-pager">
            ${prev ? `<button type="button" class="tm-back" data-topic="${escapeHtml(prev.id)}">← ${escapeHtml(prev.id)}. ${escapeHtml(prev.title)}</button>` : '<span></span>'}
            ${nxt ? `<button type="button" class="tm-back" data-topic="${escapeHtml(nxt.id)}">${escapeHtml(nxt.id)}. ${escapeHtml(nxt.title)} →</button>` : ''}
          </div>`;
        showScreen('derslerTopicScreen');
        window.scrollTo(0, 0);
    }

    // ── ekran 4: normal sorular (çoktan seçmeli, D/Y, boşluk) ──
    function startQuiz(kind, items) {
        if (!items.length) { alert('Bu bölümde çözülecek soru yok.'); return; }
        quiz = { kind, items: items.map(x => ({ ...x, opts: x.q.t === 'mc' ? shuffle(x.q.o) : null })), i: 0, answers: [] };
        renderQuizQ();
        showScreen('derslerQuizScreen');
    }
    const topicItems = t => byLevel(t.normal).map(q => ({ q, topic: t.id }));
    function startTopicQuiz() { startQuiz('topic', shuffle(topicItems(topicOf(topicId)))); }
    function startMixed() {
        const all = course.topics.flatMap(t => shuffle(topicItems(t)).slice(0, 5));
        startQuiz('mixed', shuffle(all).slice(0, 25));
    }
    function startMistakeQuiz() {
        const m = collectMistakes(loadProgress());
        startQuiz('mistakes', shuffle(m.normal));
    }

    function correctText(q) {
        if (q.t === 'mc') return q.o[0];
        if (q.t === 'tf') return q.a ? 'Doğru' : 'Yanlış';
        return q.a.join(' / ');
    }

    function renderQuizQ() {
        const it = quiz.items[quiz.i];
        const q = it.q, t = topicOf(it.topic);
        const n = quiz.items.length;
        const ans = quiz.answers[quiz.i];
        let body = '';
        if (q.t === 'mc') {
            body = `<div class="tm-options">${it.opts.map((o, k) => {
                let cls = '';
                if (ans) cls = o === q.o[0] ? ' correct' : (o === ans.choice ? ' wrong' : ' dim');
                return `<button type="button" class="tm-option dr-option${cls}" data-opt="${k}"${ans ? ' disabled' : ''}><b>${'ABCD'[k]}</b> ${inline(o)}</button>`;
            }).join('')}</div>`;
        } else if (q.t === 'tf') {
            body = `<div class="tm-options dr-tf">${[true, false].map((v, k) => {
                let cls = '';
                if (ans) cls = v === q.a ? ' correct' : (v === ans.choice ? ' wrong' : ' dim');
                return `<button type="button" class="tm-option${cls}" data-tf="${v ? 1 : 0}"${ans ? ' disabled' : ''}>${v ? '✔ Doğru' : '✘ Yanlış'}</button>`;
            }).join('')}</div>`;
        } else {
            body = `<form class="dr-fill" data-form="fill">
                <input type="text" id="drFillInput" autocomplete="off" spellcheck="false" placeholder="Cevabını yaz…" value="${ans ? escapeHtml(ans.choice) : ''}"${ans ? ' disabled' : ''}>
                ${ans ? '' : '<button type="submit" class="btn-primary">Kontrol Et</button><button type="button" class="btn-secondary" data-act="fill-skip">Bilmiyorum</button>'}
              </form>`;
        }
        wrap('derslerQuizScreen').innerHTML = `
          ${backBtn(quiz.kind === 'topic' ? 'Konu notları' : 'Konular', quiz.kind === 'topic' ? 'topic' : 'course')}
          <div class="tm-progress"><div style="width:${Math.round(quiz.i / n * 100)}%"></div></div>
          ${metaLine(t, `${lvChip(q)} ${TYPE_LABEL[q.t]} · Soru ${quiz.i + 1}/${n}`)}
          <h2 class="tm-question dr-question">${qText(q.q)}</h2>
          ${body}
          ${ans ? `
            <div class="tm-feedback ${ans.ok ? 'ok' : 'no'}">
              <strong>${ans.ok ? '✅ Doğru!' : `❌ Yanlış. Doğru cevap: ${inline(correctText(q))}`}</strong>
              <p>${inline(q.ex)}</p>
              ${!ans.ok && q.t === 'fill' && ans.choice ? '<button type="button" class="tm-mini dr-override" data-act="fill-ok">Yazdığım da doğru, doğru say</button>' : ''}
            </div>
            <div class="tm-actions"><button type="button" class="btn-primary" data-act="next">${quiz.i + 1 < n ? 'Sonraki Soru →' : 'Sonucu Gör'}</button></div>` : ''}`;
        if (q.t === 'fill' && !ans) setTimeout(() => $('drFillInput')?.focus(), 30);
    }

    function record(it, ok) {
        const p = loadProgress();
        const tk = tKey(course.id, it.topic);
        const ts = p.topics[tk] || (p.topics[tk] = { att: 0, c: 0, t: 0, best: 0, last: 0, lastAt: 0 });
        ts.t++; if (ok) ts.c++;
        const qk = qKey(course.id, it.topic, it.q.id);
        const qs = p.qs[qk] || (p.qs[qk] = { c: 0, t: 0 });
        qs.t++; if (ok) qs.c++; qs.ok = ok; qs.at = Date.now();
        saveProgress(p);
    }
    function unrecordWrong(it) {   // "doğru say" düzeltmesi
        const p = loadProgress();
        const ts = p.topics[tKey(course.id, it.topic)];
        if (ts) ts.c++;
        const qs = p.qs[qKey(course.id, it.topic, it.q.id)];
        if (qs) { qs.c++; qs.ok = true; }
        saveProgress(p);
    }

    function answer(choice) {
        const it = quiz.items[quiz.i];
        if (quiz.answers[quiz.i]) return;
        const q = it.q;
        let ok;
        if (q.t === 'mc') { choice = it.opts[choice]; ok = choice === q.o[0]; }
        else if (q.t === 'tf') ok = choice === q.a;
        else ok = !!choice && q.a.some(a => norm(a) === norm(choice));
        quiz.answers[quiz.i] = { choice, ok };
        record(it, ok);
        renderQuizQ();
    }

    function nextQ() {
        if (quiz.i + 1 < quiz.items.length) { quiz.i++; renderQuizQ(); return; }
        finishQuiz();
    }

    function finishQuiz() {
        const n = quiz.items.length;
        const c = quiz.answers.filter(a => a && a.ok).length;
        const score = pct(c, n);
        const p = loadProgress();
        const now = Date.now();
        [...new Set(quiz.items.map(x => x.topic))].forEach(tid => {
            const idx = quiz.items.map((x, i) => x.topic === tid ? i : -1).filter(i => i >= 0);
            const cc = idx.filter(i => quiz.answers[i] && quiz.answers[i].ok).length;
            const s = p.topics[tKey(course.id, tid)];
            if (!s || !idx.length) return;
            const acc = pct(cc, idx.length);
            s.att++; s.last = acc; s.best = Math.max(s.best || 0, acc); s.lastAt = now;
        });
        p.sessions.push({ at: now, c: course.id, kind: quiz.kind, ok: c, t: n });
        if (p.sessions.length > 300) p.sessions = p.sessions.slice(-300);
        saveProgress(p);

        const wrong = quiz.items.map((it, i) => ({ it, a: quiz.answers[i] })).filter(x => x.a && !x.a.ok);
        const msg = score >= 90 ? 'Harika! Bu konuya hâkimsin. 🎉'
            : score >= 70 ? 'İyi gidiyorsun; yanlışlara bir göz at. 👍'
                : score >= 50 ? 'Eksiklerin var. Notlara dönüp yanlışları tekrar çöz. 💪'
                    : 'Bu konuyu yeniden çalışmalısın: önce notları oku, sonra tekrar dene. 📖';
        wrap('derslerQuizScreen').innerHTML = `
          <header class="tm-head"><p class="dr-crumb">${escapeHtml(course.code)} · ${quiz.kind === 'topic' ? 'Konu ' + escapeHtml(topicId) + ': ' + escapeHtml(topicOf(topicId).title) : quiz.kind === 'mixed' ? 'Karışık test' : 'Yanlışlarım'}</p>
            <h1>Sonuç: %${score}</h1><p>${c} / ${n} doğru · ${escapeHtml(msg)}</p></header>
          <div class="tm-score-ring ${accClass(score)}" style="--p:${score}"><span>%${score}</span></div>
          ${wrong.length ? `
            <section class="tm-card"><h3>Yanlış cevapların (${wrong.length})</h3>
              ${wrong.map(({ it, a }) => {
                  const t = topicOf(it.topic);
                  return `<div class="tm-review">
                    <p class="dr-review-meta">${escapeHtml(course.code)} · Konu ${escapeHtml(t.id)}: ${escapeHtml(t.title)} · ${TYPE_LABEL[it.q.t]}</p>
                    <p class="tm-review-q">${qText(it.q.q)}</p>
                    <p><span class="tm-bad">Senin cevabın: ${a.choice === '' || a.choice === undefined ? '—' : inline(it.q.t === 'tf' ? (a.choice ? 'Doğru' : 'Yanlış') : a.choice)}</span> · <span class="tm-good">Doğrusu: ${inline(correctText(it.q))}</span></p>
                    <p class="tm-review-ex">${inline(it.q.ex)}</p>
                    <button type="button" class="tm-mini" data-topic="${escapeHtml(t.id)}">📖 Konu notları</button>
                  </div>`;
              }).join('')}
            </section>` : '<section class="tm-card"><h3>🎉 Hiç yanlışın yok!</h3></section>'}
          <div class="tm-actions">
            ${wrong.length ? '<button type="button" class="btn-primary" data-act="retry-wrong">🔁 Sadece Yanlışları Tekrar Çöz</button>' : ''}
            <button type="button" class="btn-secondary" data-act="retry">🔁 Hepsini Tekrar Çöz</button>
            ${quiz.kind === 'topic' ? '<button type="button" class="btn-secondary" data-act="classic">✍ Klasik Sorulara Geç</button><button type="button" class="btn-secondary" data-act="topic">📖 Konu Notları</button>' : ''}
            <button type="button" class="btn-secondary" data-act="course">Konular</button>
          </div>`;
        quiz.wrong = wrong.map(x => x.it);
        window.scrollTo(0, 0);
    }

    // ── ekran 5: klasik sorular (açık uçlu, kod, hesaplama) ──
    function startClassic(kind, items) {
        if (!items.length) { alert('Bu bölümde klasik soru yok.'); return; }
        classic = { kind, items, i: 0, shown: [], drafts: [], checks: [] };
        renderClassicQ();
        showScreen('derslerClassicScreen');
    }
    function startTopicClassic() { const t = topicOf(topicId); startClassic('topic', byLevel(t.classic).map(q => ({ q, topic: t.id }))); }

    function renderClassicQ() {
        const it = classic.items[classic.i];
        const q = it.q, t = topicOf(it.topic);
        const n = classic.items.length;
        const shown = classic.shown[classic.i];
        const checks = classic.checks[classic.i] || [];
        const g = loadProgress().classic[qKey(course.id, it.topic, q.id)];
        wrap('derslerClassicScreen').innerHTML = `
          ${backBtn(classic.kind === 'topic' ? 'Konu notları' : 'Yanlışlarım', classic.kind === 'topic' ? 'topic' : 'mistakes')}
          <div class="tm-progress"><div style="width:${Math.round(classic.i / n * 100)}%"></div></div>
          ${metaLine(t, `${lvChip(q)} Klasik · ${TYPE_LABEL[q.t]} · Soru ${classic.i + 1}/${n}${g ? ` · önceki değerlendirmen: ${gradeLabel(g.g)}` : ''}`)}
          <section class="tm-card dr-classic-q"><div class="dr-rich">${rich(q.q)}</div></section>
          <label class="dr-label" for="drClassicInput">Cevabın ${q.t === 'code' ? '(kodu buraya yaz)' : q.t === 'calc' ? '(adım adım çözüm)' : ''}</label>
          <textarea id="drClassicInput" class="dr-textarea${q.t === 'code' ? ' is-code' : ''}" rows="${q.t === 'code' ? 10 : 6}" spellcheck="${q.t === 'code' ? 'false' : 'true'}" placeholder="Önce kendi cevabını yaz, sonra model cevapla karşılaştır.">${escapeHtml(classic.drafts[classic.i] || '')}</textarea>
          ${shown ? `
            <section class="tm-card dr-model"><h3>📘 Model cevap</h3><div class="dr-rich">${rich(q.a)}</div></section>
            <section class="tm-card"><h3>🔑 Kontrol listesi — cevabında bunlar var mı?</h3>
              <ul class="dr-checks">${q.k.map((k, j) => `<li><label><input type="checkbox" data-chk="${j}"${checks[j] ? ' checked' : ''}> <span>${inline(k)}</span></label></li>`).join('')}</ul>
            </section>
            <section class="tm-card"><h3>Kendini değerlendir</h3>
              <div class="dr-grades">
                <button type="button" class="dr-grade ok${g && g.g === 'ok' ? ' active' : ''}" data-grade="ok">✅ Doğru</button>
                <button type="button" class="dr-grade part${g && g.g === 'part' ? ' active' : ''}" data-grade="part">🟡 Kısmen</button>
                <button type="button" class="dr-grade no${g && g.g === 'no' ? ' active' : ''}" data-grade="no">❌ Yanlış</button>
              </div>
            </section>` : `
            <div class="tm-actions"><button type="button" class="btn-primary" data-act="reveal">👁 Model Cevabı ve Anahtar Noktaları Göster</button></div>`}
          <div class="dr-pager">
            ${classic.i > 0 ? '<button type="button" class="tm-back" data-act="cprev">← Önceki</button>' : '<span></span>'}
            <button type="button" class="tm-back" data-act="cnext">${classic.i + 1 < n ? 'Sonraki →' : 'Bitir ✓'}</button>
          </div>`;
    }
    const gradeLabel = g => g === 'ok' ? 'Doğru' : g === 'part' ? 'Kısmen' : 'Yanlış';

    function saveDraft() {
        const el = $('drClassicInput');
        if (el && classic) classic.drafts[classic.i] = el.value;
    }
    function grade(gv) {
        const it = classic.items[classic.i];
        const p = loadProgress();
        p.classic[qKey(course.id, it.topic, it.q.id)] = { g: gv, at: Date.now() };
        saveProgress(p);
        saveDraft();
        renderClassicQ();
    }
    function classicMove(d) {
        saveDraft();
        const ni = classic.i + d;
        if (ni < 0) return;
        if (ni >= classic.items.length) { finishClassic(); return; }
        classic.i = ni; renderClassicQ(); window.scrollTo(0, 0);
    }
    function finishClassic() {
        const p = loadProgress();
        const rows = classic.items.map(it => ({ it, g: p.classic[qKey(course.id, it.topic, it.q.id)] }));
        const graded = rows.filter(r => r.g);
        const pts = graded.reduce((a, r) => a + (r.g.g === 'ok' ? 1 : r.g.g === 'part' ? .5 : 0), 0);
        const score = graded.length ? Math.round(pts / graded.length * 100) : null;
        wrap('derslerClassicScreen').innerHTML = `
          <header class="tm-head"><p class="dr-crumb">${escapeHtml(course.code)} · Klasik sorular</p>
            <h1>${score === null ? 'Klasik sorular bitti' : 'Öz değerlendirme: %' + score}</h1>
            <p>${graded.length}/${rows.length} soru değerlendirildi</p></header>
          <section class="tm-card"><h3>Özet</h3>
            ${rows.map(({ it, g }, i) => {
                const t = topicOf(it.topic);
                return `<button type="button" class="tm-topic slim" data-cgo="${i}">
                  <span class="tm-topic-code">${i + 1}</span>
                  <span class="tm-topic-name"><strong>${inline(it.q.q.split('\n')[0].slice(0, 140))}</strong><small>${escapeHtml(course.code)} · Konu ${escapeHtml(t.id)}: ${escapeHtml(t.title)} · ${TYPE_LABEL[it.q.t]}</small></span>
                  <span class="tm-pill ${g ? (g.g === 'ok' ? 'good' : g.g === 'part' ? 'mid' : 'bad') : ''}">${g ? gradeLabel(g.g) : '—'}</span></button>`;
            }).join('')}
          </section>
          <div class="tm-actions">
            ${classic.kind === 'topic' ? '<button type="button" class="btn-primary" data-act="topic">📖 Konu Notları</button><button type="button" class="btn-secondary" data-act="quiz">✅ Normal Sorular</button>' : '<button type="button" class="btn-primary" data-act="mistakes">🎯 Yanlışlarım</button>'}
            <button type="button" class="btn-secondary" data-act="course">Konular</button>
          </div>`;
        window.scrollTo(0, 0);
    }

    // ── ekran 6: yanlışlarım ──
    function collectMistakes(p) {
        const normal = [], cl = [];
        course.topics.forEach(t => {
            t.normal.forEach(q => { const s = p.qs[qKey(course.id, t.id, q.id)]; if (s && s.ok === false) normal.push({ q, topic: t.id }); });
            t.classic.forEach(q => { const g = p.classic[qKey(course.id, t.id, q.id)]; if (g && g.g !== 'ok') cl.push({ q, topic: t.id, g: g.g }); });
        });
        return { normal, classic: cl };
    }
    function showMistakes() {
        const m = collectMistakes(loadProgress());
        const byTopic = {};
        m.normal.forEach(x => (byTopic[x.topic] = byTopic[x.topic] || []).push(x));
        wrap('derslerMistakesScreen').innerHTML = `
          ${backBtn('Konular', 'course')}
          <header class="tm-head"><p class="dr-crumb">${escapeHtml(course.code)} · ${escapeHtml(course.title)}</p><h1>🎯 Yanlışlarım</h1>
            <p>Son denemede yanlış yaptığın normal sorular ve "Kısmen/Yanlış" işaretlediğin klasik sorular. Doğru çözdükçe listeden düşer.</p></header>
          <div class="tm-actions">
            <button type="button" class="btn-primary" data-act="mistake-quiz"${m.normal.length ? '' : ' disabled'}>✅ Yanlış Normal Soruları Çöz (${m.normal.length})</button>
            <button type="button" class="btn-secondary" data-act="mistake-classic"${m.classic.length ? '' : ' disabled'}>✍ Klasikleri Tekrar Et (${m.classic.length})</button>
          </div>
          ${!m.normal.length && !m.classic.length ? '<section class="tm-card"><h3>Tekrar edilecek soru yok 🎉</h3><p class="tm-empty">Konu testlerini çözdükçe yanlışların burada toplanır.</p></section>' : ''}
          ${Object.keys(byTopic).map(tid => {
              const t = topicOf(tid);
              return `<section class="tm-card"><h3>Konu ${escapeHtml(t.id)}: ${escapeHtml(t.title)} <small class="dr-count">${byTopic[tid].length} soru</small></h3>
                ${byTopic[tid].map(({ q }) => `<div class="tm-review">
                  <p class="dr-review-meta">${escapeHtml(course.code)} · ${TYPE_LABEL[q.t]}</p>
                  <p class="tm-review-q">${qText(q.q)}</p>
                  <p><span class="tm-good">Doğrusu: ${inline(correctText(q))}</span></p>
                  <p class="tm-review-ex">${inline(q.ex)}</p></div>`).join('')}
                <div class="tm-actions" style="justify-content:flex-start"><button type="button" class="tm-mini" data-topic="${escapeHtml(t.id)}">📖 Konu notları</button></div>
              </section>`;
          }).join('')}
          ${m.classic.length ? `<section class="tm-card"><h3>Klasik sorular</h3>
              ${m.classic.map(({ q, topic, g }) => { const t = topicOf(topic); return `<div class="tm-review">
                <p class="dr-review-meta">${escapeHtml(course.code)} · Konu ${escapeHtml(t.id)}: ${escapeHtml(t.title)} · ${TYPE_LABEL[q.t]} · <b class="${g === 'part' ? 'tm-warn' : 'tm-bad'}">${gradeLabel(g)}</b></p>
                <p class="tm-review-q">${inline(q.q.split('\n')[0])}</p></div>`; }).join('')}
            </section>` : ''}`;
        showScreen('derslerMistakesScreen');
    }

    // ── olaylar ──
    function onClick(e) {
        const cb = e.target.closest('[data-course]');
        if (cb && !cb.disabled) { openCourse(cb.dataset.course); return; }
        const tp = e.target.closest('[data-topic]');
        if (tp) { showTopic(tp.dataset.topic); return; }
        const op = e.target.closest('[data-opt]');
        if (op && !op.disabled) { answer(+op.dataset.opt); return; }
        const tf = e.target.closest('[data-tf]');
        if (tf && !tf.disabled) { answer(tf.dataset.tf === '1'); return; }
        const lvb = e.target.closest('[data-lv]');
        if (lvb) {
            level = +lvb.dataset.lv;
            try { localStorage.setItem('lumina_dr_level', String(level)); } catch { }
            const cur = document.querySelector('.screen.active')?.id;
            if (cur === 'derslerTopicScreen' && topicId) showTopic(topicId); else showCourse();
            return;
        }
        const gr = e.target.closest('[data-grade]');
        if (gr) { grade(gr.dataset.grade); return; }
        const cg = e.target.closest('[data-cgo]');
        if (cg) { classic.i = +cg.dataset.cgo; renderClassicQ(); window.scrollTo(0, 0); return; }
        const chk = e.target.closest('[data-chk]');
        if (chk) { (classic.checks[classic.i] = classic.checks[classic.i] || [])[+chk.dataset.chk] = chk.checked; return; }
        const act = e.target.closest('[data-act]')?.dataset.act;
        switch (act) {
            case 'langs': showScreen('languageScreen'); break;
            case 'courses': open(); break;
            case 'course': showCourse(); break;
            case 'topic': showTopic(topicId); break;
            case 'quiz': startTopicQuiz(); break;
            case 'classic': startTopicClassic(); break;
            case 'mixed': startMixed(); break;
            case 'mistakes': showMistakes(); break;
            case 'mistake-quiz': startMistakeQuiz(); break;
            case 'mistake-classic': startClassic('mistakes', collectMistakes(loadProgress()).classic); break;
            case 'next': nextQ(); break;
            case 'retry': startQuiz(quiz.kind, shuffle(quiz.items.map(({ q, topic }) => ({ q, topic })))); break;
            case 'retry-wrong': startQuiz(quiz.kind === 'topic' ? 'topic' : quiz.kind, shuffle(quiz.wrong.map(({ q, topic }) => ({ q, topic })))); break;
            case 'fill-skip': answer(''); break;
            case 'fill-ok': {
                const a = quiz.answers[quiz.i];
                if (a && !a.ok) { a.ok = true; unrecordWrong(quiz.items[quiz.i]); renderQuizQ(); }
                break;
            }
            case 'reveal': saveDraft(); classic.shown[classic.i] = true; renderClassicQ(); break;
            case 'cprev': classicMove(-1); break;
            case 'cnext': classicMove(1); break;
            case 'cloud-up': uploadToCloud(); break;
            case 'cloud-del': deleteFromCloud(); break;
        }
    }
    function onSubmit(e) {
        if (e.target.dataset.form !== 'fill') return;
        e.preventDefault();
        answer(($('drFillInput')?.value || '').trim());
    }
    function bind() {
        SCREENS.forEach(id => { $(id)?.addEventListener('click', onClick); $(id)?.addEventListener('submit', onSubmit); });
        $('derslerClassicScreen')?.addEventListener('input', e => { if (e.target.id === 'drClassicInput') saveDraft(); });
        // Klavye: normal sorularda 1-4 şık, D/Y, Enter sonraki
        document.addEventListener('keydown', e => {
            if (!$('derslerQuizScreen')?.classList.contains('active') || !quiz) return;
            if (e.target && e.target.tagName === 'INPUT') return;
            const q = quiz.items[quiz.i]?.q;
            if (q && q.t === 'mc' && /^[1-4]$/.test(e.key)) document.querySelector(`#derslerQuizScreen [data-opt="${+e.key - 1}"]`)?.click();
            else if (q && q.t === 'tf' && /^[dy]$/i.test(e.key)) document.querySelector(`#derslerQuizScreen [data-tf="${/d/i.test(e.key) ? 1 : 0}"]`)?.click();
            else if (e.key === 'Enter') document.querySelector('#derslerQuizScreen [data-act="next"]')?.click();
        });
    }
    bind();

    function refreshCard() {
        if (typeof renderLanguageCards !== 'function') return;
        renderLanguageCards();
        if ($('languageScreen')?.classList.contains('active')) fetchAndShowLangCounts();
    }

    return {
        checkAvailability, open, isAvailable: () => available, getSource: () => source, refreshCard,
        // geri hareketiyle dönülünce güncel haliyle çiz
        refresh(id) {
            if (id === 'derslerScreen' && available) { open(); return true; }
            if (!course) return false;
            if (id === 'derslerCourseScreen') { showCourse(); return true; }
            if (id === 'derslerTopicScreen' && topicId) { showTopic(topicId); return true; }
            if (id === 'derslerMistakesScreen') { showMistakes(); return true; }
            return false;
        }
    };
})();

// Oturum değişince (giriş/çıkış/hesap değişimi) Derslerim kartını yeniden kontrol et.
// Yalnızca yetkili hesapta ve içerik varsa kart görünür; diğer herkes için hiç çizilmez.
function derslerRefreshCard() {
    // Oturum ve bulut bağlantısı açılışta geç hazır olabiliyor: sonuç çıkana kadar birkaç kez dene
    let tries = 0;
    const tick = () => {
        DerslerModule.checkAvailability().then(ok => {
            DerslerModule.refreshCard();
            if (!ok && document.querySelector('.screen.active')?.id.startsWith('dersler')) showScreen('languageScreen');
            if (!ok && tries++ < 10) setTimeout(tick, 2000);
        }).catch(() => { if (tries++ < 10) setTimeout(tick, 2000); });
    };
    tick();
}
derslerRefreshCard();
AuthManager.onChange(() => derslerRefreshCard());
