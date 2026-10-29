/* ============================================================
   LUMINA — KELİME VERİSİ
   CSV ayrıştırma, API/CSV/gömülü veri yükleme, fiil laboratuvarı verisi
============================================================ */

// ── FALLBACK (ÇEVRİMDİŞİ) VERİ SETLERİ ──
const DEFAULT_VERBS_LAB = [
    { v1: 'be', v2: 'was / were', v3: 'been', tr: 'olmak' },
    { v1: 'become', v2: 'became', v3: 'become', tr: 'olmak, dönüşmek' },
    { v1: 'begin', v2: 'began', v3: 'begun', tr: 'başlamak' },
    { v1: 'break', v2: 'broke', v3: 'broken', tr: 'kırmak, bozulmak' },
    { v1: 'bring', v2: 'brought', v3: 'brought', tr: 'getirmek' },
    { v1: 'build', v2: 'built', v3: 'built', tr: 'inşa etmek' },
    { v1: 'buy', v2: 'bought', v3: 'bought', tr: 'satın almak' },
    { v1: 'catch', v2: 'caught', v3: 'caught', tr: 'yakalamak' },
    { v1: 'choose', v2: 'chose', v3: 'chosen', tr: 'seçmek' },
    { v1: 'come', v2: 'came', v3: 'come', tr: 'gelmek' },
    { v1: 'do', v2: 'did', v3: 'done', tr: 'yapmak' },
    { v1: 'drink', v2: 'drank', v3: 'drunk', tr: 'içmek' },
    { v1: 'drive', v2: 'drove', v3: 'driven', tr: 'sürmek (araç)' },
    { v1: 'eat', v2: 'ate', v3: 'eaten', tr: 'yemek yemek' },
    { v1: 'fall', v2: 'fell', v3: 'fallen', tr: 'düşmek' },
    { v1: 'find', v2: 'found', v3: 'found', tr: 'bulmak' },
    { v1: 'fly', v2: 'flew', v3: 'flown', tr: 'uçmak' },
    { v1: 'forget', v2: 'forgot', v3: 'forgotten', tr: 'unutmak' },
    { v1: 'get', v2: 'got', v3: 'gotten', tr: 'almak, elde etmek' },
    { v1: 'give', v2: 'gave', v3: 'given', tr: 'vermek' },
    { v1: 'go', v2: 'went', v3: 'gone', tr: 'gitmek' },
    { v1: 'have', v2: 'had', v3: 'had', tr: 'sahip olmak' },
    { v1: 'hear', v2: 'heard', v3: 'heard', tr: 'duymak' },
    { v1: 'know', v2: 'knew', v3: 'known', tr: 'bilmek, tanımak' },
    { v1: 'make', v2: 'made', v3: 'made', tr: 'yapmak, üretmek' },
    { v1: 'read', v2: 'read', v3: 'read', tr: 'okumak' },
    { v1: 'run', v2: 'ran', v3: 'run', tr: 'koşmak' },
    { v1: 'see', v2: 'saw', v3: 'seen', tr: 'görmek' },
    { v1: 'speak', v2: 'spoke', v3: 'spoken', tr: 'konuşmak' },
    { v1: 'take', v2: 'took', v3: 'taken', tr: 'almak' },
    { v1: 'write', v2: 'wrote', v3: 'written', tr: 'yazmak' }
];

