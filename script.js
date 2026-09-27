/* ============================================================
   LUMINA 3000 — MAIN APP & AUTH MANAGER & OFFLINE DATA
   Kullanıcı verileri: lumina_users (JSON array)
   Oturum verisi:     lumina_session (JSON object)
   Admin hesabı:      a@l.com / 123456
============================================================ */

// ── SABİT TANIMLAMALARI (LOCAL STORAGE KEYS & GROUPS) ──
const LS_KEY = 'lumina_progress_en';
const LS_KEY_ES = 'lumina_progress_es';
const LS_KEY_DE = 'lumina_progress_de';
const LS_KEY_FR = 'lumina_progress_fr';
const LS_KEY_NO = 'lumina_progress_no';
const LS_KEY_SV = 'lumina_progress_sv';
const LS_KEY_FUTBOL = 'lumina_progress_futbol';

let TOTAL_GROUPS = 30;    // İngilizce varsayılan grup sayısı
let TOTAL_GROUPS_ES = 9;  // İspanyolca grup sayısı
let TOTAL_GROUPS_DE = 306; // Almanca grup sayısı
let TOTAL_GROUPS_FR = 58; // Fransızca grup sayısı
let TOTAL_GROUPS_NO = 5;  // Norveççe grup sayısı
let TOTAL_GROUPS_SV = 58;  // İsveççe grup sayısı
let TOTAL_GROUPS_FUTBOL = 5; // Futbol grup sayısı

// ── C# API ADRESİ ──
const API_BASE_URL = 'http://localhost:7047/api';

// ── SERVICE WORKER & OFFLINE YÖNETİMİ ──
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker registered!', reg))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}

function showOfflineBanner(isOffline) {
    let banner = document.getElementById('offline-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.style.cssText = 'position:fixed; top:0; left:0; width:100%; background-color:#ff9800; color:#fff; text-align:center; padding:10px; z-index:9999; font-weight:bold; font-family:Inter, sans-serif; display:none;';
        document.body.appendChild(banner);
    }
    
    if (isOffline) {
        banner.innerText = 'Çevrimdışısınız. "Kelime Çalışma" özellikleri aktif, ancak hesap/ayarlar kısıtlanmıştır.';
        banner.style.display = 'block';
    } else {
        banner.innerText = 'İnternet bağlantısı sağlandı.';
        banner.style.backgroundColor = '#4caf50';
        setTimeout(() => { banner.style.display = 'none'; banner.style.backgroundColor = '#ff9800'; }, 3000);
    }
}

window.addEventListener('offline', () => showOfflineBanner(true));
window.addEventListener('online', () => showOfflineBanner(false));
// Başlangıçta kontrol et
if (!navigator.onLine) {
    showOfflineBanner(true);
}

// ── GOOGLE OAUTH CLIENT ID ──
// Google Cloud Console'dan alınan Client ID'nizi buraya yazın
const GOOGLE_CLIENT_ID = '1035406332647-50tntld2uiphj58kn5r1od3o4rjo2aof.apps.googleusercontent.com';

// ── GLOBAL DEĞİŞKENLER ──
let currentLanguage = 'English';
let wordsData = [];
let allWords = {};
let verbsLabData = [];

// ── GLOBAL STATE ──
const state = {
    lang: 'en',
    currentMode: 'default',
    currentGroup: null,
    sessionQueue: [],
    sessionIndex: 0,
    sessionCorrect: 0,
    sessionWrong: 0,
    sessionUnsure: 0,
    isFlipped: false,
    writeQueue: [],
    writeIndex: 0,
    writeCorrect: 0,
    writeWrong: 0,
    testQueue: [],
    testIndex: 0,
    testCorrect: 0,
    testWrong: 0
};

function activeWords() {
    return allWords;
}

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

