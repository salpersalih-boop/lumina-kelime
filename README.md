# Lumina — Çok Dilli Kelime Çalışma Uygulaması

Düz HTML/CSS/JS arayüzü + Firebase (giriş ve ilerleme senkronu) + isteğe bağlı .NET 9 / SQL Server API.

## Klasör yapısı

```
index.html             Tek sayfa uygulama
service-worker.js      Çevrimdışı önbellek (kökte olmalı)
css/style.css          Tüm stiller
js/
  firebase-config.js   Firebase ve API ayarları
  utils.js             Ortak yardımcılar (escapeHtml)
  auth.js              Giriş (Firebase Auth) + ilerleme senkronu (Firestore)
  app/                 Uygulama — index.html'deki sırayla yüklenir
    nav.js             Geri gitme: ekranları tarayıcı geçmişine yazar (kaydırma / fare geri tuşu)
    state.js           Sabitler, global durum, çevrimdışı bildirimi
    data.js            CSV/API okuma, dil kaynakları
    progress.js        localStorage ilerleme kaydı
    dashboard.js       Ekran geçişleri, ana panel
    study.js           Grup ekranı ve kart oturumu
    lab.js             Fiil lab, eşleştirme, sandbox, sesli okuma
    ui.js              Bildirimler, tema, modallar
    main.js            Sayfa açılış kurulumu
    test-write.js      Test ve yazma modları
    race.js            Yarış arenası (hızlı yazma / şık / eşleştirme)
    account.js         Hesap menüsü
data/*.csv             Kelime listeleri (futbol.csv dahil)
firestore.rules        Firestore güvenlik kuralları
firebase.json          Firebase Hosting ayarı
server/
  Lumina.Api/          İsteğe bağlı C# API
  Database/            SQL Server şeması ve içe aktarma betikleri
Baslat.bat             Yerelde çalıştırır (http://localhost:3000)
```

`js/app/` içindeki dosyalar ayrı `<script>` etiketleriyle yüklenir ve aynı global kapsamı paylaşır; bu yüzden **sıraları önemlidir**. Yeni dosya eklerseniz hem `index.html`'e hem `service-worker.js` → `STATIC_ASSETS` listesine ekleyin.

## Sürüm güncelleme
Kodu değiştirip yayınlarken `index.html` içindeki tüm `?v=` değerlerini ve `service-worker.js` içindeki `CACHE_NAME` sürümünü bir artırın; böylece kullanıcılar eski dosyaları görmez.

## Hızlı başlangıç (sunucusuz)
1. Firebase Console'da proje açın → **Authentication → Sign-in method**: *E-posta/Şifre* ve *Google*'ı etkinleştirin.
2. **Proje ayarları → Web uygulaması (</>)** değerlerini `js/firebase-config.js` içine yapıştırın.
3. **Authentication → Settings → Authorized domains**: yayın alan adınızı ekleyin.
4. **Firestore Database** oluşturun, ardından kuralları yayınlayın (kurallar değiştiğinde tekrar çalıştırın):
   `firebase deploy --only firestore:rules`
5. Yerelde denemek için `Baslat.bat`'a çift tıklayın (ya da klasörde `npx serve .`). Dosyayı çift tıklayıp `file://` ile açmayın; Firebase ve service worker çalışmaz.
6. Yayın: `firebase deploy --only hosting` (`firebase.json` hazır).

Firebase ayarı yapılmadan da uygulama açılır; yalnızca **Misafir** modu çalışır (ilerleme sadece o cihazda).

## Kelime verisi
Kaynak Excel: `Lumına Kelime/Lumina_Kelimeler (3).xlsx` (depoda yok, yedeğini ayrıca saklayın). Excel'i değiştirirseniz ilgili sayfayı aynı sütun düzeniyle `;` ayraçlı CSV olarak `data/` klasörüne kaydedin; çevirisi boş satırlar uygulamada otomatik atlanır.

| Dosya | Sütunlar |
|---|---|
| english.csv | Kelime; Türkçe; V1; V2; V3 |
| german.csv | ID; Kelime; Frekans; Türkçe |
| french.csv, spanish.csv, norwegian.csv, futbol.csv | Sıra; Kelime; Tür; Türkçe |
| swedish.csv | Sıra; Fransızca; İsveççe; Türkçe |
| italian.csv, portuguese.csv, russian.csv, dutch.csv | Sıra; Kelime; Tür; Türkçe |

İtalyanca, Portekizce (Avrupa Portekizcesi), Rusça ve Felemenkçe listeleri ~1.000 temel kelimeden oluşur; isimler artikelleriyle yazılmıştır (il/la, o/a, de/het). Excel'de karşılığı yoktur, doğrudan bu CSV'ler düzenlenir.

## Dil ekleme / sıralama
Tüm diller `js/app/data.js` → `LANGUAGES` listesinde tanımlıdır; dil seçim ekranındaki kartlar, başlıklar, bayraklar, sesli okuma dili ve grup sayıları buradan üretilir. Listedeki sıra ekrandaki sıradır.

1. Kelime dosyasını `data/` klasörüne koyun (`Sıra;Kelime;Tür;Türkçe Anlamı` düzeni en kolayıdır → `parse: parseSimpleCsv`).
2. `LANGUAGES` listesine bir satır ekleyin. `code` ilerleme anahtarıdır; yayına aldıktan sonra değiştirmeyin.
3. İsterseniz `css/style.css` sonundaki "YENİ DİL TEMALARI" bölümünden bir tema kopyalayıp renklerini değiştirin.

**TÖMER** kartı şimdilik `soon: true` ile "Yakında" olarak duruyor. İçerik hazır olunca `data/tomer.csv` dosyasını ekleyip satırda `csv: 'tomer.csv', parse: parseSimpleCsv` yazın ve `soon: true` kısmını silin.

## Nasıl çalışır
- **Kelimeler:** `data/*.csv` doğrudan okunur (UTF-8 ve Windows-1254 otomatik tanınır). `apiBaseUrl` doluysa önce API denenir, olmazsa CSV'ye düşer.
- **Hesap:** Firebase Authentication — e-posta/şifre, Google, gerçek şifre sıfırlama e-postası, e-posta doğrulama.
- **İlerleme:** `localStorage` + Firestore (`users/{uid}/progress/{dil}`); iki cihaz arasında son güncellenen kazanır.
- **Admin:** Rol Firestore'daki `users/{uid}.role` alanındadır. Kendinizi admin yapmak için Firebase Console'dan o belgeye `role: "admin"` yazın (kurallar istemcinin bunu yapmasını engeller).

## İsteğe bağlı API (SQL Server)
1. `server/Database/schema.sql` (İngilizce için) ve `server/Database/import_words.sql` (diğer diller; önce CSV'leri `C:\LuminaData\` içine kopyalayın) dosyalarını SSMS'de çalıştırın.
2. `server/Lumina.Api/appsettings.json` içindeki `ConnectionStrings:Lumina` ve `Cors:AllowedOrigins` değerlerini ayarlayın.
3. `cd server/Lumina.Api && dotnet run`, ardından `js/firebase-config.js` → `apiBaseUrl: 'http://localhost:7047/api'`.

Uç noktalar: `GET /api/words`, `/api/words/{german|french|swedish|spanish|norwegian}`, her biri için `/count`. Futbol listesi yalnızca CSV'den okunur.
