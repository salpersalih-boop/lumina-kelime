/* ============================================================
   LUMINA — EKRANLAR VE ANA PANEL
   Ekran geçişleri, dil kelime sayıları, dashboard çizimi
============================================================ */

// ── SCREENS MANAGER ──
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (!el) return;
    Nav.recordScreen(id);   // geri hareketi / fare geri tuşu için (js/app/nav.js)
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

    // Dil seçim ekranı açılınca kelime sayılarını güncelle
    if (id === 'languageScreen') {
        fetchAndShowLangCounts();
    }
}

// Dil butonlarındaki kelime sayılarını (API veya CSV'den) günceller
async function fetchAndShowLangCounts() {
    const targets = LANGUAGES.filter(l => !l.soon && !l.hidden && !l.module).map(l => ({ lang: l.key, el: 'langDesc' + langIdSuffix(l.code) }));

    await Promise.all(targets.map(async ({ lang, el }) => {
        const p = document.getElementById(el);
        if (!p) return;
        try {
            const { words } = await fetchLanguageWords(lang);
            const cfg = LANGUAGE_BY_KEY[lang];
            const groups = groupCountFor(words.length);
            if (cfg && words.length > 0) groupCounts[cfg.code] = groups;
            p.textContent = words.length > 0
                ? `${words.length.toLocaleString('tr-TR')} Kelime • ${groups} Grup`
                : 'Veri yüklenemedi';
        } catch (e) {
            p.textContent = 'Veri yüklenemedi';
        }
    }));
}

// ── DİL SEÇİM EKRANI ──
// Kartlar LANGUAGES listesinden üretilir (index.html → #langGrid)
function renderLanguageCards() {
    const grid = document.getElementById('langGrid');
    if (!grid) return;
    const tomerReady = typeof TomerModule !== 'undefined' && TomerModule.isAvailable();
    grid.innerHTML = LANGUAGES.filter(l => !l.hidden).map(lang => {
        const l = lang.code === 'tomer' ? { ...lang, soon: !tomerReady } : lang;
        const sfx = langIdSuffix(l.code);
        const cls = ['lang-btn', l.theme ? `${l.theme}-theme` : '', l.soon ? 'is-soon' : ''].filter(Boolean).join(' ');
        return `
      <button class="${cls}" id="btnLang${sfx}" data-lang="${l.code}"${l.soon ? ' aria-disabled="true"' : ''}>
        <div class="lang-icon-wrap ${l.code}">
          <span class="flag-emoji">${l.flag}</span>
          <span class="flag-code">${escapeHtml(l.short)}</span>
        </div>
        <div class="lang-info">
          <h3>${escapeHtml(l.label)}</h3>
          <p id="langDesc${sfx}">${l.soon ? 'İçerik hazırlanıyor' : l.module ? 'Kelime + Gramer · kişisel çalışma' : 'Yükleniyor...'}</p>
        </div>
        ${l.soon ? '<span class="soon-badge">Yakında</span>' : ''}
      </button>`;
    }).join('');

    grid.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = LANGUAGE_BY_CODE[btn.dataset.lang];
            if (!lang || btn.classList.contains('is-soon')) return;
            if (lang.code === 'tomer') TomerModule.open();
            else selectLanguage(lang.code);
        });
    });
}

async function selectLanguage(code) {
    const lang = LANGUAGE_BY_CODE[code];
    if (!lang || lang.soon) return;
    state.lang = code;
    document.body.classList.remove(...LANGUAGES.filter(l => l.theme).map(l => `theme-${l.theme}`));
    if (lang.theme) document.body.classList.add(`theme-${lang.theme}`);
    await loadLanguageData(lang.key);
    renderDashboard();
}

renderLanguageCards();

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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const logsYesterday = timeLogs.filter(l => l.ts >= startOfYesterday && l.ts < startOfToday).sort((a, b) => b.ts - a.ts);
    const logsWeek = timeLogs.filter(l => l.ts >= startOfWeek).sort((a, b) => b.ts - a.ts);
    const logsMonth = timeLogs.filter(l => l.ts >= startOfMonth).sort((a, b) => b.ts - a.ts);

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
                    <span class="tl-item-en" style="display:flex; align-items:center; gap:6px;">${icon} ${escapeHtml(l.en)}</span>
                    <span class="tl-item-tr">${escapeHtml(l.tr)}</span>
                </div>
                `;
            }).join('');
        }
    };

    renderTLList(logsYesterday, 'tlListYesterday', 'tlCountYesterday');
    renderTLList(logsWeek, 'tlListWeek', 'tlCountWeek');
    renderTLList(logsMonth, 'tlListMonth', 'tlCountMonth');

    // Header title & sub-text updates
    const dashLogoTitle = document.querySelector('#dashboard .logo-title');
    if (dashLogoTitle) {
        dashLogoTitle.textContent = 'Lumina';
    }

    const dashLogoSub = document.querySelector('#dashboard .logo-sub');
    if (dashLogoSub) {
        const sub = (LANGUAGE_BY_CODE[state.lang] || LANGUAGE_BY_CODE.en).sub;
        dashLogoSub.textContent = `${sub} · ${totalGrp} Grup · ${totalWords} Kelime`;
    }

    const modulesSection = document.querySelector('.modules-section');
    if (modulesSection) modulesSection.style.display = '';

    showScreen('dashboard');
}