const FALLBACK_DATA = {
    English: [
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
        ...Array.from({ length: 27 }, (_, i) => {
            const gId = i + 4;
            return [
                { id: gId * 10 + 1, groupId: gId, english: `achieve (G${gId})`, turkish: 'başarmak, elde etmek' },
                { id: gId * 10 + 2, groupId: gId, english: `believe (G${gId})`, turkish: 'inanmak' },
                { id: gId * 10 + 3, groupId: gId, english: `create (G${gId})`, turkish: 'yaratmak, oluşturmak' },
                { id: gId * 10 + 4, groupId: gId, english: `discover (G${gId})`, turkish: 'keşfetmek' },
                { id: gId * 10 + 5, groupId: gId, english: `explore (G${gId})`, turkish: 'keşfe çıkmak' },
                { id: gId * 10 + 6, groupId: gId, english: `do (G${gId})`, turkish: 'yapmak', v1: 'do', v2: 'did', v3: 'done' },
                { id: gId * 10 + 7, groupId: gId, english: `eat (G${gId})`, turkish: 'yemek', v1: 'eat', v2: 'ate', v3: 'eaten' },
                { id: gId * 10 + 8, groupId: gId, english: `go (G${gId})`, turkish: 'gitmek', v1: 'go', v2: 'went', v3: 'gone' }
            ];
        }).flat()
    ],
    Spanish: Array.from({ length: 9 }, (_, i) => {
        const gId = i + 1;
        return [
            { id: gId * 10 + 1, groupId: gId, english: 'Hola', turkish: 'Merhaba' },
            { id: gId * 10 + 2, groupId: gId, english: 'Gracias', turkish: 'Teşekkürler' },
            { id: gId * 10 + 3, groupId: gId, english: 'Por favor', turkish: 'Lütfen' },
            { id: gId * 10 + 4, groupId: gId, english: 'Amigo', turkish: 'Arkadaş' },
            { id: gId * 10 + 5, groupId: gId, english: 'Agua', turkish: 'Su' },
            { id: gId * 10 + 6, groupId: gId, english: 'Tiempo', turkish: 'Zaman' }
        ];
    }).flat(),
    German: Array.from({ length: 10 }, (_, i) => {
        const gId = i + 1;
        return [
            { id: gId * 10 + 1, groupId: gId, english: 'Hallo', turkish: 'Merhaba' },
            { id: gId * 10 + 2, groupId: gId, english: 'Danke', turkish: 'Teşekkürler' },
            { id: gId * 10 + 3, groupId: gId, english: 'Bitte', turkish: 'Lütfen / Rica ederim' },
            { id: gId * 10 + 4, groupId: gId, english: 'Wasser', turkish: 'Su' },
            { id: gId * 10 + 5, groupId: gId, english: 'Haus', turkish: 'Ev' },
            { id: gId * 10 + 6, groupId: gId, english: 'Zeit', turkish: 'Zaman' }
        ];
    }).flat(),
    French: Array.from({ length: 10 }, (_, i) => {
        const gId = i + 1;
        return [
            { id: gId * 10 + 1, groupId: gId, english: 'Bonjour', turkish: 'Merhaba / İyi günler' },
            { id: gId * 10 + 2, groupId: gId, english: 'Merci', turkish: 'Teşekkürler' },
            { id: gId * 10 + 3, groupId: gId, english: 'S\'il vous plaît', turkish: 'Lütfen' },
            { id: gId * 10 + 4, groupId: gId, english: 'Eau', turkish: 'Su' },
            { id: gId * 10 + 5, groupId: gId, english: 'Maison', turkish: 'Ev' },
            { id: gId * 10 + 6, groupId: gId, english: 'Temps', turkish: 'Zaman' }
        ];
    }).flat(),
    Norwegian: Array.from({ length: 5 }, (_, i) => {
        const gId = i + 1;
        return [
            { id: gId * 10 + 1, groupId: gId, english: 'Hei', turkish: 'Merhaba' },
            { id: gId * 10 + 2, groupId: gId, english: 'Takk', turkish: 'Teşekkürler' },
            { id: gId * 10 + 3, groupId: gId, english: 'Vær så snill', turkish: 'Lütfen' },
            { id: gId * 10 + 4, groupId: gId, english: 'Vann', turkish: 'Su' },
            { id: gId * 10 + 5, groupId: gId, english: 'Hus', turkish: 'Ev' },
            { id: gId * 10 + 6, groupId: gId, english: 'Tid', turkish: 'Zaman' }
        ];
    }).flat(),
    Futbol: (function() {
        const raw = `0;football;n;futbol
1;soccer;n;futbol (Amerikan İngilizcesi)
2;match;n;maç
3;game;n;oyun, maç
4;team;n;takım
5;player;n;oyuncu
6;coach;n;antrenör
7;manager;n;teknik direktör
8;referee;n;hakem
9;linesman;n;yan hakem
10;assistant referee;n;yardımcı hakem
11;fourth official;n;dördüncü hakem
12;VAR;n;video yardımcı hakem sistemi
13;goal;n;gol
14;goalkeeper;n;kaleci
15;defender;n;defans oyuncusu
16;midfielder;n;orta saha oyuncusu
17;forward;n;forvet
18;striker;n;forvet, golcü
19;winger;n;kanat oyuncusu
20;captain;n;kaptan
21;substitute;n;yedek oyuncu
22;substitution;n;oyuncu değişikliği
23;bench;n;yedek kulübesi
24;squad;n;kadro
25;lineup;n;ilk on bir
26;formation;n;diziliş
27;tactics;n;taktik
28;strategy;n;strateji
29;pitch;n;saha
30;field;n;saha, alan
31;stadium;n;stadyum
32;stands;n;tribün
33;terraces;n;tribün (ayakta)
34;crowd;n;seyirci kalabalığı
35;fans;n;taraftarlar
36;supporters;n;taraftarlar
37;spectators;n;izleyiciler
38;goal post;n;kale direği
39;crossbar;n;üst direk
40;net;n;file
41;penalty area;n;ceza sahası
42;penalty box;n;ceza sahası
43;goal area;n;kale sahası
44;six-yard box;n;kale sahası
45;centre circle;n;orta yuvarlak
46;halfway line;n;orta saha çizgisi
47;touchline;n;yan çizgi
48;goal line;n;kale çizgisi
49;corner flag;n;korner bayrağı
50;corner kick;n;korner atışı
51;corner;n;korner
52;throw-in;n;taç atışı
53;free kick;n;serbest vuruş
54;direct free kick;n;doğrudan serbest vuruş
55;indirect free kick;n;dolaylı serbest vuruş
56;penalty kick;n;penaltı vuruşu
57;penalty;n;penaltı
58;spot kick;n;penaltı noktası vuruşu
59;kick-off;n;başlama vuruşu
60;goal kick;n;kale vuruşu
61;offside;n;ofsayt
62;foul;n;faul
63;handball;n;elle oynama
64;tackle;n;müdahale
65;sliding tackle;n;kayarak müdahale
66;yellow card;n;sarı kart
67;red card;n;kırmızı kart
68;booking;n;kart görme
69;sending off;n;oyundan atılma
70;dismissal;n;ihraç edilme
71;suspension;n;ceza (maç yasağı)
72;injury time;n;uzatma dakikası
73;stoppage time;n;uzatma süresi
74;added time;n;eklenen süre
75;extra time;n;uzatma (devre)
76;half-time;n;devre arası
77;full-time;n;maç sonu
78;first half;n;ilk yarı
79;second half;n;ikinci yarı
80;kick-off time;n;başlama saati
81;whistle;n;düdük
82;referee's whistle;n;hakem düdüğü
83;score;n;skor
84;scoreline;n;skor
85;result;n;sonuç
86;draw;n;beraberlik
87;tie;n;berabere kalma
88;win;n;galibiyet
89;victory;n;zafer
90;defeat;n;yenilgi
91;loss;n;kayıp, mağlubiyet
92;clean sheet;n;gol yememe
93;own goal;n;kendi kalesine gol
94;equalizer;n;beraberlik golü
95;winning goal;n;galibiyet golü
96;opener;n;ilk gol
97;brace;n;iki gol (bir oyuncudan)
98;hat-trick;n;hat-trick (üç gol)
99;assist;n;asist
100;cross;n;orta (top)
101;pass;n;pas
102;through ball;n;ara pas
103;long ball;n;uzun top
104;short pass;n;kısa pas
105;backpass;n;geri pas
106;one-two;n;duvar pası
107;dribble;n;çalım
108;shot;n;şut
109;header;n;kafa vuruşu
110;volley;n;vole vuruşu
111;chip;n;lob vuruşu
112;curve shot;n;falso vuruş
113;save;n;kurtarış
114;block;n;blok, kesme
115;clearance;n;uzaklaştırma
116;interception;n;top çalma
117;possession;n;top kontrolü
118;counter-attack;n;kontra atak
119;attack;n;atak, hücum
120;defence;n;defans, savunma
121;marking;n;markaj
122;man-marking;n;adam adama markaj
123;zonal marking;n;bölgesel markaj
124;pressing;n;pres yapma
125;high press;n;yüksek pres
126;build-up play;n;oyun kurma
127;set piece;n;duran top
128;wall;n;duvar (serbest vuruşta)
129;shootout;n;penaltı atışları
130;penalty shootout;n;penaltı atışları
131;extra man;n;sayısal üstünlük
132;transfer;n;transfer
133;transfer window;n;transfer dönemi
134;signing;n;transfer edilen oyuncu
135;contract;n;sözleşme
136;loan;n;kiralık transfer
137;release clause;n;fesih bedeli maddesi
138;market value;n;piyasa değeri
139;fee;n;bonservis bedeli
140;agent;n;menajer
141;scout;n;yetenek avcısı
142;academy;n;altyapı
143;youth team;n;genç takım
144;reserve team;n;rezerv takım
145;first team;n;ilk takım
146;club;n;kulüp
147;league;n;lig
148;division;n;lig kademesi
149;tier;n;kademe (lig)
150;table;n;puan durumu
151;standings;n;puan durumu
152;points;n;puan
153;rank;n;sıralama
154;promotion;n;ligde yükselme
155;relegation;n;ligden düşme
156;title;n;şampiyonluk
157;championship;n;şampiyona
158;trophy;n;kupa
159;cup;n;kupa
160;final;n;final
161;semi-final;n;yarı final
162;quarter-final;n;çeyrek final
163;round of 16;n;son 16
164;group stage;n;grup aşaması
165;knockout stage;n;eleme aşaması
166;play-off;n;play-off
167;friendly match;n;hazırlık maçı
168;derby;n;derbi
169;rivalry;n;rekabet
170;home game;n;iç saha maçı
171;away game;n;deplasman maçı
172;neutral venue;n;tarafsız saha
173;season;n;sezon
174;pre-season;n;sezon öncesi
175;fixture;n;maç programı
176;schedule;n;program
177;ball;n;top
178;boots;n;krampon
179;cleats;n;krampon (Amerikan)
180;shin guards;n;tekmelik
181;jersey;n;forma
182;kit;n;forma takımı
183;home kit;n;iç saha forması
184;away kit;n;deplasman forması
185;shorts;n;şort
186;socks;n;çorap (futbol)
187;goalkeeper gloves;n;kaleci eldiveni
188;armband;n;kaptan kolluğu
189;whistle (referee);n;hakem düdüğü
190;flag;n;bayrak (yan hakem)
191;training;n;antrenman
192;training ground;n;antrenman sahası
193;warm-up;n;ısınma
194;stretching;n;esneme hareketleri
195;fitness;n;fiziksel kondisyon
196;stamina;n;dayanıklılık
197;speed;n;hız
198;agility;n;çeviklik
199;strength;n;güç
200;technique;n;teknik
201;skill;n;yetenek
202;ball control;n;top kontrolü
203;first touch;n;ilk dokunuş
204;finishing;n;bitiricilik
205;composure;n;soğukkanlılık
206;vision;n;oyun görüşü
207;awareness;n;farkındalık
208;positioning;n;pozisyon alma
209;movement;n;hareket (oyunda)
210;timing;n;zamanlama
211;reaction;n;refleks
212;reflexes;n;refleksler
213;anticipation;n;öngörü
214;decision-making;n;karar verme
215;leadership;n;liderlik
216;team spirit;n;takım ruhu
217;morale;n;moral
218;confidence;n;özgüven
219;pressure;n;baskı
220;performance;n;performans
221;form;n;form durumu
222;consistency;n;istikrar
223;momentum;n;ivme
224;comeback;n;geri dönüş
225;turnaround;n;tersine çevirme
226;upset;n;sürpriz sonuç
227;underdog;n;favori dışı takım
228;favourite;n;favori (takım)
229;champion;n;şampiyon
230;runner-up;n;ikincilik
231;top scorer;n;gol kralı
232;golden boot;n;altın ayakkabı
233;best player;n;en iyi oyuncu
234;man of the match;n;maçın adamı
235;player of the season;n;sezonun oyuncusu
236;injury;n;sakatlık
237;recovery;n;iyileşme
238;rehabilitation;n;rehabilitasyon
239;physiotherapist;n;fizyoterapist
240;medical team;n;sağlık ekibi
241;doping;n;doping
242;drug test;n;doping testi
243;commentator;n;spiker
244;pundit;n;yorumcu
245;broadcast;n;yayın
246;live broadcast;n;canlı yayın
247;highlights;n;maç özeti
248;replay;n;tekrar (görüntü)
249;slow motion;n;ağır çekim
250;camera angle;n;kamera açısı
251;press conference;n;basın toplantısı
252;interview;n;röportaj
253;statement;n;açıklama
254;rumour;n;söylenti
255;gossip;n;dedikodu
256;fixture list;n;fikstür
257;kick-off whistle;n;başlama düdüğü
258;final whistle;n;bitiş düdüğü
259;added minutes;n;eklenen dakikalar
260;stalemate;n;çıkmaz, berabere durum
261;deadlock;n;çıkmaz
262;nil-nil;n;sıfır sıfır
263;scoreless draw;n;golsüz beraberlik
264;goal difference;n;averaj
265;goal average;n;averaj
266;head-to-head;n;ikili averaj
267;aggregate score;n;toplam skor
268;extra-time goal;n;uzatma golü
269;golden goal;n;altın gol
270;silver goal;n;gümüş gol
271;sudden death;n;ani ölüm
272;shootout kick;n;penaltı atışı
273;spot-kick taker;n;penaltı kullanıcısı
274;wall (free kick);n;duvar
275;curled shot;n;falso şut
276;bicycle kick;n;makaslı vuruş
277;overhead kick;n;makaslı vuruş
278;nutmeg;n;paçalar arasından top geçirme
279;rainbow flick;n;gökkuşağı çalımı
280;step-over;n;çalım (adım üstü)
281;feint;n;yanıltma hareketi
282;trick;n;numara, çalım
283;flair;n;yaratıcılık, gösteriş
284;creativity;n;yaratıcılık
285;playmaker;n;oyun kurucu
286;deep-lying playmaker;n;geride oynayan oyun kurucu
287;box-to-box midfielder;n;tüm sahayı kullanan orta saha
288;holding midfielder;n;tutucu orta saha
289;defensive midfielder;n;defansif orta saha
290;attacking midfielder;n;ofansif orta saha
291;centre-back;n;stoper
292;full-back;n;bek
293;left-back;n;sol bek
294;right-back;n;sağ bek
295;wing-back;n;kanat beki
296;sweeper;n;libero
297;libero;n;libero
298;lone striker;n;tek forvet
299;target man;n;hedef forvet
300;poacher;n;fırsatçı golcü
301;false nine;n;sahte santrfor
302;number ten;n;on numara
303;trequartista;n;trequartista (İtalyanca on numara)
304;utility player;n;çok yönlü oyuncu
305;to kick;v;tekmelemek, vurmak
306;to score;v;gol atmak
307;to shoot;v;şut çekmek
308;to pass;v;pas vermek
309;to dribble;v;çalım atmak
310;to tackle;v;müdahale etmek
311;to defend;v;savunmak
312;to attack;v;hücum etmek
313;to save (goalkeeper);v;kurtarış yapmak
314;to block;v;bloklamak
315;to head the ball;v;kafayla vurmak
316;to cross;v;orta çekmek
317;to mark;v;markaj yapmak
318;to press;v;pres yapmak
319;to counter-attack;v;kontra atak yapmak
320;to substitute;v;oyuncu değiştirmek
321;to warm up;v;ısınmak
322;to train;v;antrenman yapmak
323;to qualify;v;elenmek dışında kalmak, hak kazanmak
324;to eliminate;v;elemek
325;to advance;v;ilerlemek (turda)
326;to relegate;v;ligden düşürmek
327;to promote;v;ligde yükseltmek
328;to captain;v;kaptanlık yapmak
329;to referee;v;hakemlik yapmak
330;to whistle;v;düdük çalmak
331;to award a penalty;v;penaltı vermek
332;to book;v;kart göstermek
333;to send off;v;oyundan atmak
334;to appeal;v;itiraz etmek
335;to protest;v;protesto etmek
336;to celebrate;v;kutlamak
337;to equalize;v;beraberlik golünü atmak
338;to level the score;v;skoru eşitlemek
339;to take the lead;v;öne geçmek
340;to trail;v;geride olmak
341;to concede;v;gol yemek
342;to clear the ball;v;topu uzaklaştırmak
343;to intercept;v;topu kesmek
344;to control the ball;v;topa hakim olmak
345;to trap the ball;v;topu durdurmak
346;to volley;v;vole vurmak
347;to chip;v;lobla vurmak
348;to curl the ball;v;topa falso vermek
349;to nutmeg;v;paçalar arasından geçirmek
350;to sign (a player);v;transfer etmek
351;to loan out;v;kiralık göndermek
352;to recall;v;geri çağırmak (kiralık)
353;to release;v;sözleşmeyi feshetmek
354;to scout;v;yetenek avcılığı yapmak
355;to recruit;v;oyuncu bulmak, transfer etmek
356;to renew a contract;v;sözleşmeyi yenilemek
357;to extend;v;uzatmak (sözleşme)
358;to terminate;v;feshetmek
359;to injure;v;sakatlamak
360;to get injured;v;sakatlanmak
361;to recover;v;iyileşmek
362;to rehabilitate;v;rehabilite etmek
363;to suspend;v;cezalı yapmak
364;to ban;v;yasaklamak
365;to fine;v;para cezası vermek
366;to disqualify;v;diskalifiye etmek
367;to draw (match);v;berabere kalmak
368;to tie;v;berabere kalmak
369;to lose;v;kaybetmek
370;to win;v;kazanmak
371;to beat;v;yenmek
372;to defeat;v;mağlup etmek
373;to thrash;v;farklı yenmek
374;to hammer;v;farklı yenmek (argo)
375;to demolish;v;ezip geçmek
376;to crush;v;ezmek
377;to knock out;v;elemek (turnuvadan)
378;to top the table;v;puan durumunda ilk sırada olmak
379;to finish (position);v;sırada bitirmek
380;to clinch the title;v;şampiyonluğu kesinleştirmek
381;to secure promotion;v;ligi yükselmeyi garantilemek
382;to face relegation;v;düşme tehlikesi yaşamak
383;to avoid relegation;v;düşmeyi önlemek
384;to line up;v;dizilmek (saha)
385;to start (lineup);v;ilk on birde başlamak
386;to warm the bench;v;yedek kalmak
387;to come off the bench;v;oyuna yedekten girmek
388;to be subbed off;v;oyundan alınmak
389;to come on;v;oyuna girmek
390;to go off;v;oyundan çıkmak
391;to be offside;v;ofsayt olmak
392;to appeal for offside;v;ofsayt itirazında bulunmak
393;World Cup;n;Dünya Kupası
394;European Championship;n;Avrupa Şampiyonası
395;Champions League;n;Şampiyonlar Ligi
396;Europa League;n;Avrupa Ligi
397;Conference League;n;Konferans Ligi
398;Premier League;n;Premier Lig
399;La Liga;n;La Liga
400;Serie A;n;Serie A
401;Bundesliga;n;Bundesliga
402;Ligue 1;n;Ligue 1
403;Super Lig;n;Süper Lig
404;FA Cup;n;FA Kupası
405;League Cup;n;Lig Kupası
406;Copa America;n;Copa America
407;AFCON;n;Afrika Uluslar Kupası
408;Club World Cup;n;Kulüpler Dünya Kupası
409;national team;n;milli takım
410;international match;n;milli maç
411;friendly international;n;hazırlık milli maçı
412;qualifier;n;eleme maçı
413;qualifying round;n;eleme turu
414;seeding;n;kura eşleştirmesi
415;draw (fixture);n;kura çekimi
416;pot;n;kura potu
417;bracket;n;turnuva ağacı
418;wildcard;n;joker takım
419;host nation;n;ev sahibi ülke
420;host city;n;ev sahibi şehir
421;venue;n;maç sahası
422;opening ceremony;n;açılış töreni
423;closing ceremony;n;kapanış töreni
424;mascot;n;maskot
425;anthem;n;marş
426;flag bearer;n;bayrak taşıyıcı
427;medal;n;madalya
428;podium;n;podyum
429;trophy presentation;n;kupa töreni
430;lap of honour;n;onur turu
431;parade;n;şampiyonluk kutlaması
432;open-top bus;n;üstü açık otobüs turu
433;academy player;n;altyapı oyuncusu
434;homegrown player;n;yerli yetişme oyuncusu
435;foreign player;n;yabancı oyuncu
436;naturalized player;n;vatandaşlığa geçmiş oyuncu
437;veteran;n;tecrübeli oyuncu
438;rookie;n;yeni oyuncu, çaylak
439;prodigy;n;yetenekli genç oyuncu
440;wonderkid;n;harika çocuk
441;legend;n;efsane
442;icon;n;ikon
443;ballon d'or;n;altın top
444;golden ball;n;altın top (turnuva)
445;best young player award;n;en iyi genç oyuncu ödülü
446;team of the season;n;sezonun on birisi
447;all-star team;n;yıldızlar takımı
448;fantasy football;n;fantezi futbol
449;betting odds;n;bahis oranları
450;bookmaker;n;bahis şirketi
451;gambling;n;kumar, bahis
452;match-fixing;n;şike
453;corruption (football);n;yolsuzluk (futbol)
454;scandal;n;skandal
455;racism in football;n;futbolda ırkçılık
456;discrimination;n;ayrımcılık
457;fair play;n;fair play, centilmenlik
458;sportsmanship;n;sportmenlik
459;rivalry match;n;rekabet maçı
460;classic (match);n;klasik (maç)
461;El Clasico;n;El Clasico
462;local derby;n;şehir derbisi
463;title decider;n;şampiyonluk maçı
464;six-pointer;n;kritik puan maçı
465;must-win game;n;kazanılması zorunlu maç
466;dead rubber;n;sonucu belirsiz olmayan maç
467;dead heat;n;başa baş yarış
468;nail-biter;n;heyecanlı, gerilimli maç
469;thriller;n;heyecanlı maç
470;blowout;n;farklı sonuçlanan maç
471;rout;n;ağır mağlubiyet
472;comeback win;n;geriden gelme galibiyeti`;
        return raw.split('\n').filter(l => l.trim()).map((line, i) => {
            const parts = line.split(';');
            return {
                id: i + 1,
                groupId: Math.floor(i / 100) + 1,
                english: parts[1] ? parts[1].trim() : '',
                turkish: parts[3] ? parts[3].trim() : ''
            };
        });
    })()
};

