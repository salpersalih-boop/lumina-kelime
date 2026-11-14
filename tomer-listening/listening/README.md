# TÖMER · İngilizce Dinleme ve Anlama Modülü

Her ana seviye (A1, A2, B1, B2, C1, C2) kendi içinde **Kolay / Orta / Zor** olmak üzere 3 alt zorluk derecesine ayrılır. Kullanıcı önce seviyeyi, sonra alt zorluğu seçer; metni dinler, soruları çözer, "Cevapları Kontrol Et" ile doğruları yeşil, yanlışları kırmızı görür ve her sorunun açıklamasını okur.

Çatısız (framework'süz), bağımlılıksız, saf ES modülleriyle yazıldı. Derleme adımı yok.

## Çalıştırma

ES modülleri ve `fetch` nedeniyle sayfa `file://` ile açılamaz, bir web sunucusu gerekir:

```bash
npm start            # python3 -m http.server 8080
# ya da: npx serve .
```

Sonra `http://localhost:8080` adresini aç. Doğrudan bir sete bağlantı verilebilir: `http://localhost:8080/#a1-orta`.

## Test ve doğrulama

```bash
npm run validate     # tüm içerik dosyalarını şemaya göre denetler
npm test             # birim testleri (node:test, Node 18+)
npm run check        # ikisi birden — CI'da bunu çalıştır
```

`validate`, her sorunun `evidence` cümlesinin metinde birebir geçip geçmediğini de kontrol eder. Böylece metin değişip açıklama eskide kalırsa hemen fark edilir.

## Klasör yapısı

```
index.html                 Sayfa iskeleti (yalnızca yerleşim, içerik JS'ten gelir)
css/
  tokens.css               Renk, yazı tipi, boşluk değişkenleri (açık + koyu tema)
  base.css                 Sıfırlama, düğmeler, genel kurallar
  components.css           Seviye menüsü, oynatıcı, sorular, metin
js/
  main.js                  Giriş noktası: durum, yönlendirme (#a1-orta), bileşenleri bağlar
  config.js                Alt seviyeler, hız seçenekleri, sabitler
  core/                    DOM'a bağlı olmayan, test edilen saf mantık
    scoring.js             Puanlama ve değerlendirme metni
    timing.js              Süre tahmini, zaman biçimi, konum hesapları
    store.js               Küçük durum deposu (abonelikli)
    progress.js            En iyi sonuçların localStorage'da saklanması
    emitter.js             Olay yayıcı
  services/
    contentRepository.js   İçerik erişim katmanı (manifest + set, önbellekli)
    contentSchema.js       Set doğrulama (tarayıcı + Node ortak)
    voices.js              TTS seslerini yükleme, konuşmacılara ses atama
    players/
      createPlayer.js      Fabrika: kayıt varsa dosya oynatıcı, yoksa TTS
      speechPlayer.js      Web Speech API oynatıcısı (cümle cümle)
      audioFilePlayer.js   mp3/ogg oynatıcısı (aynı arayüz)
  ui/
    levelNav.js            İki katmanlı seviye seçici (sekme, klavye destekli)
    lessonView.js          Ders ekranını kurar, alt bileşenlerin yaşam döngüsü
    audioPlayer.js         Özel oynatıcı arayüzü (oynat/duraklat, ilerleme, hız, dinleme hakkı)
    quizView.js            Soru ekranı ve kontrol
    transcriptView.js      Kilitli/açık dinleme metni, kanıt vurgusu
    dom.js                 Kaçış (XSS'e karşı), dinleyici, ikonlar
content/
  manifest.json            Seviye listesi ve her alt seviyenin dosya yolu
  a1/kolay.json …          Setler
tests/                     node:test birim testleri
tools/validate-content.js  İçerik doğrulama aracı
```

### Mimari kararlar

- **Katmanlar:** `core` (saf mantık) ← `services` (veri, ses) ← `ui` (görünüm) ← `main` (bağlama). Alt katman üst katmanı bilmez; puanlama ve süre hesapları DOM olmadan test edilir.
- **İçerik koddan ayrı:** Yeni seviye eklemek için JS'e dokunulmaz, yalnızca JSON eklenir. `ContentRepository` ileride bir API ya da Firestore'a geçirilirse arayüz değişmez.
- **Oynatıcı stratejisi:** Tüm oynatıcılar aynı arayüzü uygular (`play`, `pause`, `seek`, `setRate`, `state`/`progress`/`segment` olayları). Setin `audio.src` alanı doluysa gerçek kayıt, boşsa tarayıcı TTS'i kullanılır.
- **Neden cümle cümle TTS:** `speechSynthesis.pause()` tarayıcılar arasında güvenilir değil ve Chrome uzun cümlelerde kesiliyor. Metin cümlelere bölünür; duraklatınca o cümlenin başından devam edilir. Diyaloglarda her konuşmacıya farklı ses atanır, tek ses varsa perde değiştirilir.
- **Ölçme mantığı:** Metin, cevaplar kontrol edilene kadar kilitlidir. Zor setlerde `maxPlays` ile dinleme hakkı sınırlanabilir (sınav gerçekçiliği). Duraklatıp devam etmek hak harcamaz, baştan başlatmak harcar.
- **Erişilebilirlik:** Sekmeler ve kaydırıcı klavyeyle kullanılır (ok tuşları, Home/End). Boşluk tuşu oynatır/duraklatır. Durum mesajları `aria-live` ile okunur, hareket `prefers-reduced-motion` ile kapanır.
- **Güvenlik:** İçerikteki tüm metinler `esc()` ile kaçışlanarak DOM'a yazılır.

## İçerik şeması

Yeni bir set eklemek için:

1. `content/<seviye>/<alt-seviye>.json` dosyasını oluştur (ör. `content/a2/kolay.json`).
2. `content/manifest.json` içinde ilgili `sets` alanına yolu yaz.
3. `npm run validate` çalıştır.

```jsonc
{
  "id": "a2-kolay",              // benzersiz; ilerleme bu anahtarla saklanır
  "level": "A2",                 // manifest'teki seviye ile aynı olmalı
  "sublevel": "kolay",           // kolay | orta | zor
  "title": "My weekend",         // İngilizce başlık
  "topic": "Hafta sonu",         // Türkçe konu etiketi
  "instructions": "…",           // isteğe bağlı, Türkçe yönerge
  "audio": {
    "src": null,                 // "a2/kolay.mp3" verilirse TTS yerine kayıt çalar
    "lang": "en-US",
    "rate": 0.9,                 // varsayılan hız (0.5–1.5)
    "maxPlays": null             // null = sınırsız, ör. 2 = iki dinleme hakkı
  },
  "speakers": {
    "anna": { "name": "Anna", "voice": "female" }   // voice: female | male (ipucu)
  },
  "script": [
    { "speaker": "anna", "text": "On Saturday I visit my aunt." }
    // kayıt kullanılıyorsa: "start": 3.2  (saniye) → metin vurgusu senkron olur
  ],
  "questions": [
    {
      "id": "q1",
      "prompt": "Who does Anna visit on Saturday?",
      "options": ["her aunt", "her uncle", "her friend"],
      "answer": 0,                // doğru şıkkın indeksi (0 = A)
      "feedback": "Türkçe açıklama: neden doğru, çeldirici ne.",
      "evidence": "On Saturday I visit my aunt."   // metinde birebir geçmeli
    }
  ]
}
```

### TTS'e uygun metin yazma

- Cümleleri kısa tut; her `script` satırı ayrı seslendirilir.
- Sayıları ve fiyatları yazıyla yaz ("seven dollars and fifty cents"); TTS'ler "$7.50"yi farklı okuyabilir.
- Kısaltmalardan kaçın (St., Mr. yerine Street, Mister ya da tam isim).
- Diyaloglarda her konuşmacı için `voice` ipucu ver.

## A1 içeriği

| Alt seviye | Metin | Tür | Soru | Ölçtüğü beceri |
|---|---|---|---|---|
| Kolay | Meet Emma | Monolog, 10 cümle | 3 | Temel bilgi (ülke, meslek, aile) |
| Orta | At the café | Diyalog, 2 konuşmacı | 4 | Spesifik detay (sipariş, fiyat, saat, isim) |
| Zor | Daniel's busy week | Monolog, 12 cümle, 3 dinleme hakkı | 5 | Çeldiricileri ayırt etme (usually/but, olumsuz cümleler, gün karışıklığı) |

Her soruda Türkçe açıklama ve metindeki kanıt cümlesi bulunur. Kontrol sonrası açılan metinde bu cümleler soru numarasıyla işaretlenir.

## Tarayıcı desteği

Güncel Chrome, Edge, Safari ve Firefox. TTS sesleri işletim sistemine bağlıdır. Ses bulunamazsa oynatıcı anlaşılır bir hata mesajı gösterir; bu durumda setlere `audio.src` ile kayıt eklenebilir.
