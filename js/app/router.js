/* ============================================================
   LUMINA — ADRES ÇUBUĞU (router)
   Her ekranın kendi adresi vardır; adresler İngilizce ve okunaklıdır:

     /                                    dil seçimi (ana sayfa)
     /login                              giriş
     /english                            İngilizce · gruplar
     /football/groups/3                  Futbol · 3. grup
     /football/groups/3/flashcards       kartlar
     /football/groups/3/test             test (oturum: …/test/session)
     /football/groups/3/write            yazma (oturum: …/write/session)
     /football/groups/3/lab              gruba özel lab
     /spanish/lab · /match · /review     lab, eşleştirme, haftalık tekrar
     /spanish/races[/typing|/quick-quiz|/speed-match]
     /tomer                              TÖMER seviyeleri
     /tomer/a1                           Kelime · Gramer · Testler · Dinleme
     /tomer/a1/words[/groups/3/…]        TÖMER kelime kartları
     /tomer/a1/grammar[/<konu>[/test]]   gramer
     /tomer/a1/grammar/review            eksiklerimi çalış
     /tomer/a1/tests[/<test>]            kitap testleri
     /tomer/a1/stats                     analiz
     /tomer/a1/listening                 dinleme modülü (ayrı sayfa)
     /courses[/<ders>[/topics/<konu>[/quiz|/classic]]]   Derslerim
     /courses/<ders>/mistakes[/quiz|/classic]
     /listening                          Dinleyerek Öğren (ayrı sayfa)

   Adres yenilenince ya da paylaşılınca aynı ekran açılır. Süren bir test
   ya da yarış yeniden başlatılamayacağı için bir üst ekrana (merkez/konu) döner.
   Adresler gerçek yoldur (/football/groups/3). GitHub Pages bilinmeyen yolda 404.html'i
   açar; o adresi saklayıp ana sayfaya yönlendirir (index.html başındaki betik geri yazar).
   Yerel sunucu da bilinmeyen yollarda index.html döndürmelidir (Baslat.bat bunu yapar).
   Eski #/ adresleri index.html'de yeni adrese çevrilir.
============================================================ */
const Router = (() => {
    const LISTENING = 'tomer-listening/listening/';
    const SLUG_OVERRIDES = { futbol: 'football' };
    const RACES = { typingRaceScreen: 'typing', quickQuizScreen: 'quick-quiz', speedMatchScreen: 'speed-match' };

    let pending = null;    // giriş yapılmadan açılan adres: girişten sonra oraya gidilir
    let restoring = false;

    // ── dil kodu ↔ adres parçası ──
    function langSegments(code) {
        const tomer = /^tomer([a-z]\d)$/.exec(code || '');
        if (tomer) return ['tomer', tomer[1], 'words'];
        const lang = LANGUAGE_BY_CODE[code];
        if (!lang) return [];
        return [SLUG_OVERRIDES[code] || lang.key.toLowerCase()];
    }
    function codeOfSlug(slug) {
        const override = Object.keys(SLUG_OVERRIDES).find(c => SLUG_OVERRIDES[c] === slug);
        if (override) return override;
        const lang = LANGUAGES.find(l => !l.module && !l.hidden && l.key.toLowerCase() === slug);
        return lang ? lang.code : null;
    }

    // Uygulamanın kök yolu: GitHub Pages'te /lumina-kelime/, yerelde /
    const ROOT = () => window.LUMINA_ROOT || '/';
    const joinSegs = segs => segs.filter(s => s !== null && s !== undefined && s !== '')
        .map(s => encodeURIComponent(String(s))).join('/');
    const toPath = segs => ROOT() + joinSegs(segs);
    // Ayrı sayfalardaki (dinleme modülü) kendi # adresleri için
    const toHash = segs => '#/' + joinSegs(segs);

    // '/lumina-kelime/football/groups/3' → ['football','groups','3']
    function parse(path) {
        let p = String(path || '');
        if (p.startsWith(ROOT())) p = p.slice(ROOT().length);
        return p.replace(/^\/+/, '').split('?')[0].split('#')[0].split('/').filter(Boolean)
            .map(s => { try { return decodeURIComponent(s); } catch { return s; } });
    }

    // ── ekran → adres ──
    function segmentsFor(screenId) {
        if (!screenId || screenId === 'languageScreen') return [];
        if (screenId === 'authScreen') return ['login'];
        if (screenId.startsWith('tomer')) return (typeof TomerModule !== 'undefined' && TomerModule.route(screenId)) || ['tomer'];
        if (screenId.startsWith('dersler')) return (typeof DerslerModule !== 'undefined' && DerslerModule.route(screenId)) || ['courses'];

        const L = langSegments(state.lang);
        const group = state.currentGroup ? [...L, 'groups', state.currentGroup] : L;
        switch (screenId) {
            case 'dashboard':       return L;
            case 'groupScreen':     return group;
            case 'flashcardScreen':
                if (state.currentMode === 'sandbox') return [...L, 'lab', 'sandbox'];
                if (state.currentMode === 'weeklyReview') return [...L, 'review'];
                return [...group, 'flashcards'];
            case 'testHubScreen':   return [...group, 'test'];
            case 'testScreen':      return [...group, 'test', 'session'];
            case 'writeHubScreen':  return [...group, 'write'];
            case 'writeScreen':     return [...group, 'write', 'session'];
            case 'labScreen':       return state.currentMode === 'lab-group' ? [...group, 'lab'] : [...L, 'lab'];
            case 'matchScreen':     return [...L, 'match'];
            case 'raceHubScreen':   return [...L, 'races'];
            default:
                if (RACES[screenId]) return [...L, 'races', RACES[screenId]];
                return L;
        }
    }

    function urlFor(screenId) {
        return toPath(segmentsFor(screenId)) + location.search;
    }
    const activeScreen = () => document.querySelector('.screen.active')?.id;
    // Şu an görünen ekranın adresi
    const current = () => urlFor(activeScreen());

    // ── adres → ekran ──
    function openListening(page, hashSegs) {
        location.assign(LISTENING + page + toHash(hashSegs));
    }

    async function restoreVocab(code, rest) {
        await selectLanguage(code);                       // → gruplar (dashboard)
        if (rest[0] === 'groups') {
            const n = parseInt(rest[1], 10);
            if (!(n >= 1 && n <= activeTotalGroups())) return;
            openGroup(n);
            if (rest[2] === 'test') openTestHub();
            else if (rest[2] === 'write') openWriteHub();
            else if (rest[2] === 'lab') startLabForGroup(n);
            return;
        }
        if (rest[0] === 'lab') renderLab();
        else if (rest[0] === 'match') startMatch();
        else if (rest[0] === 'races') openRaceHub();
    }

    async function apply(segs) {
        const [head, ...rest] = segs;
        showScreen('languageScreen');                     // geri tuşu ana sayfaya dönebilsin
        if (!head || head === 'login') return;

        if (head === 'listening') return openListening('languages.html', rest);
        if (head === 'courses') {
            if (typeof DerslerModule !== 'undefined') await DerslerModule.restore(rest);
            return;
        }
        if (head === 'tomer') {
            if (rest[1] === 'listening') return openListening('index.html', [rest[0]]);
            if (rest[1] === 'words') {
                if (typeof TomerModule !== 'undefined') await TomerModule.restore([rest[0]]);
                const code = 'tomer' + String(rest[0] || '').toLowerCase();
                if (LANGUAGE_BY_CODE[code]) await restoreVocab(code, rest.slice(2));
                return;
            }
            if (typeof TomerModule !== 'undefined') await TomerModule.restore(rest);
            return;
        }
        const code = codeOfSlug(head);
        if (code) await restoreVocab(code, rest);
    }

    // Adresi uygula (açılışta, girişten sonra ya da adres elle değiştirilince)
    async function restore(path) {
        if (restoring) return;
        restoring = true;
        try { await apply(parse(path)); }
        catch (e) { console.warn('Adres açılamadı:', path, e); showScreen('languageScreen'); }
        finally { restoring = false; }
    }

    // Açılış: oturum varsa adresteki ekranı aç, yoksa adresi girişten sonrası için sakla
    function start(session) {
        const segs = parse(location.pathname);
        if (session) return restore(location.pathname);
        if (segs.length && segs[0] !== 'login') pending = location.pathname;
        showScreen('authScreen');
    }

    function afterLogin() {
        const target = pending;
        pending = null;
        if (target) restore(target);
        else showScreen('languageScreen');
    }

    return { urlFor, current, parse, start, afterLogin, restore, isRestoring: () => restoring, LISTENING, ROOT, toPath };
})();