// ── DATA LOADING FUNCTIONS ──
function parseCsvText(csvText) {
    const lines = csvText.split(/\r?\n/);
    const parsed = [];
    const extractedVerbs = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(';');
        if (parts.length < 2) continue;

        const english = parts[0]?.trim();
        const turkish = parts[1]?.trim();
        let v1 = parts[2]?.trim();
        let v2 = parts[3]?.trim();
        let v3 = parts[4]?.trim();

        if (!english || !turkish) continue;

        if (v1 === '-' || !v1) v1 = null;
        if (v2 === '-' || !v2) v2 = null;
        if (v3 === '-' || !v3) v3 = null;

        // Group size: ~100 words per group
        const groupId = Math.floor(parsed.length / 100) + 1;

        const wordItem = {
            id: parsed.length + 1,
            groupId,
            english,
            turkish,
            v1,
            v2,
            v3
        };
        parsed.push(wordItem);

        if (v1 && v2 && v3) {
            extractedVerbs.push({ v1, v2, v3, tr: turkish });
        }
    }

    return { words: parsed, verbs: extractedVerbs };
}

function parseAlmancaCsv(csvText) {
    const lines = csvText.split(/\r?\n/);
    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(';');
        if (parts.length < 4) continue;
        const wordItem = {
            id: parsed.length + 1,
            groupId: Math.floor(parsed.length / 100) + 1,
            english: parts[1]?.trim() || '', // target word
            turkish: parts[3]?.trim() || ''
        };
        if (wordItem.english && wordItem.turkish) {
            parsed.push(wordItem);
        }
    }
    TOTAL_GROUPS_DE = Math.max(1, Math.floor(parsed.length / 100) + (parsed.length % 100 > 0 ? 1 : 0));
    return { words: parsed, verbs: [] };
}

function parseFransizcaCsv(csvText) {
    const lines = csvText.split(/\r?\n/);
    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(';');
        if (parts.length < 4) continue;
        const wordItem = {
            id: parsed.length + 1,
            groupId: Math.floor(parsed.length / 100) + 1,
            english: parts[1]?.trim() || '', // target word
            turkish: parts[3]?.trim() || ''
        };
        if (wordItem.english && wordItem.turkish) {
            parsed.push(wordItem);
        }
    }
    TOTAL_GROUPS_FR = Math.max(1, Math.floor(parsed.length / 100) + (parsed.length % 100 > 0 ? 1 : 0));
    return { words: parsed, verbs: [] };
}

function parseIsvecceCsv(csvText) {
    const lines = csvText.split(/\r?\n/);
    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        let inQuotes = false;
        let currentPart = "";
        let parts = [];
        for (let j = 0; j < line.length; j++) {
            if (line[j] === '"') {
                inQuotes = !inQuotes;
            } else if (line[j] === ';' && !inQuotes) {
                parts.push(currentPart);
                currentPart = "";
            } else {
                currentPart += line[j];
            }
        }
        parts.push(currentPart);

        if (parts.length < 4) continue;
        const wordItem = {
            id: parsed.length + 1,
            groupId: Math.floor(parsed.length / 100) + 1,
            english: parts[2]?.trim() || '', // target word (İsveççe Anlamı)
            turkish: parts[3]?.trim() || ''
        };
        if (wordItem.english && wordItem.turkish) {
            parsed.push(wordItem);
        }
    }
    TOTAL_GROUPS_SV = Math.max(1, Math.floor(parsed.length / 100) + (parsed.length % 100 > 0 ? 1 : 0));
    return { words: parsed, verbs: [] };
}

async function fetchLocalCsvData() {
    try {
        const response = await fetch('./Lumına Kelime/İngilizce.csv');
        if (!response.ok) throw new Error(`CSV HTTP Hatası: ${response.status}`);
        const csvText = await response.text();
        return parseCsvText(csvText);
    } catch (err) {
        console.warn("⚠️ Oxford 3000 CSV okunamadı:", err.message);
        return null;
    }
}