// Gömülü örnek İngilizce veri: CSV hiç okunamazsa (ör. ilk açılış çevrimdışı) kullanılır
const FALLBACK_ENGLISH = [
        // Group 1
        { id: 1, groupId: 1, english: 'abandon', turkish: 'terk etmek, vazgeçmek', v1: 'abandon', v2: 'abandoned', v3: 'abandoned' },
        { id: 2, groupId: 1, english: 'ability', turkish: 'yetenek, kabiliyet' },
        { id: 3, groupId: 1, english: 'able', turkish: 'yapabilen, muktedir' },
        { id: 4, groupId: 1, english: 'about', turkish: 'hakkında, yaklaşık' },
        { id: 5, groupId: 1, english: 'above', turkish: 'üzerinde, yukarıda' },
        { id: 6, groupId: 1, english: 'abroad', turkish: 'yurt dışı' },
        { id: 7, groupId: 1, english: 'absence', turkish: 'yokluk, bulunmayış' },
        { id: 8, groupId: 1, english: 'absolute', turkish: 'mutlak, kesin' },
        { id: 9, groupId: 1, english: 'absorb', turkish: 'emmek, içine çekmek' },
        { id: 10, groupId: 1, english: 'be', turkish: 'olmak', v1: 'be', v2: 'was / were', v3: 'been' },
        { id: 11, groupId: 1, english: 'begin', turkish: 'başlamak', v1: 'begin', v2: 'began', v3: 'begun' },
        { id: 12, groupId: 1, english: 'break', turkish: 'kırmak', v1: 'break', v2: 'broke', v3: 'broken' },

        // Group 2
        { id: 13, groupId: 2, english: 'academic', turkish: 'akademik' },
        { id: 14, groupId: 2, english: 'accept', turkish: 'kabul etmek' },
        { id: 15, groupId: 2, english: 'access', turkish: 'erişim, ulaşmak' },
        { id: 16, groupId: 2, english: 'accident', turkish: 'kaza' },
        { id: 17, groupId: 2, english: 'accompany', turkish: 'eşlik etmek' },
        { id: 18, groupId: 2, english: 'bring', turkish: 'getirmek', v1: 'bring', v2: 'brought', v3: 'brought' },
        { id: 19, groupId: 2, english: 'build', turkish: 'inşa etmek', v1: 'build', v2: 'built', v3: 'built' },
        { id: 20, groupId: 2, english: 'buy', turkish: 'satın almak', v1: 'buy', v2: 'bought', v3: 'bought' },

        // Group 3
        { id: 21, groupId: 3, english: 'challenge', turkish: 'meydan okuma, zorluk' },
        { id: 22, groupId: 3, english: 'champion', turkish: 'şampiyon' },
        { id: 23, groupId: 3, english: 'chance', turkish: 'şans, fırsat' },
        { id: 24, groupId: 3, english: 'choose', turkish: 'seçmek', v1: 'choose', v2: 'chose', v3: 'chosen' },
        { id: 25, groupId: 3, english: 'come', turkish: 'gelmek', v1: 'come', v2: 'came', v3: 'come' },

        // Generate default items for remaining groups 4 to 30
];

// ── DATA LOADING FUNCTIONS ──
// Tırnaklı alanları ("a; b") ve "" kaçışını destekleyen ';' ayraçlı CSV ayrıştırıcı
function parseDelimited(text, delimiter = ';') {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else field += ch;
        } else if (ch === '"') inQuotes = true;
        else if (ch === delimiter) { row.push(field); field = ''; }
        else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (ch !== '\r') field += ch;
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows;
}

// Başlık satırından sonraki satırlardan (kelime, anlam) çiftleri üretir; boş anlamlılar atlanır.
function buildWordList(csvText, wordCol, turkishCol) {
    const rows = parseDelimited(csvText).slice(1);
    const parsed = [];
    for (const parts of rows) {
        const english = (parts[wordCol] || '').trim();
        const turkish = (parts[turkishCol] || '').trim();
        if (!english || !turkish) continue;
        parsed.push({
            id: parsed.length + 1,
            groupId: Math.floor(parsed.length / 100) + 1,
            english,
            turkish
        });
    }
    return { words: parsed, verbs: [] };
}

function parseCsvText(csvText) {
    const rows = parseDelimited(csvText).slice(1);
    const parsed = [];
    const extractedVerbs = [];

    for (const parts of rows) {
        const english = (parts[0] || '').trim();
        const turkish = (parts[1] || '').trim();
        if (!english || !turkish) continue;

        const clean = v => { v = (v || '').trim(); return v === '-' || !v ? null : v; };
        const v1 = clean(parts[2]), v2 = clean(parts[3]), v3 = clean(parts[4]);

        parsed.push({
            id: parsed.length + 1,
            groupId: Math.floor(parsed.length / 100) + 1,   // grup başına 100 kelime
            english, turkish, v1, v2, v3
        });
        if (v1 && v2 && v3) extractedVerbs.push({ v1, v2, v3, tr: turkish });
    }
    return { words: parsed, verbs: extractedVerbs };
}

