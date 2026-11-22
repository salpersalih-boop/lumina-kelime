# TÖMER · İngilizce Dinleme ve Anlama Modülü

Her ana seviye (A1, A2, B1, B2, C1, C2) kendi içinde **Kolay / Orta / Zor** olmak üzere 3 alt zorluk derecesine ayrılır. Kullanıcı önce seviyeyi, sonra alt zorluğu seçer; metni dinler, soruları çözer, "Cevapları Kontrol Et" ile doğruları yeşil, yanlışları kırmızı görür ve her sorunun açıklamasını okur.

Çatısız (framework'süz), bağımlılıksız, saf ES modülleriyle yazıldı. Derleme adımı yok.

## Çalıştırma

ES modülleri ve `fetch` nedeniyle sayfa `file://` ile açılamaz, bir web sunucusu gerekir:

```bash
npm start            # node tools/serve.js — Python ya da ek paket gerekmez
npm start -- 8081    # 8080 doluysa başka port
```

Sonra `http://localhost:8080` adresini aç. Doğrudan bir metne bağlantı verilebilir: `http://localhost:8080/#/a1/medium/3` (A1 · Orta · 3. metin).

Aynı motor iki kataloğu sunar:

| Sayfa | Katalog | İçerik kökü | Örnek adres |
|---|---|---|---|
| `index.html` | TÖMER · İngilizce (A1 … C2) | `content/` | `#/a1/medium/3` |
| `languages.html` | **Dinleyerek Öğren** (dil × Kolay/Orta/Zor) | `content/diller/` | `languages.html#/es/easy/2` |

Hangi kataloğun açılacağını `<main data-content="content/diller/">` niteliği söyler; başlıklar manifest'in `app` alanından gelir.

## Test ve doğrulama

```bash
npm run validate     # tüm içerik dosyalarını şemaya göre denetler
npm test             # birim testleri (node:test, Node 18+)
npm run check        # ikisi birden — CI'da bunu çalıştır
```

`validate`, her sorunun `evidence` cümlesinin metinde birebir geçip geçmediğini de kontrol eder. Böylece metin değişip açıklama eskide kalırsa hemen fark edilir.

## Klasör yapısı

```
index.html                 Uygulama kabuğu: üst çubuk (marka, konum, tema) + #app
css/
  tokens.css               Lumina ile aynı tasarım değişkenleri (koyu varsayılan, body.light-theme)
  base.css                 Sıfırlama, düğmeler, genel kurallar
  screens.css              Üst çubuk, seviye / zorluk / metin kartları, süzgeç
  lesson.css               Ders ekranı: oynatıcı, sorular, sonuç, dinleme metni
js/
  main.js                  Giriş: adres → ekran, veriyi hazırlar, ilerlemeyi saklar
  config.js                Alt seviyeler, hız seçenekleri, sabitler
  core/                    DOM'a bağlı olmayan, test edilen saf mantık
    route.js               Adres ↔ ekran (#/a1/easy/3)
    sets.js                Set kimliği/yolu, kelime sayısı, uzunluk sınıfı, sıradaki metin
    scoring.js             Puanlama ve değerlendirme metni
    timing.js              Süre tahmini, zaman biçimi, konum hesapları
    progress.js            En iyi sonuçların localStorage'da saklanması
    store.js, emitter.js   Küçük durum deposu, olay yayıcı
  services/
    contentRepository.js   İçerik erişim katmanı (manifest + setler, önbellekli)
    contentSchema.js       Set doğrulama (tarayıcı + Node ortak)
    voices.js              TTS seslerini yükleme, konuşmacılara ses atama
    players/               TTS ve ses dosyası oynatıcıları (aynı arayüz)
  ui/
    screens/
      levelsScreen.js      1. ekran: genel ilerleme + seviye kartları
      sublevelsScreen.js   2. ekran: Kolay / Orta / Zor kartları (ilerleme halkası)
      setsScreen.js        3. ekran: metin kartları, uzunluğa göre süzgeç
      lessonScreen.js      4. ekran: oynatıcı → sorular → dinleme metni
      parts.js             Ortak parçalar (geri düğmesi, etiketler, rozetler)
    audioPlayer.js         Oynatıcı: büyük oynat düğmesi + halka, dalga formu, hız, dinleme hakkı, konuşan kişi
    quizView.js            Sorular, kontrol, sonuç kartı
    transcriptView.js      Kilitli/açık dinleme metni, kanıt vurgusu
    dom.js                 Kaçış (XSS'e karşı), dinleyici, ikonlar
content/
  manifest.json            Seviye listesi ve her alt seviyedeki metinlerin yolları
  a1/kolay/01.json …       Setler (alt seviye başına bir klasör, sıra numaralı dosyalar)
tests/                     node:test birim testleri
tools/validate-content.js  İçerik doğrulama aracı (--list ile metin listesi ve uzunlukları)
tools/serve.js             Bağımsız statik sunucu (npm start)
languages.html                Dinleyerek Öğren girişi (content/diller/ kataloğu)
content/diller/            Dil kataloğu: manifest.json + es/, pt/ …
```

### Ekran akışı

| Adres | Ekran |
|---|---|
| `#/` | Seviyeler (A1–C2) ve genel ilerleme |
| `#/a1` | A1'in zorlukları: Kolay / Orta / Zor |
| `#/a1/easy` | A1 Kolay metinleri (Tümü / Kısa / Orta / Uzun süzgeci) |
| `#/a1/easy/3` | 3. metin: dinle, cevapla, açıklamaları ve metni gör |

Adreslerde zorluklar İngilizcedir (`easy` / `medium` / `hard`). Türkçe (`#/a1/kolay/3`) ve eski biçimdeki adresler (`#a1-kolay-3`) de açılır ve yeni biçime çevrilir. Lumina içinden açıldığında üst çubukta "Lumina" dönüş bağlantısı görünür. Geçersiz adresler en yakın geçerli ekrana yönlendirilir.

### Mimari kararlar

- **Lumina ile uyum:** Renkler Lumina'nın değişken adlarıyla (`--bg-card`, `--accent-1` …) tanımlı; Lumina'ya gömüldüğünde onun temasını (koyu/açık, `body.light-theme`) izler. Tüm sınıflar `ls-` önekli, Lumina'nın stilleriyle çakışmaz.
- **Katmanlar:** `core` (saf mantık) ← `services` (veri, ses) ← `ui` (görünüm) ← `main` (bağlama). Alt katman üst katmanı bilmez; puanlama ve süre hesapları DOM olmadan test edilir.
- **İçerik koddan ayrı:** Yeni seviye eklemek için JS'e dokunulmaz, yalnızca JSON eklenir. `ContentRepository` ileride bir API ya da Firestore'a geçirilirse arayüz değişmez.
- **Oynatıcı stratejisi:** Tüm oynatıcılar aynı arayüzü uygular (`play`, `pause`, `seek`, `setRate`, `state`/`progress`/`segment` olayları). Setin `audio.src` alanı doluysa gerçek kayıt, boşsa tarayıcı TTS'i kullanılır.
- **Neden cümle cümle TTS:** `speechSynthesis.pause()` tarayıcılar arasında güvenilir değil ve Chrome uzun cümlelerde kesiliyor. Metin cümlelere bölünür; duraklatınca o cümlenin başından devam edilir. Diyaloglarda her konuşmacıya farklı ses atanır, tek ses varsa perde değiştirilir.
- **Ölçme mantığı:** Metin, cevaplar kontrol edilene kadar kilitlidir. Zor setlerde `maxPlays` ile dinleme hakkı sınırlanabilir (sınav gerçekçiliği). Duraklatıp devam etmek hak harcamaz, baştan başlatmak harcar.
- **Erişilebilirlik:** Sekmeler ve kaydırıcı klavyeyle kullanılır (ok tuşları, Home/End). Boşluk tuşu oynatır/duraklatır. Durum mesajları `aria-live` ile okunur, hareket `prefers-reduced-motion` ile kapanır.
- **Güvenlik:** İçerikteki tüm metinler `esc()` ile kaçışlanarak DOM'a yazılır.

## İçerik şeması

Yeni bir set eklemek için:

1. `content/<seviye>/<alt-seviye>/<NN>.json` dosyasını oluştur (ör. `content/a1/kolay/11.json`).
2. `content/manifest.json` içinde ilgili listenin sonuna yolu ekle. Sıra numarası, dosya adı ve `id` birbirini tutmalı.
3. `npm run validate -- --list` çalıştır: hataları ve metnin uzunluk sınıfını gösterir.

Manifest biçimi:

```jsonc
{ "id": "A1", "name": "Başlangıç",
  "sets": { "kolay": ["a1/kolay/01.json", "a1/kolay/02.json"], "orta": [], "zor": [] } }
```

```jsonc
{
  "id": "a2-kolay-01",           // <seviye>-<alt seviye>-<sıra>; ilerleme bu anahtarla saklanır
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

### Metin uzunluğu

Her metin kelime sayısına göre **Kısa** (≤ 50), **Orta** (≤ 110) ya da **Uzun** (> 110) olarak etiketlenir (`js/core/sets.js › LENGTH_CLASSES`). Her alt seviyede üç uzunluk da bulunur; testler bunu denetler. Böylece öğrenci yalnızca uzun anlatımlara değil, kısa ve hızlı konuşmalara da alışır.

## A1 içeriği

200 metin: Kolay 65, Orta 70, Zor 65. Her metinde soru sayısı alt seviyeye göre sabittir: Kolay 3, Orta 4, Zor 5.

| Alt seviye | Tür | Ölçtüğü beceri |
|---|---|---|
| Kolay | Çoğunlukla monolog, yavaş (0.85×) | Temel bilgi: kişi, yer, renk, sayı, saat |
| Orta | Hepsi diyalog (0.9×) | Detay: fiyat, saat, yer, fikir değişikliği |
| Zor | Monolog ve diyalog, normal hız, 3 dinleme hakkı | Çeldiriciler: usually/but, olumsuz cümleler, düzeltilen bilgi, karışan sayılar |

| # | Kolay | | Orta | | Zor | |
|---|---|---|---|---|---|---|
| 1 | Meet Emma | Orta | At the café | Orta | Daniel's busy week | Uzun |
| 2 | My bag | Kısa | On the phone | Kısa | A voicemail message | Kısa |
| 3 | A day at my school | Uzun | Buying a train ticket | Uzun | Lost at the airport | Uzun |
| 4 | The weather today | Kısa | At the doctor's | Orta | Two flats | Orta |
| 5 | My favourite food | Orta | Asking for directions | Kısa | Weekend on City Radio | Uzun |
| 6 | My house | Uzun | Hotel check-in | Uzun | The new gym | Orta |
| 7 | At the shop | Kısa | Planning a birthday party | Orta | A message from school | Kısa |
| 8 | My best friend | Orta | At the clothes shop | Orta | Booking a table | Uzun |
| 9 | My weekend | Uzun | At the bus stop | Kısa | My new job | Uzun |
| 10 | My pet cat | Kısa | At the library | Orta | Platform change | Kısa |
| 11 | My grandmother | Kısa | Calling a taxi | Kısa | The shopping list | Orta |
| 12 | My room | Kısa | A new classmate | Uzun | A weekend in London | Uzun |
| 13 | My birthday party | Orta | At the market | Orta | At the cinema | Uzun |
| 14 | In the park | Kısa | Weekend plans | Orta | Welcome to the sports centre | Uzun |
| 15 | My morning | Kısa | Where are my keys? | Kısa | A family photo | Orta |
| 16 | My English teacher | Kısa | At the bakery | Orta | Supermarket announcement | Kısa |
| 17 | Breakfast at my house | Kısa | What's your phone number? | Kısa | A busy family | Orta |
| 18 | My city | Orta | At the swimming pool | Orta | A delayed flight | Orta |
| 19 | My little brother | Kısa | In the classroom | Orta | Our new flat | Uzun |
| 20 | A day at the beach | Orta | Meeting a new neighbour | Orta | The school concert | Orta |
| 21 | My favourite colour | Kısa | At the restaurant | Orta | Lost in the city | Uzun |
| 22 | Our family car | Kısa | At the museum | Kısa | A message from the dentist | Kısa |
| 23 | My village | Orta | Our lost dog | Orta | The new café | Orta |
| 24 | I love winter | Kısa | A day off | Orta | A school trip to the farm | Uzun |
| 25 | My piano lesson | Orta | Buying new shoes | Orta | Weather around the world | Orta |
| 26 | My goldfish | Kısa | At the flower shop | Orta | No sports today | Kısa |
| 27 | My school clothes | Kısa | Ordering a pizza | Kısa | My week at summer camp | Uzun |
| 28 | Grandpa's garden | Orta | Breakfast at the hotel | Orta | At the police station | Orta |
| 29 | Shopping with Mum | Kısa | Lunch today? | Kısa | City news | Orta |
| 30 | My new friend Ken | Orta | At the information desk | Orta | My brother and me | Orta |
| 31 | My toys | Kısa | Buying a sandwich | Kısa | A message from the hotel | Kısa |
| 32 | Fruit I like | Kısa | At the bookshop | Orta | A present for Dad | Orta |
| 33 | Our kitchen | Kısa | The lost umbrella | Orta | Welcome to the zoo | Orta |
| 34 | My new bike | Kısa | Is this seat free? | Kısa | The train to the airport | Orta |
| 35 | A cold day | Kısa | Joining a club | Orta | My busy timetable | Uzun |
| 36 | My aunt Sofia | Kısa | At the ice cream shop | Kısa | Shopping centre announcement | Kısa |
| 37 | My computer | Kısa | Buying a bus ticket | Kısa | My weekend in Paris | Orta |
| 38 | My street | Kısa | Calling the doctor's office | Orta | Changing a hotel booking | Orta |
| 39 | Saturday morning | Kısa | Which film? | Orta | A message from the travel agent | Kısa |
| 40 | Our classroom | Kısa | Where are you from? | Orta | School sports day | Orta |
| 41 | My mum's job | Kısa | Buying vegetables | Kısa | Two schools | Orta |
| 42 | Dinner time | Kısa | What is the homework? | Kısa | The cooking club | Orta |
| 43 | Summer in Spain | Orta | At the gift shop | Orta | My job at the café | Orta |
| 44 | At my friend's house | Kısa | Ordering breakfast | Kısa | What's on this weekend | Orta |
| 45 | Sports I like | Kısa | Planning a picnic | Orta | Swimming lessons | Orta |
| 46 | My grandad | Kısa | At the bakery counter | Kısa | Late train to Manchester | Kısa |
| 47 | My lunch box | Kısa | Where is the toilet? | Kısa | My English family | Orta |
| 48 | Our new house | Kısa | A new T-shirt | Kısa | At the clothes shop till | Orta |
| 49 | The weather in my country | Kısa | Meeting after school | Kısa | A call from school | Kısa |
| 50 | My best friend Ali | Kısa | At the train station café | Kısa | My sister's wedding | Orta |
| 51 | At the beach | Kısa | A phone call to Grandma | Kısa | Booking a doctor's appointment | Orta |
| 52 | My bedroom | Kısa | Buying stamps | Kısa | Tomorrow's weather | Orta |
| 53 | Going to school | Kısa | At the doctor's reception | Kısa | Finding a flat | Orta |
| 54 | My hobbies | Kısa | Choosing a pizza | Kısa | Science Museum information | Kısa |
| 55 | Breakfast in Turkey | Kısa | In the taxi | Kısa | Working in a hotel | Orta |
| 56 | My pet rabbit | Kısa | Lost keys at school | Kısa | Buying train tickets | Orta |
| 57 | My birthday | Kısa | What are you doing this weekend? | Kısa | Swimming practice | Kısa |
| 58 | The supermarket | Kısa | Asking the way to the bank | Kısa | My two children | Orta |
| 59 | My English class | Kısa | Buying a cinema ticket | Kısa | At the hotel reception | Orta |
| 60 | A day at the farm | Kısa | A visit to the library | Kısa | A day at Green Park Zoo | Orta |
| 61 | My phone | Kısa | At the fruit juice bar | Kısa | Choosing a holiday | Orta |
| 62 | Sunday evening | Kısa | Booking a table for dinner | Kısa | Your book is here | Kısa |
| 63 | My uncle Jack | Kısa | Is it your bag? | Kısa | My cooking week | Orta |
| 64 | Rainy day | Kısa | At the swimming pool reception | Kısa | Lost on the bus | Orta |
| 65 | My town market | Kısa | Dinner at home | Kısa | Our class trip | Orta |
| 66 |  |  | Getting a haircut | Kısa |  |  |
| 67 |  |  | A new neighbour | Orta |  |  |
| 68 |  |  | Ordering a cake for a party | Kısa |  |  |
| 69 |  |  | What time is it? | Kısa |  |  |
| 70 |  |  | Planning a trip to the zoo | Orta |  |  |

## A2 içeriği

200 metin: Kolay 65, Orta 70, Zor 65. Soru sayıları A1 ile aynı (3 / 4 / 5). Hız biraz daha yüksek: Kolay 0.9×, Orta 0.95×, Zor 1.0× (3 dinleme hakkı).

| Alt seviye | Dil yapıları | Ölçtüğü beceri |
|---|---|---|
| Kolay | Geçmiş zaman, sıklık zarfları, karşılaştırma | Ana bilgi: kim, ne zaman, ne yaptı |
| Orta | Rica, öneri, plan yapma (shall we / let's / I'd like) | Önerilerin reddi, son karar, fiyat ve saat |
| Zor | Duyuru, podcast, şikâyet, hayat hikâyesi | Bilgi birleştirme (ör. saat − 30 dk), kime ait olduğu, düzeltilen bilgi |

| # | Kolay | | Orta | | Zor | |
|---|---|---|---|---|---|---|
| 1 | My last holiday | Uzun | Booking a hotel room | Orta | Gate change | Kısa |
| 2 | A note from Mum | Kısa | At the pharmacy | Orta | How to sleep better | Uzun |
| 3 | My working day | Orta | Taking a shirt back | Orta | Changing an appointment | Orta |
| 4 | My town | Uzun | Where shall we eat? | Uzun | Museum audio guide | Uzun |
| 5 | Can you call me back? | Kısa | Meeting at the station | Kısa | A message from the landlord | Kısa |
| 6 | Why I love tennis | Orta | A job interview | Uzun | Which phone should I buy? | Orta |
| 7 | A busy Saturday | Orta | At the post office | Kısa | My grandfather's life | Uzun |
| 8 | What my family does | Uzun | Renting a bike | Orta | Morning traffic news | Orta |
| 9 | This week's weather | Kısa | Planning a holiday | Uzun | Cooking class | Uzun |
| 10 | My new phone | Orta | Did you like the film? | Orta | A problem with the room | Uzun |
| 11 | My first job | Orta | At the hairdresser's | Kısa | The weekend forecast | Orta |
| 12 | Dinner is at Grandma's | Kısa | I left my bag on the bus | Orta | Welcome to Oak Hill School | Uzun |
| 13 | My favourite place | Orta | Moving house | Uzun | Training is cancelled | Kısa |
| 14 | Learning to drive | Orta | Ordering food by phone | Orta | Two different holidays | Uzun |
| 15 | The bus is late | Kısa | The school trip | Uzun | Summer camp information | Orta |
| 16 | A rainy Sunday | Kısa | Choosing a present | Orta | New library rules | Uzun |
| 17 | My best holiday photo | Orta | Joining a gym | Orta | Closing-down sale | Orta |
| 18 | Living alone | Orta | Asking about a flat | Uzun | At the vet | Uzun |
| 19 | A message from Ben | Kısa | Are you free tonight? | Kısa | Interview with a chef | Uzun |
| 20 | My hobby: photography | Orta | Which course should I take? | Uzun | Bus service changes | Kısa |
| 21 | A surprise party | Orta | Buying a return ticket | Orta | Summer music festival | Uzun |
| 22 | My grandmother's recipe | Orta | Hiring a car | Uzun | Pool announcement | Kısa |
| 23 | The meeting has moved | Kısa | Too much noise | Orta | A pilot's life | Uzun |
| 24 | Why I love trains | Orta | Have you seen my phone? | Kısa | Returning a laptop | Uzun |
| 25 | My first day at work | Orta | Planning a dinner party | Uzun | Storm warning | Orta |
| 26 | A day in the snow | Orta | At the bank | Orta | Safety on board | Orta |
| 27 | My neighbour's dog | Orta | Booking a flight | Uzun | The history of chocolate | Uzun |
| 28 | Can you get the car? | Kısa | At the optician's | Orta | A lost passport | Uzun |
| 29 | Why I started running | Orta | A quick question | Kısa | Volunteering at an animal shelter | Uzun |
| 30 | My grandparents' farm | Orta | Which hotel? | Uzun | Train strike tomorrow | Orta |
| 31 | A trip to the dentist | Orta | At the dry cleaner's | Kısa | A message from the gym | Kısa |
| 32 | My favourite café | Orta | A new phone plan | Uzun | Which job should I take? | Uzun |
| 33 | Learning the guitar | Orta | When can we meet? | Orta | Before the hike | Uzun |
| 34 | Party on Saturday | Kısa | A problem with my order | Orta | Wake-up call | Orta |
| 35 | Last night's dinner | Orta | At the tourist office | Uzun | Living abroad | Uzun |
| 36 | My cousin's wedding | Orta | At the garage | Orta | Concert cancelled | Kısa |
| 37 | Moving to a new city | Orta | Asking for a day off | Orta | How to learn a language | Uzun |
| 38 | Running late | Kısa | At the check-in desk | Orta | Problems in the flat | Uzun |
| 39 | My first concert | Orta | Ordering a birthday cake | Orta | A factory tour | Uzun |
| 40 | A day at the zoo | Orta | A late library book | Orta | Hospital visiting hours | Orta |
| 41 | Shopping online | Orta | Planning a road trip | Uzun | Interview for a hotel job | Uzun |
| 42 | Change of plans | Kısa | At the electronics shop | Orta | Ferry announcement | Kısa |
| 43 | My favourite season | Orta | Can you help me? | Kısa | A year in Spain | Uzun |
| 44 | Visiting a castle | Orta | No reservation | Orta | Choosing a university | Uzun |
| 45 | Why I started yoga | Orta | Organising the office party | Uzun | New recycling rules | Uzun |
| 46 | My first flight | Orta | Buying a sofa | Orta | Fog in Amsterdam | Orta |
| 47 | A message from Dad | Kısa | Feeling ill at work | Orta | Saving money | Uzun |
| 48 | Why I love my job | Kısa | At the bike shop | Orta | A noisy hotel room | Uzun |
| 49 | Our new kitten | Orta | Can you recommend a restaurant? | Kısa | Changes at City Gym | Kısa |
| 50 | A busy morning | Orta | Signing up for a language course | Orta | Opening my own café | Uzun |
| 51 | Learning to swim | Orta | A problem with the internet | Orta | Planning a school reunion | Uzun |
| 52 | The new shopping centre | Orta | Choosing a birthday present | Orta | Morning travel news | Orta |
| 53 | Dinner plans changed | Kısa | At the train ticket machine | Kısa | At the estate agent | Uzun |
| 54 | Volunteering at the library | Orta | Looking for a flatmate | Orta | Appointment cancelled | Kısa |
| 55 | A walk in the forest | Orta | Making a hair appointment | Orta | Old town walking tour | Uzun |
| 56 | My grandmother's garden | Kısa | Returning shoes | Orta | A problem with the rent | Uzun |
| 57 | The train is cancelled | Kısa | Planning a barbecue | Orta | Closing time | Kısa |
| 58 | Starting university | Orta | At the pharmacy counter | Kısa | Less time on my phone | Uzun |
| 59 | Why I sold my car | Kısa | Choosing a holiday hotel | Orta | Choosing a course | Orta |
| 60 | A concert in the park | Orta | Missing the last bus | Orta | Three-day forecast | Orta |
| 61 | My favourite teacher | Orta | Asking about a job advert | Orta | Interview with a young chef | Uzun |
| 62 | I can't come tomorrow | Kısa | Lost in a new city | Orta | On board the ferry | Orta |
| 63 | Our holiday in Italy | Orta | Ordering flowers online | Orta | Which laptop should I buy? | Orta |
| 64 | Why I like working from home | Orta | At the gym | Orta | Museum of Transport | Uzun |
| 65 | A birthday surprise | Orta | A wrong order | Kısa | A day off work | Uzun |
| 66 |  |  | Booking a campsite | Orta |  |  |
| 67 |  |  | Talking about a new job | Orta |  |  |
| 68 |  |  | A parcel for a neighbour | Kısa |  |  |
| 69 |  |  | Planning a weekend in the city | Orta |  |  |
| 70 |  |  | Choosing a phone for Grandpa | Orta |  |  |

Her soruda Türkçe açıklama ve metindeki kanıt cümlesi bulunur. Kontrol sonrası açılan metinde bu cümleler soru numarasıyla işaretlenir.

## Dinleyerek Öğren (content/diller)

TÖMER seviyelerinden bağımsız ikinci katalog: dil kartları → Kolay / Orta / Zor → metinler. Metinler hedef dilde, sorular ve şıklar Türkçe (`questionLang: "tr"`); kanıt cümlesi hedef dilde. Manifest'teki her dil `id` (iki harf), `label`, `flag`, `lang` (sesin dili; her setin `audio.lang` değeri bununla eşleşmeli) taşır. İçeriği olmayan diller "Yakında" olarak görünür.

Şu an İspanyolca ve Portekizce'de 10'ar Kolay (3 soru), Orta (4 soru, diyalog) ve Zor (5 soru, 3 dinleme hakkı) metin var; her zorlukta kısa, orta ve uzun metin karışık.

### İspanyolca (es-ES)

| Zorluk | # | Uzunluk | Kelime | Başlık |
|---|---|---|---|---|
| Kolay | 1 | Kısa | 36 | Me llamo Lucía |
| Kolay | 2 | Orta | 62 | Mi casa nueva |
| Kolay | 3 | Orta | 63 | Un día normal |
| Kolay | 4 | Kısa | 39 | En la cafetería |
| Kolay | 5 | Orta | 72 | Mi familia |
| Kolay | 6 | Kısa | 42 | El tiempo hoy |
| Kolay | 7 | Kısa | 48 | ¿Dónde está la farmacia? |
| Kolay | 8 | Orta | 99 | Mis vacaciones en Galicia |
| Kolay | 9 | Kısa | 38 | Mensaje para Carlos |
| Kolay | 10 | Uzun | 126 | Mi mejor amiga |
| Orta | 1 | Orta | 78 | Reserva en el restaurante |
| Orta | 2 | Orta | 79 | En la tienda de ropa |
| Orta | 3 | Kısa | 46 | Planes para el fin de semana |
| Orta | 4 | Orta | 71 | En la consulta del médico |
| Orta | 5 | Uzun | 111 | Buscando piso |
| Orta | 6 | Orta | 82 | En la estación de tren |
| Orta | 7 | Orta | 99 | Problema con el pedido |
| Orta | 8 | Uzun | 115 | Una entrevista corta |
| Orta | 9 | Orta | 89 | ¿Cómo llego al museo? |
| Orta | 10 | Orta | 110 | Organizando la fiesta |
| Zor | 1 | Orta | 88 | Aviso en el aeropuerto |
| Zor | 2 | Orta | 95 | Noticias de la mañana |
| Zor | 3 | Orta | 89 | Mensaje de voz: cambio de planes |
| Zor | 4 | Uzun | 117 | Visita guiada: el casco antiguo |
| Zor | 5 | Uzun | 165 | Podcast: trabajar desde casa |
| Zor | 6 | Uzun | 136 | Reclamación en el hotel |
| Zor | 7 | Uzun | 116 | Instrucciones del examen |
| Zor | 8 | Uzun | 131 | Llamada al taller |
| Zor | 9 | Kısa | 47 | Aviso: cierre de la biblioteca |
| Zor | 10 | Uzun | 188 | Entrevista: una chef joven |

### Portekizce (pt-BR)

| Zorluk | # | Uzunluk | Kelime | Başlık |
|---|---|---|---|---|
| Kolay | 1 | Kısa | 35 | Eu sou a Beatriz |
| Kolay | 2 | Orta | 64 | Meu apartamento |
| Kolay | 3 | Orta | 66 | A rotina da Juliana |
| Kolay | 4 | Kısa | 40 | Na padaria |
| Kolay | 5 | Orta | 73 | Minha família |
| Kolay | 6 | Kısa | 48 | Previsão do tempo |
| Kolay | 7 | Kısa | 46 | Onde fica o banco? |
| Kolay | 8 | Orta | 76 | Férias em Florianópolis |
| Kolay | 9 | Kısa | 40 | Recado para o Pedro |
| Kolay | 10 | Uzun | 139 | Meu melhor amigo |
| Orta | 1 | Orta | 72 | Reserva no restaurante |
| Orta | 2 | Orta | 85 | Na loja de sapatos |
| Orta | 3 | Kısa | 48 | Planos para o sábado |
| Orta | 4 | Orta | 73 | No consultório |
| Orta | 5 | Orta | 110 | Procurando apartamento |
| Orta | 6 | Orta | 80 | Na rodoviária |
| Orta | 7 | Orta | 93 | Problema com o pedido |
| Orta | 8 | Uzun | 126 | Uma entrevista rápida |
| Orta | 9 | Orta | 89 | Como chego ao museu? |
| Orta | 10 | Orta | 109 | Organizando a festa |
| Zor | 1 | Orta | 82 | Aviso no aeroporto |
| Zor | 2 | Orta | 96 | Notícias da manhã |
| Zor | 3 | Orta | 87 | Áudio: mudança de planos |
| Zor | 4 | Uzun | 117 | Visita guiada: o centro histórico |
| Zor | 5 | Uzun | 158 | Podcast: trabalhar de casa |
| Zor | 6 | Uzun | 143 | Reclamação no hotel |
| Zor | 7 | Orta | 109 | Instruções da prova |
| Zor | 8 | Uzun | 131 | Ligação da oficina |
| Zor | 9 | Kısa | 50 | Aviso: fechamento da biblioteca |
| Zor | 10 | Uzun | 190 | Entrevista: uma chef jovem |

## Tarayıcı desteği

Güncel Chrome, Edge, Safari ve Firefox. TTS sesleri işletim sistemine bağlıdır. Ses bulunamazsa oynatıcı anlaşılır bir hata mesajı gösterir; bu durumda setlere `audio.src` ile kayıt eklenebilir.