async function loadLanguageData(langName) {
    currentLanguage = langName;

    // İngilizce için önce /api/words endpoint'ini dene
    if (langName === 'English') {
        const apiWordsLoaded = await loadWordsFromApi();
        if (apiWordsLoaded) {
            console.log(`✅ English kelimeleri /api/words endpoint'inden başarıyla yüklendi.`);
            return; // allWords zaten loadWordsFromApi() içinde dolduruldu
        }
        console.warn('⚠️ /api/words başarısız, /api/English endpoint\'i deneniyor...');
    }

    // Almanca: Önce SQL API'den çek, başarısız olursa CSV'ye düş
    if (langName === 'German') {
        try {
            console.log('🔄 Almanca kelimeler SQL API\'den çekiliyor...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(`${API_BASE_URL}/words/german`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (response.ok) {
                const apiData = await response.json();
                if (apiData && apiData.length > 0) {
                    wordsData = apiData;
                    TOTAL_GROUPS_DE = Math.max(1, Math.ceil(apiData.length / 100));
                    console.log(`✅ Almanca: ${apiData.length} kelime SQL'den yüklendi, ${TOTAL_GROUPS_DE} grup.`);
                } else { throw new Error('API boş veri döndü'); }
            } else { throw new Error(`HTTP ${response.status}`); }
        } catch(e) {
            console.warn('⚠️ Almanca API başarısız, CSV\'ye geçiliyor:', e.message);
            try {
                const response = await fetch('./Lumına Kelime/Almanca.csv');
                if (response.ok) {
                    const text = await response.text();
                    const res = parseAlmancaCsv(text);
                    wordsData = res.words;
                } else { wordsData = FALLBACK_DATA.German; }
            } catch(e2) { wordsData = FALLBACK_DATA.German; }
        }
    // Fransızca: Önce SQL API'den çek, başarısız olursa CSV'ye düş
    } else if (langName === 'French') {
        try {
            console.log('🔄 Fransızca kelimeler SQL API\'den çekiliyor...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(`${API_BASE_URL}/words/french`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (response.ok) {
                const apiData = await response.json();
                if (apiData && apiData.length > 0) {
                    wordsData = apiData;
                    TOTAL_GROUPS_FR = Math.max(1, Math.ceil(apiData.length / 100));
                    console.log(`✅ Fransızca: ${apiData.length} kelime SQL'den yüklendi, ${TOTAL_GROUPS_FR} grup.`);
                } else { throw new Error('API boş veri döndü'); }
            } else { throw new Error(`HTTP ${response.status}`); }
        } catch(e) {
            console.warn('⚠️ Fransızca API başarısız, CSV\'ye geçiliyor:', e.message);
            try {
                const response = await fetch('./Lumına Kelime/Fransızca.csv');
                if (response.ok) {
                    const text = await response.text();
                    const res = parseFransizcaCsv(text);
                    wordsData = res.words;
                } else { wordsData = FALLBACK_DATA.French; }
            } catch(e2) { wordsData = FALLBACK_DATA.French; }
        }
    } else if (langName === 'Swedish') {
        try {
            console.log('🔄 İsveççe kelimeler SQL API\'den çekiliyor...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(`${API_BASE_URL}/words/swedish`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (response.ok) {
                const apiData = await response.json();
                if (apiData && apiData.length > 0) {
                    wordsData = apiData;
                    TOTAL_GROUPS_SV = Math.max(1, Math.ceil(apiData.length / 100));
                    console.log(`✅ İsveççe: ${apiData.length} kelime SQL'den yüklendi, ${TOTAL_GROUPS_SV} grup.`);
                } else { throw new Error('API boş veri döndü'); }
            } else { throw new Error(`HTTP ${response.status}`); }
        } catch(e) {
            console.warn('⚠️ İsveççe API başarısız, CSV\'ye geçiliyor:', e.message);
            try {
                const response = await fetch('./Lumına Kelime/Isvecce.csv');
                if (response.ok) {
                    const text = await response.text();
                    const res = parseIsvecceCsv(text);
                    wordsData = res.words;
                } else {
                    wordsData = FALLBACK_DATA.Norwegian || []; // Fallback boş veya norwegian
                }
            } catch(e2) { wordsData = []; }
        }
    } else if (langName === 'Futbol') {
        wordsData = FALLBACK_DATA.Futbol;
        TOTAL_GROUPS_FUTBOL = Math.ceil(wordsData.length / 100);
    } else {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500);
            const response = await fetch(`${API_BASE_URL}/${langName}`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP Hatası: ${response.status}`);
            wordsData = await response.json();
            console.log(`✅ ${langName} sunucudan yüklendi:`, wordsData.length);
        } catch (error) {
            console.warn(`⚠️ ${langName} sunucudan alınamadı, yerel verisetine geçiliyor:`, error.message);

            if (langName === 'English') {
                const csvResult = await fetchLocalCsvData();
                if (csvResult && csvResult.words.length > 0) {
                    wordsData = csvResult.words;
                    if (csvResult.verbs.length > 0) {
                        verbsLabData = csvResult.verbs;
                    }
                    console.log(`✅ English (Oxford 3000) yerel CSV dosyasından yüklendi:`, wordsData.length);
                } else {
                    wordsData = FALLBACK_DATA[langName] || FALLBACK_DATA.English;
                }
            } else {
                wordsData = FALLBACK_DATA[langName] || FALLBACK_DATA.English;
            }
        }
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
    const titleMap = {
        'English': 'İNGİLİZCE',
        'Spanish': 'İSPANYOLCA',
        'German': 'ALMANCA',
        'French': 'FRANSIZCA',
        'Norwegian': 'NORVEÇÇE',
        'Swedish': 'İSVEÇÇE',
        'Futbol': 'FUTBOL'
    };
    const trName = titleMap[langName] || '3000';
    document.querySelectorAll('.logo-title').forEach(el => {
        el.innerHTML = `LUMINA <span class="accent">${trName}</span>`;
    });
}

// ── /api/words ENDPOINT'İNDEN İNGİLİZCE KELİMELERİ ÇEK ──
// Bu fonksiyon C# API'nizin /api/words endpoint'inden tüm kelimeleri çeker
// ve mevcut Lumina sistemiyle entegre eder.
async function loadWordsFromApi() {
    try {
        console.log('🔄 /api/words endpoint\'inden kelimeler çekiliyor...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(`${API_BASE_URL}/words`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Kelimeler sunucudan alınamadı! HTTP: ${response.status}`);
        }

        const apiWords = await response.json();
        console.log('✅ Veritabanından gelen kelimeler (/api/words):', apiWords);
        console.log(`📊 Toplam ${apiWords.length} kelime alındı.`);

        // API'den gelen kelimeleri Lumina formatına dönüştür
        // Yeni API: { id, groupId, english, turkish } formatında döner
        if (apiWords && apiWords.length > 0) {
            wordsData = apiWords.map((w, idx) => ({
                id: w.id || idx + 1,
                groupId: w.groupId || Math.min(30, Math.floor(idx / 100) + 1),
                english: w.english || w.original || w.word || w.en || '',
                turkish: w.turkish || w.translated || w.tr || '',
                v1: w.v1 || null,
                v2: w.v2 || null,
                v3: w.v3 || null
            }));

            // allWords nesnesini güncelle (grup bazlı)
            allWords = {};
            wordsData.forEach(word => {
                const key = `group${word.groupId}`;
                if (!allWords[key]) allWords[key] = [];
                allWords[key].push({
                    id: word.id,
                    en: word.english,
                    tr: word.turkish,
                    v1: word.v1,
                    v2: word.v2,
                    v3: word.v3
                });
            });

            TOTAL_GROUPS = Object.keys(allWords).length;
            console.log(`✅ İngilizce: ${wordsData.length} kelime SQL'den yüklendi, ${TOTAL_GROUPS} grup.`);
            return true;
        }

        return false;
    } catch (error) {
        console.warn('⚠️ /api/words bağlantı hatası (yerel veriseti kullanılacak):', error.message);
        return false;
    }
}

