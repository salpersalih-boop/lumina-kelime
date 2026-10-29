/* ============================================================
   LUMINA — GÖRÜNÜM VE RENK TEMASI
   - Tema modu: Açık / Koyu / Sistem
   - Hazır paletler (Klasik Siyah dahil), kendi renklerini HEX ile seçme
   - Kişisel renk koleksiyonu (isimlendir, tek tıkla uygula, sil)
   Ayarlar bu cihazın localStorage'ında saklanır.
   Varsayılan palet CSS'teki renkleri kullanır; diğerleri CSS değişkenlerini
   <body> üzerinde ezer (dil temalarının üstüne de uygulanır).
============================================================ */
const ThemeManager = (() => {
    const MODE_KEY = 'lumina_theme';             // 'light' | 'dark' | 'system'
    const PALETTE_KEY = 'lumina_palette';        // { id, a1, a2 }
    const COLLECTION_KEY = 'lumina_palette_collection';
    const MAX_COLLECTION = 30;

    const DEFAULT_PALETTE = { id: 'lumina', name: 'Lumina', a1: '#6366f1', a2: '#3b82f6' };
    const PRESETS = [
        DEFAULT_PALETTE,
        { id: 'klasik', name: 'Klasik Siyah', a1: '#7c6ef7', a2: '#5ec4f5',
          classic: { base: '#0d0f18', surface: '#13162a', card: '#1a1e35', elevated: '#20253f',
                     text: '#e8eaf5', muted: '#6b7280', dim: '#9ca3af' } },
        { id: 'planova', name: 'Planova Klasik', a1: '#f97316', a2: '#06b6d4' },
        { id: 'siber', name: 'Siber Gece', a1: '#a855f7', a2: '#ec4899' },
        { id: 'zumrut', name: 'Zümrüt Doğa', a1: '#10b981', a2: '#06b6d4' },
        { id: 'okyanus', name: 'Derin Okyanus', a1: '#0ea5e9', a2: '#2563eb' },
        { id: 'gul', name: 'Gül & Şafak', a1: '#f43f5e', a2: '#f97316' },
        { id: 'altin', name: 'Altın Kehribar', a1: '#eab308', a2: '#ea580c' }
    ];

    const HEX_RE = /^#[0-9a-f]{6}$/i;
    let mode = 'dark';
    let palette = { ...DEFAULT_PALETTE };
    let collection = [];
    let appliedProps = [];
    let mql = null;

    // ── renk yardımcıları ──
    function normHex(v) {
        v = String(v || '').trim();
        if (/^[0-9a-f]{6}$/i.test(v)) v = '#' + v;
        return HEX_RE.test(v) ? v.toLowerCase() : null;
    }
    function hexToRgb(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
    function hueOf(h) {
        const [r, g, b] = hexToRgb(h).map(x => x / 255);
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        if (d === 0) return 230;
        let hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return Math.round((hue * 60 + 360) % 360);
    }
    const rgba = (h, a) => { const [r, g, b] = hexToRgb(h); return `rgba(${r}, ${g}, ${b}, ${a})`; };

    // ── depolama ──
    function load() {
        try {
            const m = localStorage.getItem(MODE_KEY);
            mode = ['light', 'dark', 'system'].includes(m) ? m : 'dark';
            const p = JSON.parse(localStorage.getItem(PALETTE_KEY) || 'null');
            if (p && normHex(p.a1) && normHex(p.a2)) {
                const preset = PRESETS.find(x => x.id === p.id);
                palette = preset ? { ...preset } : { id: 'custom', name: 'Özel', a1: normHex(p.a1), a2: normHex(p.a2) };
            }
            const c = JSON.parse(localStorage.getItem(COLLECTION_KEY) || '[]');
            collection = Array.isArray(c) ? c.filter(x => x && normHex(x.a1) && normHex(x.a2) && x.name) : [];
        } catch { /* bozuk kayıt: varsayılanlar */ }
    }
    function save() {
        try {
            localStorage.setItem(MODE_KEY, mode);
            localStorage.setItem(PALETTE_KEY, JSON.stringify({ id: palette.id, a1: palette.a1, a2: palette.a2 }));
            localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
        } catch { /* depolama kapalı */ }
    }

    // ── uygulama ──
    const isLight = () => mode === 'light' || (mode === 'system' && window.matchMedia && !window.matchMedia('(prefers-color-scheme: dark)').matches);

    function setProp(name, value) {
        document.body.style.setProperty(name, value, 'important');
        appliedProps.push(name);
    }
    function clearProps() {
        appliedProps.forEach(n => document.body.style.removeProperty(n));
        appliedProps = [];
    }

    function apply() {
        const body = document.body;
        const light = isLight();
        body.classList.toggle('light-theme', light);
        document.querySelector('.theme-icon-dark')?.classList.toggle('hidden', light);
        document.querySelector('.theme-icon-light')?.classList.toggle('hidden', !light);

        clearProps();
        if (palette.id !== 'lumina') {
            const { a1, a2 } = palette;
            setProp('--accent-1', a1);
            setProp('--accent-2', a2);
            setProp('--border', rgba(a1, light ? 0.28 : 0.3));
            setProp('--border-hover', rgba(a1, light ? 0.6 : 0.65));
            setProp('--shadow-glow', `0 0 24px ${rgba(a1, 0.3)}`);

            if (!light) {
                const h = hueOf(a1);
                const c = palette.classic;
                setProp('--bg-base', c ? c.base : `hsl(${h}, 42%, 13%)`);
                setProp('--bg-surface', c ? c.surface : `hsl(${h}, 42%, 17%)`);
                setProp('--bg-card', c ? c.card : `hsl(${h}, 42%, 22%)`);
                setProp('--bg-elevated', c ? c.elevated : `hsl(${h}, 42%, 27%)`);
                setProp('--text-primary', c ? c.text : `hsl(${h}, 60%, 96%)`);
                setProp('--text-muted', c ? c.muted : `hsl(${h}, 30%, 72%)`);
                setProp('--text-dim', c ? c.dim : `hsl(${h}, 35%, 82%)`);
                const k = c ? [0.12, 0.07] : [0.35, 0.28];
                setProp('background-image',
                    `radial-gradient(ellipse 80% 60% at 50% -10%, ${rgba(a1, k[0])} 0%, transparent 70%), ` +
                    `radial-gradient(ellipse 60% 50% at 90% 90%, ${rgba(a2, k[1])} 0%, transparent 60%)`);
            } else {
                setProp('background-image',
                    `radial-gradient(ellipse 80% 60% at 50% -10%, ${rgba(a1, 0.15)} 0%, transparent 70%), ` +
                    `radial-gradient(ellipse 50% 40% at 90% 90%, ${rgba(a2, 0.1)} 0%, transparent 60%)`);
            }
        }
        if (document.getElementById('themeModal')) renderModal();
    }

    function setMode(m) { mode = m; save(); apply(); }
    function setPalette(p) {
        const preset = PRESETS.find(x => x.id === p.id);
        palette = preset ? { ...preset } : { id: 'custom', name: p.name || 'Özel', a1: p.a1, a2: p.a2 };
        save(); apply();
    }

    // ── pencere (modal) ──
    const $ = id => document.getElementById(id);

    function swatches(a1, a2) {
        return `<span class="th-dots"><i style="background:${a1}"></i><i style="background:${a2}"></i></span>`;
    }

    function renderModal() {
        const classicOn = mode === 'dark' && palette.id === 'klasik';
        document.querySelectorAll('#themeModeRow [data-mode]').forEach(b => {
            const m = b.dataset.mode;
            b.classList.toggle('active', m === 'classic' ? classicOn : m === 'dark' ? mode === 'dark' && !classicOn : m === mode);
        });

        $('themePresets').innerHTML = PRESETS.map(p => `
            <button type="button" class="th-card${palette.id === p.id ? ' active' : ''}" data-preset="${p.id}">
              ${swatches(p.a1, p.a2)}<span>${escapeHtml(p.name)}</span>
            </button>`).join('') + (palette.id === 'custom' ? `
            <button type="button" class="th-card active" disabled>${swatches(palette.a1, palette.a2)}<span>Özel Tasarımım ✨</span></button>` : '');

        const syncInput = (colorId, hexId, value) => {
            const color = $(colorId), hex = $(hexId);
            if (document.activeElement !== hex) hex.value = value.toUpperCase();
            color.value = value;
        };
        syncInput('themeColor1', 'themeHex1', palette.a1);
        syncInput('themeColor2', 'themeHex2', palette.a2);

        $('themeCollection').innerHTML = collection.length
            ? collection.map(c => `
                <div class="th-item">
                  <button type="button" class="th-item-apply" data-apply="${escapeHtml(c.id)}">${swatches(c.a1, c.a2)}<span>${escapeHtml(c.name)}</span></button>
                  <button type="button" class="th-item-del" data-del="${escapeHtml(c.id)}" aria-label="Sil">✕</button>
                </div>`).join('')
            : '<p class="th-empty">Henüz kayıtlı rengin yok. Yukarıda renklerini seçip bir isim vererek ekle.</p>';
    }

    function bindModal() {
        $('themeModeRow').addEventListener('click', e => {
            const b = e.target.closest('[data-mode]');
            if (!b) return;
            const m = b.dataset.mode;
            if (m === 'classic') {
                // Tek tuşla eski siyah koyu tema
                mode = 'dark';
                setPalette(PRESETS.find(x => x.id === 'klasik'));
            } else if (m === 'dark' && palette.id === 'klasik') {
                // "Koyu Mod" = Lumina'nın mavi-indigo koyu teması
                mode = 'dark';
                setPalette(DEFAULT_PALETTE);
            } else {
                setMode(m);
            }
        });
        $('themePresets').addEventListener('click', e => {
            const b = e.target.closest('[data-preset]');
            if (!b) return;
            const p = PRESETS.find(x => x.id === b.dataset.preset);
            if (p) setPalette(p);
        });
        const onColor = (n, fromText) => {
            const raw = (fromText ? $('themeHex' + n) : $('themeColor' + n)).value;
            const v = normHex(raw);
            if (!v) { $('themeHex' + n).classList.toggle('invalid', fromText); return; }
            $('themeHex' + n).classList.remove('invalid');
            const next = { id: 'custom', name: 'Özel', a1: palette.a1, a2: palette.a2 };
            next['a' + n] = v;
            setPalette(next);
        };
        [1, 2].forEach(n => {
            $('themeColor' + n).addEventListener('input', () => onColor(n, false));
            $('themeHex' + n).addEventListener('input', () => onColor(n, true));
        });
        $('themeReset').addEventListener('click', () => setPalette(DEFAULT_PALETTE));

        $('themeAddBtn').addEventListener('click', () => {
            const input = $('themeName');
            const name = input.value.trim().slice(0, 24);
            if (!name) { input.focus(); input.classList.add('invalid'); return; }
            input.classList.remove('invalid');
            if (collection.length >= MAX_COLLECTION) return;
            collection.push({ id: 'c' + Date.now().toString(36), name, a1: palette.a1, a2: palette.a2 });
            input.value = '';
            save(); renderModal();
        });
        $('themeName').addEventListener('keydown', e => { if (e.key === 'Enter') $('themeAddBtn').click(); });
        $('themeCollection').addEventListener('click', e => {
            const del = e.target.closest('[data-del]');
            if (del) {
                collection = collection.filter(c => c.id !== del.dataset.del);
                save(); renderModal(); return;
            }
            const ap = e.target.closest('[data-apply]');
            const item = ap && collection.find(c => c.id === ap.dataset.apply);
            if (item) setPalette({ id: 'custom', name: item.name, a1: item.a1, a2: item.a2 });
        });
    }

    function open() {
        document.getElementById('userDropdownMenu')?.classList.add('hidden');
        renderModal();
        openModal('themeModal');
    }

    function init() {
        load();
        if (!mql && window.matchMedia) {
            mql = window.matchMedia('(prefers-color-scheme: dark)');
            const onChange = () => { if (mode === 'system') apply(); };
            mql.addEventListener ? mql.addEventListener('change', onChange) : mql.addListener(onChange);
        }
        if ($('themeModal')) bindModal();
        apply();
    }

    return { init, open, setMode, getMode: () => mode, isLight };
})();
