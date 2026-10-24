# Lumina — Çok Dilli Kelime Çalışma Uygulaması

Düz HTML/CSS/JS arayüzü + Firebase (giriş ve ilerleme senkronu) + isteğe bağlı .NET 9 / SQL Server API.

## Hızlı başlangıç (sunucusuz)
1. Firebase Console'da proje açın → **Authentication → Sign-in method**: *E-posta/Şifre* ve *Google*'ı etkinleştirin.
2. **Proje ayarları → Web uygulaması (</>)** değerlerini `firebase-config.js` içine yapıştırın.
3. **Authentication → Settings → Authorized domains**: yayın alan adınızı ekleyin.
4. **Firestore Database** oluşturun, ardından kuralları yayınlayın:
   `firebase deploy --only firestore:rules`
5. Yerelde denemek için klasörde `npx serve .` (dosyayı çift tıklayıp `file://` ile açmayın; Firebase ve service worker çalışmaz).
6. Yayın: `firebase deploy --only hosting` (`firebase.json` hazır).

Firebase ayarı yapılmadan da uygulama açılır; yalnızca **Misafir** modu çalışır (ilerleme sadece o cihazda).

## Kelime verisi
Kaynak Excel: `Lumına Kelime/Lumina_Kelimeler (3).xlsx` (tam veri). `Lumina1.xlsx` eski ve eksiktir (dil başına 1.000 çeviri). Excel'i değiştirirseniz ilgili sayfayı aynı sütun düzeniyle `;` ayraçlı CSV olarak `data/` klasörüne kaydedin; çevirisi boş satırlar uygulamada otomatik atlanır.

## Nasıl çalışır
- **Kelimeler:** `data/*.csv` doğrudan okunur (UTF-8 ve Windows-1254 otomatik tanınır). `apiBaseUrl` doluysa önce API denenir, olmazsa CSV'ye düşer.
- **Hesap:** Firebase Authentication — e-posta/şifre, Google, gerçek şifre sıfırlama e-postası, e-posta doğrulama.
- **İlerleme:** `localStorage` + Firestore (`users/{uid}/progress/{dil}`); iki cihaz arasında son güncellenen kazanır.
- **Admin:** Rol Firestore'daki `users/{uid}.role` alanındadır. Kendinizi admin yapmak için Firebase Console'dan o belgeye `role: "admin"` yazın (kurallar istemcinin bunu yapmasını engeller).

## İsteğe bağlı API (SQL Server)
1. `Database/schema.sql` (İngilizce için) ve `Database/import_words.sql` (diğer diller; önce CSV'leri `C:\LuminaData\` içine kopyalayın) dosyalarını SSMS'de çalıştırın. Kontrol sorgusu beklenen satır sayılarını yazar.
2. `Lumina.Api/appsettings.json` içindeki `ConnectionStrings:Lumina` ve `Cors:AllowedOrigins` değerlerini ayarlayın.
3. `cd Lumina.Api && dotnet run`, ardından `firebase-config.js` → `apiBaseUrl: 'http://localhost:7047/api'`.

Uç noktalar: `GET /api/words`, `/api/words/{german|french|swedish|spanish|norwegian}`, her biri için `/count`.

## Temizlik önerisi
Aşağıdakiler artık kullanılmıyor, silebilirsiniz: `Lumina.Api.New/` (şablon WeatherForecast projesi), `temp_extracted/`, `update_script.py`, `update_script.js`, kökteki `SQLQuery1.sql`/`SQLQuery2.sql`.