async function loadVerbsLabData() {
    if (verbsLabData.length > 0) return; // Zaten CSV veya API'den yüklendi
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const response = await fetch(`${API_BASE_URL}/VerbsLab`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP Hatası: ${response.status}`);
        verbsLabData = await response.json();
        console.log("✅ VerbsLab sunucudan yüklendi:", verbsLabData.length);
    } catch (error) {
        console.warn("⚠️ VerbsLab sunucudan alınamadı, yerel fiiller kullanılıyor:", error.message);
        if (verbsLabData.length === 0) {
            verbsLabData = DEFAULT_VERBS_LAB;
        }
    }
}

// ── AUTH MANAGER ──
const AuthManager = (() => {
    const LS_USERS = 'lumina_users';
    const LS_SESSION = 'lumina_session';

    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    function getUsers() {
        try {
            return JSON.parse(localStorage.getItem(LS_USERS) || '[]');
        } catch { return []; }
    }

    function saveUsers(users) {
        localStorage.setItem(LS_USERS, JSON.stringify(users));
    }

    function ensureAdminExists() {
        const users = getUsers();
        const adminExists = users.some(u => u.email === 'a@l.com');
        if (!adminExists) {
            users.push({
                email: 'a@l.com',
                name: 'Admin',
                passwordHash: simpleHash('123456'),
                role: 'admin',
                createdAt: new Date().toISOString()
            });
            saveUsers(users);
        }
    }

    function signUp(email, password, name) {
        email = email.trim().toLowerCase();
        if (!email || !password) return { ok: false, error: 'E-posta ve şifre zorunludur.' };
        if (password.length < 6) return { ok: false, error: 'Şifre en az 6 karakter olmalıdır.' };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Geçerli bir e-posta adresi girin.' };

        const users = getUsers();
        if (users.some(u => u.email === email)) {
            return { ok: false, error: 'Bu e-posta adresi zaten kayıtlı.' };
        }

        const newUser = {
            email,
            name: name ? name.trim() : email.split('@')[0],
            passwordHash: simpleHash(password),
            role: 'user',
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        saveUsers(users);
        return { ok: true, user: newUser };
    }

    function signIn(email, password) {
        email = email.trim().toLowerCase();
        const users = getUsers();
        const user = users.find(u => u.email === email);
        if (!user) return { ok: false, error: 'Bu e-posta adresi ile kayıtlı hesap bulunamadı.' };
        if (user.passwordHash !== simpleHash(password)) {
            return { ok: false, error: 'Şifre hatalı. Lütfen tekrar deneyin.' };
        }

        const session = { email: user.email, name: user.name, role: user.role, loginAt: new Date().toISOString() };
        localStorage.setItem(LS_SESSION, JSON.stringify(session));
        return { ok: true, user: session };
    }

    function signOut() {
        localStorage.removeItem(LS_SESSION);
    }

    function recoverPassword(email) {
        email = email.trim().toLowerCase();
        const users = getUsers();
        const user = users.find(u => u.email === email);
        if (!user) return { ok: false, error: 'Bu e-posta ile kayıtlı hesap bulunamadı.' };

        return {
            ok: true,
            message: `✅ Hesabınız bulundu! Doğrudan giriş yapabilirsiniz.\nE-posta: ${user.email}`
        };
    }

    function getSession() {
        try {
            return JSON.parse(localStorage.getItem(LS_SESSION) || 'null');
        } catch { return null; }
    }

    function isLoggedIn() { return getSession() !== null; }

    ensureAdminExists();

    return { signUp, signIn, signOut, recoverPassword, getSession, isLoggedIn, simpleHash };
})();

// ── AUTH UI FUNCTIONS ──
function authShowPanel(panel) {
    document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));

    ['siError', 'suError', 'suSuccess', 'fpError', 'fpSuccess'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.add('hidden'); el.textContent = ''; }
    });

    if (panel === 'signin') {
        document.getElementById('panelSignIn').classList.add('active');
        document.getElementById('tabSignIn').classList.add('active');
        document.getElementById('siEmail').focus();
    } else if (panel === 'signup') {
        document.getElementById('panelSignUp').classList.add('active');
        document.getElementById('tabSignUp').classList.add('active');
        document.getElementById('suName').focus();
    } else if (panel === 'forgot') {
        document.getElementById('panelForgot').classList.add('active');
        document.getElementById('fpEmail').focus();
    }
}

function authSetLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.style.opacity = loading ? '0.7' : '1';
}

function authShowMsg(id, msg, isError) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
}

function authSignIn() {
    const email = document.getElementById('siEmail').value;
    const password = document.getElementById('siPassword').value;
    const errEl = document.getElementById('siError');

    errEl.classList.add('hidden');

    if (!email || !password) {
        authShowMsg('siError', '⚠️ Lütfen tüm alanları doldurun.', true);
        return;
    }

    authSetLoading('btnSignIn', true);
    setTimeout(() => {
        const result = AuthManager.signIn(email, password);
        authSetLoading('btnSignIn', false);
        if (result.ok) {
            authGoToDashboard(result.user);
        } else {
            authShowMsg('siError', '⚠️ ' + result.error, true);
        }
    }, 200);
}

function authSignUp() {
    const name = document.getElementById('suName').value;
    const email = document.getElementById('suEmail').value;
    const password = document.getElementById('suPassword').value;

    document.getElementById('suError').classList.add('hidden');
    document.getElementById('suSuccess').classList.add('hidden');

    if (!email || !password) {
        authShowMsg('suError', '⚠️ E-posta ve şifre zorunludur.', true);
        return;
    }

    authSetLoading('btnSignUp', true);
    setTimeout(() => {
        const result = AuthManager.signUp(email, password, name);
        authSetLoading('btnSignUp', false);
        if (result.ok) {
            authShowMsg('suSuccess', '✅ Hesabınız oluşturuldu! Giriş yapılıyor…', false);
            setTimeout(() => {
                const loginResult = AuthManager.signIn(email, password);
                if (loginResult.ok) authGoToDashboard(loginResult.user);
            }, 600);
        } else {
            authShowMsg('suError', '⚠️ ' + result.error, true);
        }
    }, 200);
}

function authForgotPassword() {
    const email = document.getElementById('fpEmail').value;
    document.getElementById('fpError').classList.add('hidden');
    document.getElementById('fpSuccess').classList.add('hidden');

    if (!email) {
        authShowMsg('fpError', '⚠️ Lütfen e-posta adresinizi girin.', true);
        return;
    }

    authSetLoading('btnForgot', true);
    setTimeout(() => {
        const result = AuthManager.recoverPassword(email);
        authSetLoading('btnForgot', false);
        if (result.ok) {
            authShowMsg('fpSuccess', result.message, false);
        } else {
            authShowMsg('fpError', '⚠️ ' + result.error, true);
        }
    }, 200);
}

function authQuickAdmin() {
    document.getElementById('siEmail').value = 'a@l.com';
    document.getElementById('siPassword').value = '123456';
    authShowPanel('signin');
    authSignIn();
}

// ── GOOGLE SIGN-IN FUNCTIONS ──
function initGoogleSignIn() {
    // Google Identity Services API'nin yüklenmesini bekle
    if (typeof google === 'undefined' || !google.accounts) {
        // API henüz yüklenmedi, biraz bekleyip tekrar dene
        setTimeout(initGoogleSignIn, 200);
        return;
    }
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
    });
}

function decodeJwtPayload(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map(c =>
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('JWT decode hatası:', e);
        return null;
    }
}

function handleGoogleCredentialResponse(response) {
    const payload = decodeJwtPayload(response.credential);
    if (!payload) {
        authShowMsg('siError', '⚠️ Google girişi başarısız oldu. Lütfen tekrar deneyin.', true);
        return;
    }

    const email = payload.email;
    const name = payload.name || email.split('@')[0];
    const picture = payload.picture || '';

    // Kullanıcıyı lumina_users listesine ekle/güncelle
    const LS_USERS = 'lumina_users';
    let users = [];
    try { users = JSON.parse(localStorage.getItem(LS_USERS) || '[]'); } catch { users = []; }

    const existingIndex = users.findIndex(u => u.email === email);
    const userData = {
        email,
        name,
        picture,
        authProvider: 'google',
        role: 'user',
        createdAt: existingIndex >= 0 ? users[existingIndex].createdAt : new Date().toISOString()
    };

    if (existingIndex >= 0) {
        // Mevcut kullanıcıyı güncelle ama rolünü koru
        userData.role = users[existingIndex].role || 'user';
        users[existingIndex] = { ...users[existingIndex], ...userData };
    } else {
        users.push(userData);
    }
    localStorage.setItem(LS_USERS, JSON.stringify(users));

    // Session oluştur
    const session = {
        email,
        name,
        picture,
        role: userData.role,
        authProvider: 'google',
        loginAt: new Date().toISOString()
    };
    localStorage.setItem('lumina_session', JSON.stringify(session));

    // İlerleme verisi migration: eski genel anahtarı kullanıcıya özel anahtara taşı
    migrateProgressToUser(email);

    // Dashboard'a yönlendir
    authGoToDashboard(session);
}

function googleSignIn() {
    if (typeof google === 'undefined' || !google.accounts) {
        authShowMsg('siError', '⚠️ Google servisi henüz yüklenemedi. Sayfayı yenileyip tekrar deneyin.', true);
        return;
    }
    google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // One Tap görüntülenemedi, fallback: popup modunda aç
            const client = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'email profile',
                callback: (tokenResponse) => {
                    // Token ile kullanıcı bilgilerini al
                    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { 'Authorization': 'Bearer ' + tokenResponse.access_token }
                    })
                        .then(res => res.json())
                        .then(userInfo => {
                            const fakeCredentialPayload = {
                                email: userInfo.email,
                                name: userInfo.name,
                                picture: userInfo.picture
                            };
                            // Doğrudan handleGoogleCredentialResponse benzeri işlem yap
                            const email = fakeCredentialPayload.email;
                            const name = fakeCredentialPayload.name || email.split('@')[0];
                            const picture = fakeCredentialPayload.picture || '';

                            const LS_USERS = 'lumina_users';
                            let users = [];
                            try { users = JSON.parse(localStorage.getItem(LS_USERS) || '[]'); } catch { users = []; }

                            const existingIndex = users.findIndex(u => u.email === email);
                            const userData = {
                                email, name, picture,
                                authProvider: 'google',
                                role: 'user',
                                createdAt: existingIndex >= 0 ? users[existingIndex].createdAt : new Date().toISOString()
                            };

                            if (existingIndex >= 0) {
                                userData.role = users[existingIndex].role || 'user';
                                users[existingIndex] = { ...users[existingIndex], ...userData };
                            } else {
                                users.push(userData);
                            }
                            localStorage.setItem(LS_USERS, JSON.stringify(users));

                            const session = {
                                email, name, picture,
                                role: userData.role,
                                authProvider: 'google',
                                loginAt: new Date().toISOString()
                            };
                            localStorage.setItem('lumina_session', JSON.stringify(session));
                            migrateProgressToUser(email);
                            authGoToDashboard(session);
                        })
                        .catch(err => {
                            console.error('Google userinfo hatası:', err);
                            authShowMsg('siError', '⚠️ Google girişi sırasında bir hata oluştu.', true);
                        });
                }
            });
            client.requestAccessToken();
        }
    });
}

function migrateProgressToUser(email) {
    if (!email) return;
    const langKeys = [
        { base: 'lumina_progress_en', suffix: '_en' },
        { base: 'lumina_progress_es', suffix: '_es' },
        { base: 'lumina_progress_de', suffix: '_de' },
        { base: 'lumina_progress_fr', suffix: '_fr' },
        { base: 'lumina_progress_no', suffix: '_no' },
        { base: 'lumina_progress_futbol', suffix: '_futbol' }
    ];

    langKeys.forEach(({ base }) => {
        const userKey = base + '_' + email;
        // Eğer kullanıcıya özel anahtar henüz yoksa ve genel anahtar varsa, taşı
        if (!localStorage.getItem(userKey)) {
            const oldData = localStorage.getItem(base);
            if (oldData) {
                localStorage.setItem(userKey, oldData);
            }
        }
    });
}

function authToggleEye(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = typeof btnId === 'string' ? document.getElementById(btnId) : btnId;
    if (input.type === 'password') {
        input.type = 'text';
        if (btn) btn.textContent = '🙈';
    } else {
        input.type = 'password';
        if (btn) btn.textContent = '👁';
    }
}

function authGoToDashboard(user) {
    updateUserUI(user);
    const topBar = document.getElementById('globalTopBar');
    if (topBar) topBar.classList.remove('hidden');
    NotificationManager.addNotification('Hoş Geldiniz', `${user.name || user.email} ile oturum açıldı.`, '👋');
    showScreen('languageScreen');
}

// ── ENTER KEY IN AUTH FORMS ──
document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    const activePanel = document.querySelector('.auth-panel.active');
    if (!activePanel) return;
    if (activePanel.id === 'panelSignIn') { authSignIn(); e.preventDefault(); }
    if (activePanel.id === 'panelSignUp') { authSignUp(); e.preventDefault(); }
    if (activePanel.id === 'panelForgot') { authForgotPassword(); e.preventDefault(); }
});

// ── DYNAMIC HELPERS ──
function activeTotalGroups() {
    if (state.lang === 'es') return TOTAL_GROUPS_ES;
    if (state.lang === 'de') return TOTAL_GROUPS_DE;
    if (state.lang === 'fr') return TOTAL_GROUPS_FR;
    if (state.lang === 'no') return TOTAL_GROUPS_NO;
    if (state.lang === 'futbol') return TOTAL_GROUPS_FUTBOL;

    if (wordsData && wordsData.length > 0) {
        const groups = wordsData.map(w => w.groupId || 1);
        return Math.max(...groups, 1);
    }
    return TOTAL_GROUPS;
}

function activeLSKey() {
    let baseKey = LS_KEY;
    if (state.lang === 'es') baseKey = LS_KEY_ES;
    else if (state.lang === 'de') baseKey = LS_KEY_DE;
    else if (state.lang === 'fr') baseKey = LS_KEY_FR;
    else if (state.lang === 'no') baseKey = LS_KEY_NO;
    else if (state.lang === 'futbol') baseKey = LS_KEY_FUTBOL;

    // Kullanıcıya özel anahtar: lumina_progress_en_user@email.com
    const session = AuthManager.getSession();
    if (session && session.email) {
        return baseKey + '_' + session.email;
    }
    return baseKey;
}

function activeGroupName(i) {
    return `Grup ${i}`;
}

// ── LOCALSTORAGE HELPERS ──
function loadProgress() {
    try {
        const raw = localStorage.getItem(activeLSKey());
        if (!raw) return buildEmptyProgress();
        const p = JSON.parse(raw);
        if (!p.timeLogs) p.timeLogs = [];
        return p;
    } catch {
        return buildEmptyProgress();
    }
}

function buildEmptyProgress() {
    const p = { timeLogs: [] };
    for (let i = 1; i <= activeTotalGroups(); i++) {
        p[`group${i}`] = { known: [], errors: [], unsure: [], testErrors: [], writeErrors: [] };
    }
    return p;
}

function saveProgress(progress) {
    localStorage.setItem(activeLSKey(), JSON.stringify(progress));
}

function getGroupProgress(progress, groupNum) {
    const key = `group${groupNum}`;
    if (!progress[key]) progress[key] = { known: [], errors: [], unsure: [], testErrors: [], writeErrors: [] };
    if (!progress[key].unsure) progress[key].unsure = [];
    if (!progress[key].errors) progress[key].errors = [];
    if (!progress[key].known) progress[key].known = [];
    if (!progress[key].testErrors) progress[key].testErrors = [];
    if (!progress[key].writeErrors) progress[key].writeErrors = [];
    return progress[key];
}

// ── SCREENS MANAGER ──
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (!el) return;
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

    // Dil seçim ekranı açılınca kelime sayılarını SQL API'den çek
    if (id === 'languageScreen') {
        fetchAndShowLangCounts();
    }
}

// Dil butonlarındaki kelime sayılarını SQL API'den dinamik olarak günceller
async function fetchAndShowLangCounts() {
    // İngilizce sayısını çek
    try {
        const ctrlEn = new AbortController();
        setTimeout(() => ctrlEn.abort(), 3000);
        const resEn = await fetch(`${API_BASE_URL}/words/count`, { signal: ctrlEn.signal });
        if (resEn.ok) {
            const dataEn = await resEn.json();
            const countEn = dataEn.count || 0;
            const grupsEn = Math.max(1, Math.ceil(countEn / 100));
            const p = document.getElementById('langDescEn');
            if (p) p.textContent = `${countEn.toLocaleString('tr-TR')} Kelime • ${grupsEn} Grup`;
            TOTAL_GROUPS = grupsEn;
        }
    } catch(e) { /* sessizce geç */ }

    // Almanca sayısını çek
    try {
        const ctrlDe = new AbortController();
        setTimeout(() => ctrlDe.abort(), 3000);
        const resDe = await fetch(`${API_BASE_URL}/words/german/count`, { signal: ctrlDe.signal });
        if (resDe.ok) {
            const dataDe = await resDe.json();
            const countDe = dataDe.count || 0;
            const grupsDe = Math.max(1, Math.ceil(countDe / 100));
            const p = document.getElementById('langDescDe');
            if (p) p.textContent = `${countDe.toLocaleString('tr-TR')} Kelime • ${grupsDe} Grup`;
            TOTAL_GROUPS_DE = grupsDe;
        }
    } catch(e) { /* sessizce geç */ }

    // Fransızca sayısını çek
    try {
        const ctrlFr = new AbortController();
        setTimeout(() => ctrlFr.abort(), 3000);
        const resFr = await fetch(`${API_BASE_URL}/words/french/count`, { signal: ctrlFr.signal });
        if (resFr.ok) {
            const dataFr = await resFr.json();
            const countFr = dataFr.count || 0;
            const grupsFr = Math.max(1, Math.ceil(countFr / 100));
            const p = document.getElementById('langDescFr');
            if (p) p.textContent = `${countFr.toLocaleString('tr-TR')} Kelime • ${grupsFr} Grup`;
            TOTAL_GROUPS_FR = grupsFr;
        }
    } catch(e) { /* sessizce geç */ }

    // İsveççe sayısını çek
    try {
        const ctrlSv = new AbortController();
        setTimeout(() => ctrlSv.abort(), 3000);
        const resSv = await fetch(`${API_BASE_URL}/words/swedish/count`, { signal: ctrlSv.signal });
        if (resSv.ok) {
            const dataSv = await resSv.json();
            const countSv = dataSv.count || 0;
            const grupsSv = Math.max(1, Math.ceil(countSv / 100));
            const p = document.getElementById('langDescSv');
            if (p) p.textContent = `${countSv.toLocaleString('tr-TR')} Kelime • ${grupsSv} Grup`;
            TOTAL_GROUPS_SV = grupsSv;
        }
    } catch(e) { /* sessizce geç */ }

    // İspanyolca ve Norveççe (şu an API yok, yerel veriyle kalıyor)
    const pEs = document.getElementById('langDescEs');
    if (pEs) pEs.textContent = `900 Kelime • 9 Grup`; // Fallback data
    const pNo = document.getElementById('langDescNo');
    if (pNo) pNo.textContent = `500 Kelime • 5 Grup`; // Fallback data
    const pFutbol = document.getElementById('langDescFutbol');
    if (pFutbol) pFutbol.textContent = `${FALLBACK_DATA.Futbol.length} Kelime • ${Math.ceil(FALLBACK_DATA.Futbol.length / 100)} Grup`; // Fallback data
}

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
                    <span class="tl-item-en" style="display:flex; align-items:center; gap:6px;">${icon} ${l.en}</span>
                    <span class="tl-item-tr">${l.tr}</span>
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
        const langMapTitle = {
            'en': 'İNGİLİZCE',
            'es': 'İSPANYOLCA',
            'de': 'ALMANCA',
            'fr': 'FRANSIZCA',
            'no': 'NORVEÇÇE',
            'sv': 'İSVEÇÇE',
            'futbol': 'FUTBOL'
        };
        const langNameUpper = langMapTitle[state.lang] || 'İNGİLİZCE';
        dashLogoTitle.innerHTML = `LUMINA <span class="accent">${langNameUpper}</span>`;
    }

    const dashLogoSub = document.querySelector('#dashboard .logo-sub');
    if (dashLogoSub) {
        if (state.lang === 'es') {
            dashLogoSub.textContent = `Kişisel İspanyolca Kelime Sistemi · ${totalGrp} Grup · ${totalWords} Kelime`;
        } else if (state.lang === 'de') {
            dashLogoSub.textContent = `Kişisel Almanca Kelime Sistemi · ${totalGrp} Grup · ${totalWords} Kelime`;
        } else if (state.lang === 'fr') {
            dashLogoSub.textContent = `Kişisel Fransızca Kelime Sistemi · ${totalGrp} Grup · ${totalWords} Kelime`;
        } else if (state.lang === 'no') {
            dashLogoSub.textContent = `Kişisel Norveççe Kelime Sistemi · ${totalGrp} Grup · ${totalWords} Kelime`;
        } else if (state.lang === 'sv') {
            dashLogoSub.textContent = `Kişisel İsveççe Kelime Sistemi · ${totalGrp} Grup · ${totalWords} Kelime`;
        } else if (state.lang === 'futbol') {
            dashLogoSub.textContent = `Futbol Kelimeleri · ${totalGrp} Grup · ${totalWords} Kelime`;
        } else {
            dashLogoSub.textContent = `Kişisel İngilizce Kelime Sistemi · ${totalGrp} Grup · ${totalWords} Kelime`;
        }
    }

    const modulesSection = document.querySelector('.modules-section');
    if (modulesSection) modulesSection.style.display = '';

    showScreen('dashboard');
}

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

// ── VERBS LAB MODULE ──
function renderLab() {
    state.currentMode = 'lab-global';
    document.getElementById('labTitle').textContent = `🧪 Kelime Laboratuvarı`;
    document.getElementById('btnBackLab').innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Dashboard`;

    const grid = document.getElementById('labGrid');
    grid.innerHTML = verbsLabData.map(v => `
        <div class="verb-card">
            <div class="verb-row"><span class="v-tag">V1</span><span class="v-word">${v.v1}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v1}')">🔊</button></div>
            <div class="verb-row"><span class="v-tag">V2</span><span class="v-word">${v.v2}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v2}')">🔊</button></div>
            <div class="verb-row"><span class="v-tag">V3</span><span class="v-word">${v.v3}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v3}')">🔊</button></div>
            <div class="v-tr">${v.tr}</div>
        </div>
    `).join('');
    showScreen('labScreen');
}

function startLabForGroup(groupNum) {
    const key = `group${groupNum}`;
    const words = allWords[key] || [];

    const groupVerbs = words.filter(w => verbsLabData.some(vd => vd && vd.v1 === w.en));
    const labItems = groupVerbs.map(w => verbsLabData.find(v => v && v.v1 === w.en)).filter(Boolean);

    state.currentMode = 'lab-group';
    document.getElementById('labTitle').textContent = `🧪 Grup ${groupNum} Fiilleri`;
    document.getElementById('btnBackLab').innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Gruba Dön`;

    const grid = document.getElementById('labGrid');
    if (labItems.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Bu grupta kayıtlı fiil bulunamadı.</div>';
    } else {
        grid.innerHTML = labItems.map(v => `
            <div class="verb-card">
                <div class="verb-row"><span class="v-tag">V1</span><span class="v-word">${v.v1}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v1}')">🔊</button></div>
                <div class="verb-row"><span class="v-tag">V2</span><span class="v-word">${v.v2}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v2}')">🔊</button></div>
                <div class="verb-row"><span class="v-tag">V3</span><span class="v-word">${v.v3}</span><button class="btn-audio btn-audio-small" onclick="event.stopPropagation(); playAudio('${v.v3}')">🔊</button></div>
                <div class="v-tr">${v.tr}</div>
            </div>
        `).join('');
    }
    showScreen('labScreen');
}

// ── MATCHING MODULE ──
let matchState = {
    selectedEng: null,
    selectedTr: null,
    words: []
};

function startMatch() {
    let pot = [];
    Object.values(allWords).forEach(group => {
        pot.push(...group);
    });

    if (pot.length === 0) {
        alert('Eşleştirme oyunu için kelime bulunamadı.');
        return;
    }

    const selectedCount = Math.min(pot.length, 6);
    const selected = shuffle(pot).slice(0, selectedCount);

    let engList = selected.map((w, i) => ({ id: i, text: w.en }));
    let trList = selected.map((w, i) => ({ id: i, text: w.tr }));

    engList = shuffle(engList);
    trList = shuffle(trList);

    matchState.selectedEng = null;
    matchState.selectedTr = null;
    matchState.words = selected;

    const engCol = document.getElementById('matchColEng');
    const trCol = document.getElementById('matchColTr');

    engCol.innerHTML = engList.map(item => `<button class="match-btn eng-btn" data-id="${item.id}">${item.text}</button>`).join('');
    trCol.innerHTML = trList.map(item => `<button class="match-btn tr-btn" data-id="${item.id}">${item.text}</button>`).join('');

    document.querySelectorAll('.eng-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('matched')) return;
            document.querySelectorAll('.eng-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            matchState.selectedEng = btn;
            checkMatch();
        });
    });

    document.querySelectorAll('.tr-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('matched')) return;
            document.querySelectorAll('.tr-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            matchState.selectedTr = btn;
            checkMatch();
        });
    });

    showScreen('matchScreen');
}

function checkMatch() {
    if (!matchState.selectedEng || !matchState.selectedTr) return;

    const eBtn = matchState.selectedEng;
    const tBtn = matchState.selectedTr;

    if (eBtn.dataset.id === tBtn.dataset.id) {
        eBtn.classList.remove('active');
        tBtn.classList.remove('active');
        eBtn.classList.add('matched');
        tBtn.classList.add('matched');

        const matchedCount = document.querySelectorAll('.eng-btn.matched').length;
        if (matchedCount === matchState.words.length) {
            setTimeout(() => {
                alert('🎉 Tebrikler! Tüm kelimeleri başarıyla eşleştirdiniz!');
            }, 300);
        }
    } else {
        eBtn.classList.add('wrong');
        tBtn.classList.add('wrong');
        setTimeout(() => {
            eBtn.classList.remove('wrong', 'active');
            tBtn.classList.remove('wrong', 'active');
        }, 400);
    }
    matchState.selectedEng = null;
    matchState.selectedTr = null;
}

// ── SANDBOX MODULE ──
function startSandbox() {
    const progress = loadProgress();
    let errorIndicesWithGroups = [];

    const totalGrp = activeTotalGroups();
    for (let i = 1; i <= totalGrp; i++) {
        const key = `group${i}`;
        const gp = getGroupProgress(progress, i);
        if (gp.errors && gp.errors.length > 0 && allWords[key]) {
            gp.errors.forEach(idx => {
                if (allWords[key][idx]) {
                    errorIndicesWithGroups.push({ groupNum: i, idx: idx, word: allWords[key][idx] });
                }
            });
        }
    }

    if (errorIndicesWithGroups.length === 0) {
        alert('Harika! Sistemde hatalı bildiğiniz kelime yok.');
        return;
    }

    state.currentMode = 'sandbox';
    state.currentGroup = null;
    state.sessionQueue = shuffle(errorIndicesWithGroups);
    state.sessionIndex = 0;
    state.sessionCorrect = 0;
    state.sessionWrong = 0;
    state.sessionUnsure = 0;
    state.isFlipped = false;

    document.getElementById('fcGroupTitle').textContent = `Sandbox (${errorIndicesWithGroups.length} Hata)`;
    document.getElementById('fcModeBadge').textContent = '🏖️ Pekiştirme (No Stats)';
    document.getElementById('sessionComplete').classList.add('hidden');

    showScreen('flashcardScreen');
    renderCard();
}

// ── UTILITIES ──
function playAudio(text, lang) {
    if (!window.speechSynthesis || !text) return;
    const langMap = { en: 'en-US', es: 'es-ES', de: 'de-DE', fr: 'fr-FR', no: 'nb-NO' };
    const targetLang = lang || langMap[state.lang] || 'en-US';
    const safeText = text.toString().replace(/\//g, ' or ');

    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(safeText);
        utterance.lang = targetLang;
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.warn('Ses okuma hatası:', e);
    }
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ── NOTIFICATION MANAGER ──
const NotificationManager = (() => {
    const LS_NOTIFS = 'lumina_notifications';

    function getNotifs() {
        try {
            return JSON.parse(localStorage.getItem(LS_NOTIFS) || '[]');
        } catch { return []; }
    }

    function saveNotifs(list) {
        localStorage.setItem(LS_NOTIFS, JSON.stringify(list));
        renderNotifs();
    }

    function addNotification(title, message, icon = '✨') {
        const list = getNotifs();
        list.unshift({
            id: Date.now(),
            title,
            message,
            icon,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        if (list.length > 20) list.pop();
        saveNotifs(list);
    }

    function clearNotifications() {
        saveNotifs([]);
    }

    function renderNotifs() {
        const list = getNotifs();
        const badgeEl = document.getElementById('notifBadge');
        const listEl = document.getElementById('notifList');

        if (badgeEl) {
            if (list.length > 0) {
                badgeEl.textContent = list.length;
                badgeEl.classList.remove('hidden');
            } else {
                badgeEl.classList.add('hidden');
            }
        }

        if (listEl) {
            if (list.length === 0) {
                listEl.innerHTML = '<div class="notif-empty">Henüz bildirim yok.</div>';
            } else {
                listEl.innerHTML = list.map(n => `
                    <div class="notif-item">
                        <span class="notif-item-icon">${n.icon}</span>
                        <div class="notif-item-text">
                            <strong>${n.title}</strong>
                            <div>${n.message}</div>
                            <div class="notif-item-time">${n.time}</div>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    return { addNotification, clearNotifications, renderNotifs, getNotifs };
})();