// Sütunlar: Almanca [ID;Kelime;Frekans;Türkçe] · Fransızca [Sıra;Kelime;Tür;Türkçe]
//           İsveççe [Sıra;Fransızca;İsveççe;Türkçe] · İspanyolca/Norveççe/Futbol [Sıra;Kelime;Tür;Türkçe]
const parseAlmancaCsv    = text => buildWordList(text, 1, 3);
const parseFransizcaCsv  = text => buildWordList(text, 1, 3);
const parseIsvecceCsv    = text => buildWordList(text, 2, 3);
const parseIspanyolcaCsv = text => buildWordList(text, 1, 3);
const parseNorvecceCsv   = text => buildWordList(text, 1, 3);
const parseFutbolCsv     = text => buildWordList(text, 1, 3);   // [Sıra;Kelime;Tür;Türkçe]
const parseSimpleCsv     = text => buildWordList(text, 1, 3);   // İtalyanca/Portekizce/Rusça/Felemenkçe [Sıra;Kelime;Tür;Türkçe]

// TÖMER kelime dosyaları: [Ünite;Kelime;Tür;Türkçe] — grup = ünite numarası
function parseUnitCsv(csvText) {
    const rows = parseDelimited(csvText).slice(1);
    const parsed = [];
    for (const parts of rows) {
        const unit = parseInt(parts[0], 10);
        const english = (parts[1] || '').trim();
        const turkish = (parts[3] || '').trim();
        if (!unit || !english || !turkish) continue;
        parsed.push({ id: parsed.length + 1, groupId: unit, english, turkish });
    }
    return { words: parsed, verbs: [] };
}

// ── VERİ KATMANI ──
// Öncelik: (1) API (yalnızca apiBaseUrl ayarlıysa ve dilin API'si varsa) → (2) CSV dosyası → (3) gömülü FALLBACK_ENGLISH
const CSV_DIR = './data/';