// ── USER PROFILE & PASSWORD MANAGER EXTENSIONS ──
AuthManager.updateProfile = function (newName) {
    const session = AuthManager.getSession();
    if (!session) return { ok: false, error: 'Oturum bulunamadı.' };

    const users = JSON.parse(localStorage.getItem('lumina_users') || '[]');
    const userIndex = users.findIndex(u => u.email === session.email);
    if (userIndex === -1) return { ok: false, error: 'Kullanıcı bulunamadı.' };

    const trimmedName = newName.trim() || session.email.split('@')[0];
    users[userIndex].name = trimmedName;
    localStorage.setItem('lumina_users', JSON.stringify(users));

    session.name = trimmedName;
    localStorage.setItem('lumina_session', JSON.stringify(session));

    updateUserUI(session);
    NotificationManager.addNotification('Profil Güncellendi', 'İsminiz başarıyla güncellendi.', '✏️');
    return { ok: true, user: session };
};

AuthManager.changePassword = function (oldPassword, newPassword) {
    const session = AuthManager.getSession();
    if (!session) return { ok: false, error: 'Oturum bulunamadı.' };

    if (!oldPassword || !newPassword) return { ok: false, error: 'Lütfen tüm alanları doldurun.' };
    if (newPassword.length < 6) return { ok: false, error: 'Yeni şifre en az 6 karakter olmalıdır.' };

    const users = JSON.parse(localStorage.getItem('lumina_users') || '[]');
    const user = users.find(u => u.email === session.email);
    if (!user) return { ok: false, error: 'Kullanıcı bulunamadı.' };

    if (user.passwordHash !== AuthManager.simpleHash(oldPassword)) {
        return { ok: false, error: 'Mevcut şifreniz hatalı.' };
    }

    user.passwordHash = AuthManager.simpleHash(newPassword);

    localStorage.setItem('lumina_users', JSON.stringify(users));
    NotificationManager.addNotification('Şifre Değiştirildi', 'Şifreniz başarıyla güncellendi.', '🔑');
    return { ok: true };
};

function updateUserUI(session) {
    if (!session) return;

    const initial = (session.name || session.email).charAt(0).toUpperCase();
    const displayName = session.name || session.email.split('@')[0];
    const isGoogleUser = session.authProvider === 'google';
    const hasPhoto = isGoogleUser && session.picture;

    // Google kullanıcısı için body class ekle (şifre değiştir gizleme için)
    if (isGoogleUser) {
        document.body.classList.add('google-user');
    } else {
        document.body.classList.remove('google-user');
    }

    const avatarEls = [
        document.getElementById('topUserAvatar'),
        document.getElementById('menuUserAvatar'),
        document.getElementById('maAvatar'),
        document.getElementById('dashUserAvatar')
    ];

    avatarEls.forEach(el => {
        if (!el) return;
        if (hasPhoto) {
            el.innerHTML = `<img src="${session.picture}" alt="${displayName}" referrerpolicy="no-referrer" />`;
            el.classList.add('has-photo');
        } else {
            el.textContent = initial;
            el.classList.remove('has-photo');
        }
    });

    const topName = document.getElementById('topUserName');
    const menuName = document.getElementById('menuUserName');
    const menuEmail = document.getElementById('menuUserEmail');
    const dashEmail = document.getElementById('dashUserEmail');

    if (topName) topName.textContent = displayName;
    if (menuName) menuName.textContent = displayName;
    if (menuEmail) menuEmail.textContent = session.email;
    if (dashEmail) dashEmail.textContent = session.email;

    const roleBadge = document.getElementById('menuUserRoleBadge');
    const maBadge = document.getElementById('maRoleBadge');
    const isAdmin = session.role === 'admin';

    [roleBadge, maBadge].forEach(b => {
        if (b) {
            b.textContent = isAdmin ? '⚡ Admin' : '👤 Kullanıcı';
            b.className = 'user-role-badge ' + (isAdmin ? 'admin' : 'user');
        }
    });

    updateTopBarFlag();
}

function updateTopBarFlag() {
    const flagEl = document.getElementById('topUserLangFlag');
    if (!flagEl) return;
    const flags = { 'en': '🇬🇧', 'es': '🇪🇸', 'de': '🇩🇪', 'fr': '🇫🇷', 'no': '🇳🇴', 'futbol': '⚽' };
    flagEl.textContent = flags[state.lang] || '🇬🇧';
}

// ── THEME MANAGER ──
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('lumina_theme', isLight ? 'light' : 'dark');

    const iconDark = document.querySelector('.theme-icon-dark');
    const iconLight = document.querySelector('.theme-icon-light');

    if (iconDark && iconLight) {
        if (isLight) {
            iconDark.classList.add('hidden');
            iconLight.classList.remove('hidden');
        } else {
            iconDark.classList.remove('hidden');
            iconLight.classList.add('hidden');
        }
    }
}

function loadSavedTheme() {
    const saved = localStorage.getItem('lumina_theme');
    if (saved === 'light') {
        document.body.classList.add('light-theme');
        const iconDark = document.querySelector('.theme-icon-dark');
        const iconLight = document.querySelector('.theme-icon-light');
        if (iconDark && iconLight) {
            iconDark.classList.add('hidden');
            iconLight.classList.remove('hidden');
        }
    }
}

// ── MODALS MANAGER ──
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    document.getElementById('userDropdownMenu')?.classList.add('hidden');
    document.getElementById('notifPopover')?.classList.add('hidden');

    if (modalId === 'manageAccountModal') {
        const session = AuthManager.getSession();
        if (session) {
            document.getElementById('maNameInput').value = session.name || '';
            document.getElementById('maEmailInput').value = session.email;
        }
        document.getElementById('maSuccess')?.classList.add('hidden');
        document.getElementById('maError')?.classList.add('hidden');
    } else if (modalId === 'changePasswordModal') {
        document.getElementById('cpOldPassword').value = '';
        document.getElementById('cpNewPassword').value = '';
        document.getElementById('cpConfirmPassword').value = '';
        document.getElementById('cpSuccess')?.classList.add('hidden');
        document.getElementById('cpError')?.classList.add('hidden');
    }

    modal.classList.remove('hidden');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

function saveProfileChanges() {
    const newName = document.getElementById('maNameInput').value;
    const errEl = document.getElementById('maError');
    const succEl = document.getElementById('maSuccess');

    errEl.classList.add('hidden');
    succEl.classList.add('hidden');

    const result = AuthManager.updateProfile(newName);
    if (result.ok) {
        succEl.textContent = '✅ Profil bilgileriniz kaydedildi!';
        succEl.classList.remove('hidden');
        setTimeout(() => closeModal('manageAccountModal'), 1000);
    } else {
        errEl.textContent = '⚠️ ' + result.error;
        errEl.classList.remove('hidden');
    }
}

function savePasswordChanges() {
    const oldPass = document.getElementById('cpOldPassword').value;
    const newPass = document.getElementById('cpNewPassword').value;
    const confPass = document.getElementById('cpConfirmPassword').value;

    const errEl = document.getElementById('cpError');
    const succEl = document.getElementById('cpSuccess');

    errEl.classList.add('hidden');
    succEl.classList.add('hidden');

    if (newPass !== confPass) {
        errEl.textContent = '⚠️ Yeni şifreler birbiriyle eşleşmiyor.';
        errEl.classList.remove('hidden');
        return;
    }

    const result = AuthManager.changePassword(oldPass, newPass);
    if (result.ok) {
        succEl.textContent = '✅ Şifreniz başarıyla değiştirildi!';
        succEl.classList.remove('hidden');
        setTimeout(() => closeModal('changePasswordModal'), 1000);
    } else {
        errEl.textContent = '⚠️ ' + result.error;
        errEl.classList.remove('hidden');
    }
}

window.authSignOut = function () {
    openModal('logoutConfirmModal');
};