// ── DİL KAYITLARI ──
// Dil seçim ekranı, başlıklar, bayraklar, sesli okuma ve grup sayıları bu listeden üretilir.
// Yeni dil eklemek: data/ klasörüne CSV koyun ve buraya bir satır ekleyin (sıra = ekrandaki sıra).
//   code  : ilerleme anahtarı (lumina_progress_<code>) — sonradan DEĞİŞTİRMEYİN
//   key   : iç ad · csv/parse: kelime dosyası · api: C# API yolu (yoksa null)
//   theme : css/style.css içindeki .<theme>-theme ve body.theme-<theme> sınıfları
//   soon  : true ise kart "Yakında" olarak görünür ve tıklanmaz
const LANGUAGES = [
    { code: 'en',     key: 'English',    label: 'İngilizce',  upper: 'İNGİLİZCE',  flag: '🇬🇧', short: 'EN',  tts: 'en-US', theme: '',       csv: 'english.csv',    api: 'words',           parse: parseCsvText,       defaultGroups: 30,  sub: 'Kişisel İngilizce Kelime Sistemi' },
    { code: 'futbol', key: 'Futbol',     label: 'Futbol',     upper: 'FUTBOL',     flag: '⚽',  short: 'FUT', tts: 'en-US', theme: 'futbol', csv: 'futbol.csv',     api: null,              parse: parseFutbolCsv,     defaultGroups: 5,   sub: 'Futbol Kelimeleri' },
    // TÖMER: kişisel çalışma alanı (js/app/tomer.js). data/tomer/ yoksa "Yakında" görünür.
    { code: 'tomer',  key: 'Tomer',      label: 'TÖMER',      upper: 'TÖMER',      flag: '🇹🇷', short: 'TR',  tts: 'en-US', theme: 'tomer',  csv: null,             api: null,              parse: null,               defaultGroups: 1,   sub: 'TÖMER', soon: true, module: true },
    { code: 'es',     key: 'Spanish',    label: 'İspanyolca', upper: 'İSPANYOLCA', flag: '🇪🇸', short: 'ES',  tts: 'es-ES', theme: 'es',     csv: 'spanish.csv',    api: 'words/spanish',   parse: parseIspanyolcaCsv, defaultGroups: 40,  sub: 'Kişisel İspanyolca Kelime Sistemi' },
    { code: 'de',     key: 'German',     label: 'Almanca',    upper: 'ALMANCA',    flag: '🇩🇪', short: 'DE',  tts: 'de-DE', theme: 'de',     csv: 'german.csv',     api: 'words/german',    parse: parseAlmancaCsv,    defaultGroups: 39,  sub: 'Kişisel Almanca Kelime Sistemi' },
    { code: 'fr',     key: 'French',     label: 'Fransızca',  upper: 'FRANSIZCA',  flag: '🇫🇷', short: 'FR',  tts: 'fr-FR', theme: 'fr',     csv: 'french.csv',     api: 'words/french',    parse: parseFransizcaCsv,  defaultGroups: 58,  sub: 'Kişisel Fransızca Kelime Sistemi' },
    { code: 'it',     key: 'Italian',    label: 'İtalyanca',  upper: 'İTALYANCA',  flag: '🇮🇹', short: 'IT',  tts: 'it-IT', theme: 'it',     csv: 'italian.csv',    api: null,              parse: parseSimpleCsv,     defaultGroups: 10,  sub: 'Kişisel İtalyanca Kelime Sistemi' },
    { code: 'pt',     key: 'Portuguese', label: 'Portekizce', upper: 'PORTEKİZCE', flag: '🇵🇹', short: 'PT',  tts: 'pt-PT', theme: 'pt',     csv: 'portuguese.csv', api: null,              parse: parseSimpleCsv,     defaultGroups: 10,  sub: 'Kişisel Portekizce Kelime Sistemi' },
    { code: 'ru',     key: 'Russian',    label: 'Rusça',      upper: 'RUSÇA',      flag: '🇷🇺', short: 'RU',  tts: 'ru-RU', theme: 'ru',     csv: 'russian.csv',    api: null,              parse: parseSimpleCsv,     defaultGroups: 11,  sub: 'Kişisel Rusça Kelime Sistemi' },
    { code: 'nl',     key: 'Dutch',      label: 'Felemenkçe', upper: 'FELEMENKÇE', flag: '🇳🇱', short: 'NL',  tts: 'nl-NL', theme: 'nl',     csv: 'dutch.csv',      api: null,              parse: parseSimpleCsv,     defaultGroups: 10,  sub: 'Kişisel Felemenkçe Kelime Sistemi' },
    { code: 'sv',     key: 'Swedish',    label: 'İsveççe',    upper: 'İSVEÇÇE',    flag: '🇸🇪', short: 'SV',  tts: 'sv-SE', theme: 'sv',     csv: 'swedish.csv',    api: 'words/swedish',   parse: parseIsvecceCsv,    defaultGroups: 58,  sub: 'Kişisel İsveççe Kelime Sistemi' },
    { code: 'no',     key: 'Norwegian',  label: 'Norveççe',   upper: 'NORVEÇÇE',   flag: '🇳🇴', short: 'NO',  tts: 'nb-NO', theme: 'no',     csv: 'norwegian.csv',  api: 'words/norwegian', parse: parseNorvecceCsv,   defaultGroups: 20,  sub: 'Kişisel Norveççe Kelime Sistemi' }
];
// TÖMER seviyelerinin kelime kartları (dil ekranında görünmez, TÖMER → seviye → Kelime ile açılır)
['a1', 'a2', 'b1', 'b2'].forEach(lv => LANGUAGES.push({
    code: 'tomer' + lv, key: 'Tomer' + lv.toUpperCase(), label: `TÖMER ${lv.toUpperCase()}`, upper: `TÖMER ${lv.toUpperCase()}`,
    flag: '🇬🇧', short: lv.toUpperCase(), tts: 'en-US', theme: 'tomer', csv: `tomer/${lv}/words.csv`, api: null,
    parse: parseUnitCsv, defaultGroups: 12, sub: `TÖMER ${lv.toUpperCase()} · Kelimeler`, groupLabel: 'Ünite', hidden: true,
    loader: () => TomerModule.wordsCsv(lv)   // yerel dosya ya da hesaba özel bulut kopyası
}));
const LANGUAGE_BY_CODE = Object.fromEntries(LANGUAGES.map(l => [l.code, l]));
const LANGUAGE_BY_KEY  = Object.fromEntries(LANGUAGES.map(l => [l.key, l]));
const groupCounts = {};   // { code: grup sayısı } — kelimeler yüklenince dolar

// HTML kimlikleri: btnLangEn, langDescFutbol ...
function langIdSuffix(code) { return code.charAt(0).toUpperCase() + code.slice(1); }

const wordCache = {};   // { Dil: { words, verbs } }

// CSV dosyaları UTF-8 veya Windows-1254 (Excel "ANSI") olabilir: ikisini de doğru çöz
async function fetchCsvText(fileName) {
    const response = await fetch(CSV_DIR + fileName);
    if (!response.ok) throw new Error(`CSV HTTP ${response.status} (${fileName})`);
    const buffer = await response.arrayBuffer();
    let text;
    try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
        text = new TextDecoder('windows-1254').decode(buffer);
    }
    return text.replace(/^﻿/, '');
}