window.executeSignOut = function () {
    closeModal('logoutConfirmModal');

    // Google oturumunu kapat
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
    }

    // Tüm aktif yarış timer'larını temizle
    if (typeof TypingRace !== 'undefined') TypingRace.cleanup();
    if (typeof QuickQuiz !== 'undefined') QuickQuiz.cleanup();
    if (typeof SpeedMatch !== 'undefined') SpeedMatch.cleanup();

    AuthManager.signOut();
    document.body.classList.remove('google-user');

    // UI sıfırlama
    const topBar = document.getElementById('globalTopBar');
    if (topBar) topBar.classList.add('hidden');
    document.getElementById('userDropdownMenu')?.classList.add('hidden');
    document.querySelector('.user-dropdown-wrapper')?.classList.remove('active');
    document.getElementById('notifPopover')?.classList.add('hidden');

    // Auth form inputlarını temizle
    ['siEmail', 'siPassword', 'suEmail', 'suPassword', 'suName', 'fpEmail'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    ['siError', 'suError', 'suSuccess', 'fpError', 'fpSuccess'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // Giriş panelini göster
    authShowPanel('signin');
    showScreen('authScreen');
};

// ── INITIALIZATION ──
document.addEventListener('DOMContentLoaded', async () => {
    loadSavedTheme();
    NotificationManager.renderNotifs();

    // Google Sign-In başlat
    initGoogleSignIn();

    // Initial language load
    await loadLanguageData('English');
    await loadVerbsLabData();

    // Reset Progress Button
    document.getElementById('btnResetProgress')?.addEventListener('click', () => {
        if (confirm('Tüm ilerlemeniz kalıcı olarak silinecek. Emin misiniz?')) {
            localStorage.removeItem(activeLSKey());
            renderDashboard();
        }
    });

    // Navigation buttons
    document.getElementById('btnBack')?.addEventListener('click', renderDashboard);
    document.getElementById('btnBackFC')?.addEventListener('click', () => openGroup(state.currentGroup));

    // Card mode buttons
    document.getElementById('modeNew')?.addEventListener('click', () => startSession('new'));
    document.getElementById('modeErrors')?.addEventListener('click', () => startSession('errors'));
    document.getElementById('modeTestErrors')?.addEventListener('click', () => openTestHub());
    document.getElementById('modeWriteErrors')?.addEventListener('click', () => openWriteHub());
    document.getElementById('modeUnsure')?.addEventListener('click', () => startSession('unsure'));
    document.getElementById('modeKnown')?.addEventListener('click', () => startSession('known'));
    document.getElementById('modeLabGroup')?.addEventListener('click', () => startLabForGroup(state.currentGroup));

    // Test Hub buttons
    document.getElementById('btnBackTestHub')?.addEventListener('click', () => openGroup(state.currentGroup));
    document.getElementById('hubBtnTest')?.addEventListener('click', () => {
        const useAll = testSourceMode === 'all';
        startTestMode(false, useAll);
    });
    document.getElementById('hubBtnTestRepeat')?.addEventListener('click', () => startTestMode(false, false));
    document.getElementById('hubBtnTestErrors')?.addEventListener('click', () => renderTestHubErrors());
    document.getElementById('hubBtnTestKnown')?.addEventListener('click', () => renderTestHubKnown());
    document.getElementById('btnPracticeTestErrors')?.addEventListener('click', () => startTestMode(true));
    document.getElementById('testSourceKnown')?.addEventListener('click', () => {
        testSourceMode = 'known';
        _updateTestSourceUI();
    });
    document.getElementById('testSourceAll')?.addEventListener('click', () => {
        testSourceMode = 'all';
        _updateTestSourceUI();
    });

    // Write Hub buttons
    document.getElementById('btnBackWriteHub')?.addEventListener('click', () => openGroup(state.currentGroup));
    document.getElementById('hubBtnWrite')?.addEventListener('click', () => {
        const useAll = writeSourceMode === 'all';
        startWriteMode(false, useAll);
    });
    document.getElementById('hubBtnWriteRepeat')?.addEventListener('click', () => startWriteMode(false, false));
    document.getElementById('hubBtnWriteErrors')?.addEventListener('click', () => renderWriteHubErrors());
    document.getElementById('hubBtnWriteKnown')?.addEventListener('click', () => renderWriteHubKnown());
    document.getElementById('btnPracticeWriteErrorsHub')?.addEventListener('click', () => startWriteMode(true));
    document.getElementById('writeSourceKnown')?.addEventListener('click', () => {
        writeSourceMode = 'known';
        _updateWriteSourceUI();
    });
    document.getElementById('writeSourceAll')?.addEventListener('click', () => {
        writeSourceMode = 'all';
        _updateWriteSourceUI();
    });
    // Flashcard interaction
    document.getElementById('flashCard')?.addEventListener('click', flipCard);
    document.getElementById('btnCorrect')?.addEventListener('click', () => answerCard('correct'));
    document.getElementById('btnUnsure')?.addEventListener('click', () => answerCard('unsure'));
    document.getElementById('btnWrong')?.addEventListener('click', () => answerCard('wrong'));

    document.getElementById('btnRestartSession')?.addEventListener('click', () => {
        document.getElementById('sessionComplete').classList.add('hidden');
        startSession(state.currentMode);
    });
    document.getElementById('btnBackToGroup')?.addEventListener('click', () => {
        document.getElementById('sessionComplete').classList.add('hidden');
        openGroup(state.currentGroup);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        const screen = document.querySelector('.screen.active')?.id;
        if (screen !== 'flashcardScreen') return;
        if (document.getElementById('sessionComplete').classList.contains('hidden') === false) return;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

        switch (e.key) {
            case ' ':
            case 'ArrowUp':
                e.preventDefault();
                flipCard();
                break;
            case 'ArrowRight':
            case '1':
                answerCard('correct');
                break;
            case 'ArrowLeft':
            case '2':
                answerCard('wrong');
                break;
            case 'ArrowDown':
            case '3':
                answerCard('unsure');
                break;
        }
    });

    // Modules
    document.getElementById('btnGoLab')?.addEventListener('click', renderLab);
    document.getElementById('btnGoMatch')?.addEventListener('click', startMatch);
    document.getElementById('btnGoSandbox')?.addEventListener('click', startSandbox);
    document.getElementById('btnBackLab')?.addEventListener('click', () => {
        if (state.currentMode === 'lab-group') {
            openGroup(state.currentGroup);
        } else {
            renderDashboard();
        }
    });
    document.getElementById('btnBackMatch')?.addEventListener('click', renderDashboard);
    document.getElementById('btnRefreshMatch')?.addEventListener('click', startMatch);

    // Shuffle
    document.getElementById('btnShuffleSession')?.addEventListener('click', () => {
        if (!state.sessionQueue || state.sessionQueue.length === 0) return;
        const remaining = state.sessionQueue.slice(state.sessionIndex);
        if (remaining.length < 2) return;

        const shuffled = shuffle(remaining);
        state.sessionQueue = [
            ...state.sessionQueue.slice(0, state.sessionIndex),
            ...shuffled
        ];

        const btn = document.getElementById('btnShuffleSession');
        const oldText = btn.innerHTML;
        btn.innerHTML = '✅ İlerisi Karıştırıldı';
        setTimeout(() => btn.innerHTML = oldText, 1000);

        renderCard();
    });

    // Language Selectors
    const btnLangEn = document.getElementById('btnLangEn');
    const btnLangEs = document.getElementById('btnLangEs');
    const btnLangDe = document.getElementById('btnLangDe');
    const btnLangFr = document.getElementById('btnLangFr');
    const btnLangNo = document.getElementById('btnLangNo');

    if (btnLangEn) {
        btnLangEn.addEventListener('click', async () => {
            state.lang = 'en';
            document.body.classList.remove('theme-es', 'theme-de', 'theme-fr', 'theme-no', 'theme-sv');
            await loadLanguageData('English');
            renderDashboard();
        });
    }

    if (btnLangEs) {
        btnLangEs.addEventListener('click', async () => {
            state.lang = 'es';
            document.body.classList.remove('theme-de', 'theme-fr', 'theme-no', 'theme-sv');
            document.body.classList.add('theme-es');
            await loadLanguageData('Spanish');
            renderDashboard();
        });
    }

    if (btnLangDe) {
        btnLangDe.addEventListener('click', async () => {
            state.lang = 'de';
            document.body.classList.remove('theme-es', 'theme-fr', 'theme-no', 'theme-sv');
            document.body.classList.add('theme-de');
            await loadLanguageData('German');
            renderDashboard();
        });
    }

    if (btnLangFr) {
        btnLangFr.addEventListener('click', async () => {
            state.lang = 'fr';
            document.body.classList.remove('theme-es', 'theme-de', 'theme-no', 'theme-sv');
            document.body.classList.add('theme-fr');
            await loadLanguageData('French');
            renderDashboard();
        });
    }

    if (btnLangNo) {
        btnLangNo.addEventListener('click', async () => {
            state.lang = 'no';
            document.body.classList.remove('theme-es', 'theme-de', 'theme-fr', 'theme-sv');
            document.body.classList.add('theme-no');
            await loadLanguageData('Norwegian');
            renderDashboard();
        });
    }

    const btnLangSv = document.getElementById('btnLangSv');
    if (btnLangSv) {
        btnLangSv.addEventListener('click', async () => {
            state.lang = 'sv';
            document.body.classList.remove('theme-es', 'theme-de', 'theme-fr', 'theme-no', 'theme-futbol');
            document.body.classList.add('theme-sv');
            await loadLanguageData('Swedish');
            renderDashboard();
        });
    }

    const btnLangFutbol = document.getElementById('btnLangFutbol');
    if (btnLangFutbol) {
        btnLangFutbol.addEventListener('click', async () => {
            state.lang = 'futbol';
            document.body.classList.remove('theme-es', 'theme-de', 'theme-fr', 'theme-no', 'theme-sv');
            document.body.classList.add('theme-futbol');
            await loadLanguageData('Futbol');
            renderDashboard();
        });
    }

    const btnSwitchLang = document.getElementById('btnSwitchLang');
    if (btnSwitchLang) {
        btnSwitchLang.addEventListener('click', () => {
            showScreen('languageScreen');
        });
    }

    // Top bar & modal UI listeners
    document.getElementById('btnThemeToggle')?.addEventListener('click', toggleTheme);

    const notifBtn = document.getElementById('btnNotifToggle');
    const notifPop = document.getElementById('notifPopover');
    if (notifBtn && notifPop) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifPop.classList.toggle('hidden');
            document.getElementById('userDropdownMenu')?.classList.add('hidden');
        });
    }

    document.getElementById('btnClearNotifs')?.addEventListener('click', () => {
        NotificationManager.clearNotifications();
    });

    const dropTrigger = document.getElementById('userDropdownTrigger');
    const dropMenu = document.getElementById('userDropdownMenu');
    const dropWrapper = document.querySelector('.user-dropdown-wrapper');

    if (dropTrigger && dropMenu) {
        dropTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dropMenu.classList.toggle('hidden');
            dropWrapper?.classList.toggle('active', !isHidden);
            document.getElementById('notifPopover')?.classList.add('hidden');
        });
    }

    document.getElementById('btnOpenManageAccount')?.addEventListener('click', () => openModal('manageAccountModal'));
    document.getElementById('btnOpenChangePassword')?.addEventListener('click', () => openModal('changePasswordModal'));

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-dropdown-wrapper')) {
            dropMenu?.classList.add('hidden');
            dropWrapper?.classList.remove('active');
        }
        if (!e.target.closest('.notif-wrapper')) {
            notifPop?.classList.add('hidden');
        }
    });

    // Check existing session
    const session = AuthManager.getSession();
    if (session) {
        updateUserUI(session);
        showScreen('languageScreen');
    } else {
        showScreen('authScreen');
    }
});

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
                        <div class="item-tr">${sentence}</div>
                        <div class="item-wrong">Senin cevabın: <strong>${userAns}</strong></div>
                    </div>
                    <div class="item-right">
                        <div class="item-label">Doğru Cevap</div>
                        <div class="item-correct">${en}</div>
                    </div>
                </div>`;
            } else {
                const wObj = wordsInGroup.find(w => w.id === errItem);
                if (!wObj) return '';
                sentence = getTestSentence(wObj.en);
                return `<div class="hub-list-item">
                    <div class="item-left">
                        <div class="item-tr">${sentence}</div>
                        <div class="item-wrong">İpucu: ${wObj.tr}</div>
                    </div>
                    <div class="item-right">
                        <div class="item-label">Doğru Cevap</div>
                        <div class="item-correct">${wObj.en}</div>
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
                    <div class="item-word">${wObj.en}</div>
                    <div class="item-wrong" style="color:var(--text-muted);">${wObj.tr}</div>
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
                    <div class="item-tr">Türkçe: <strong>${tr}</strong></div>
                    <div class="item-wrong">Senin cevabın: <strong>${userAns}</strong></div>
                </div>
                <div class="item-right">
                    <div class="item-label">Doğru Cevap</div>
                    <div class="item-correct">${en}</div>
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
                    <div class="item-word">${wObj.en}</div>
                    <div class="item-wrong" style="color:var(--text-muted);">${wObj.tr}</div>
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

/* ============================================================
   RACE ARENA — COMPLETE GAME SYSTEM
   Yarış Arenası: Hızlı Yazma, Hızlı Şık, Hızlı Eşleştirme
   Puan sistemi localStorage'da lumina_race_stats key'inde saklanır.
============================================================ */

// ── RACE STATS MANAGER ──
const RaceStatsManager = (() => {
    const LS_KEY = 'lumina_race_stats';

    function getStats() {
        try {
            const raw = localStorage.getItem(LS_KEY);
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
            <button class="quiz-option-btn" data-answer="${opt}">${opt}</button>
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
            `<div class="speed-match-item en-item" data-idx="${item.idx}" data-side="en">${item.text}</div>`
        ).join('');

        trCol.innerHTML = trItems.map(item =>
            `<div class="speed-match-item tr-item" data-idx="${item.idx}" data-side="tr">${item.text}</div>`
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
   USER DROPDOWN — GLOBAL FONKSİYONLAR
══════════════════════════════════════════════════════════ */
function toggleUserDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('userDropdownMenu');
    if (!menu) return;
    menu.classList.toggle('hidden');

    // Dışarı tıklayınca kapat (bir kez bağla)
    if (!menu.classList.contains('hidden')) {
        setTimeout(() => {
            document.addEventListener('click', closeUserDropdownOutside);
        }, 0);
    }
}

function closeUserDropdownOutside(e) {
    const menu = document.getElementById('userDropdownMenu');
    const trigger = document.getElementById('userDropdownTrigger');
    if (menu && !menu.contains(e.target) && trigger && !trigger.contains(e.target)) {
        menu.classList.add('hidden');
        document.removeEventListener('click', closeUserDropdownOutside);
    }
}

function openManageAccountModal() {
    const menu = document.getElementById('userDropdownMenu');
    if (menu) menu.classList.add('hidden');
    document.removeEventListener('click', closeUserDropdownOutside);

    const sess = AuthManager.getSession();
    if (sess) {
        const nameInput = document.getElementById('maNameInput');
        const emailInput = document.getElementById('maEmailInput');
        if (nameInput) nameInput.value = sess.name || '';
        if (emailInput) emailInput.value = sess.email || '';
    }
    openModal('manageAccountModal');
}

function openChangePasswordModal() {
    const menu = document.getElementById('userDropdownMenu');
    if (menu) menu.classList.add('hidden');
    document.removeEventListener('click', closeUserDropdownOutside);
    openModal('changePasswordModal');
}

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