async function fetchJson(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}

function normalizeApiWords(list) {
    return list.map((w, idx) => ({
        id: w.id || idx + 1,
        groupId: w.groupId || Math.floor(idx / 100) + 1,
        english: w.english || w.original || w.word || w.en || '',
        turkish: w.turkish || w.translated || w.tr || '',
        v1: w.v1 || null,
        v2: w.v2 || null,
        v3: w.v3 || null
    })).filter(w => w.english && w.turkish);
}

async function fetchLanguageWords(langName) {
    if (wordCache[langName]) return wordCache[langName];

    let result = null;
    const src = LANGUAGE_BY_KEY[langName];

    if (src && src.csv) {
        // 1) API
        if (API_BASE_URL && src.api) {
            try {
                const apiList = await fetchJson(`${API_BASE_URL}/${src.api}`, 4000);
                const words = Array.isArray(apiList) ? normalizeApiWords(apiList) : [];
                if (words.length > 0) {
                    result = { words, verbs: [] };
                    // API fiil çekimlerini (V1/V2/V3) taşımaz: İngilizce için CSV'den tamamla
                    if (langName === 'English' && !words.some(w => w.v1)) {
                        try { result.verbs = src.parse(await fetchCsvText(src.csv)).verbs; } catch { /* yoksay */ }
                    }
                }
            } catch (e) {
                console.warn(`⚠️ ${langName} API başarısız, CSV'ye geçiliyor:`, e.message);
            }
        }
        // 2) CSV
        if (!result) {
            try {
                const parsed = src.parse(src.loader ? await src.loader() : await fetchCsvText(src.csv));
                if (parsed.words.length > 0) result = parsed;
            } catch (e) {
                console.warn(`⚠️ ${langName} CSV okunamadı:`, e.message);
            }
        }
        // 3) Gömülü veri: yalnızca İngilizce için var; diğer dillerde boş liste (sahte veri gösterme)
        if (!result) {
            result = { words: langName === 'English' ? FALLBACK_ENGLISH : [], verbs: [] };
        }
    } else {
        result = { words: [], verbs: [] };
    }

    wordCache[langName] = result;
    return result;
}

function groupCountFor(wordCount) {
    return Math.max(1, Math.ceil(wordCount / 100));
}

async function loadLanguageData(langName) {
    currentLanguage = langName;

    const result = await fetchLanguageWords(langName);
    wordsData = result.words;
    if (result.verbs && result.verbs.length > 0) verbsLabData = result.verbs;

    const cfg = LANGUAGE_BY_KEY[langName];
    if (cfg) {
        const maxGroup = wordsData.reduce((m, w) => Math.max(m, w.groupId || 1), 1);
        groupCounts[cfg.code] = Math.max(groupCountFor(wordsData.length), maxGroup);
    }

    allWords = {};
    wordsData.forEach(word => {
        const key = `group${word.groupId || 1}`;
        if (!allWords[key]) allWords[key] = [];
        allWords[key].push({
            id: word.id,
            en: word.english || word.word || word.en || '',
            tr: word.turkish || word.tr || '',
            v1: word.v1,
            v2: word.v2,
            v3: word.v3
        });
    });

    updateAppTitle(langName);
}

function updateAppTitle(langName) {
    const lang = LANGUAGE_BY_KEY[langName];
    // Uygulamanın adı her ekranda yalnızca "Lumina"; seçili dil alt başlıkta ve bayrakta görünür
    document.querySelectorAll('.logo-title').forEach(el => {
        if (el.closest('#authScreen')) return;
        el.textContent = 'Lumina';
    });
    document.title = lang ? `Lumina · ${lang.label}` : 'Lumina';
}

async function loadVerbsLabData() {
    if (verbsLabData.length > 0) return; // CSV'den zaten yüklendi
    if (API_BASE_URL) {
        try {
            const list = await fetchJson(`${API_BASE_URL}/VerbsLab`, 1500);
            if (Array.isArray(list) && list.length > 0) { verbsLabData = list; return; }
        } catch (e) {
            console.warn('⚠️ VerbsLab API alınamadı:', e.message);
        }
    }
    if (verbsLabData.length === 0) verbsLabData = DEFAULT_VERBS_LAB;
}
