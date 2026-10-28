/* ============================================================
   LUMINA — UYGULAMA AYARLARI
   ------------------------------------------------------------
   1) Firebase Console → Proje ayarları → "Uygulamalarınız" → Web (</>)
      bölümündeki firebaseConfig değerlerini aşağıya yapıştırın.
   2) Authentication → Sign-in method: "E-posta/Şifre" ve "Google" açık olsun.
   3) Authentication → Settings → Authorized domains: sitenizin alan adını ekleyin
      (localhost zaten ekli gelir).
   4) Firestore Database oluşturun ve firestore.rules dosyasını yayınlayın:
        firebase deploy --only firestore:rules

   Bu değerler gizli değildir (web istemci anahtarıdır); güvenliği
   firestore.rules dosyası sağlar.
============================================================ */
window.LUMINA_CONFIG = {
    firebase: {
        apiKey: 'AIzaSyBKkcL_QV7oCZAj5lV6tkjY4OlPNIhaQXY',
        authDomain: 'lumina-7b1bf.firebaseapp.com',
        projectId: 'lumina-7b1bf',
        storageBucket: 'lumina-7b1bf.firebasestorage.app',
        messagingSenderId: '648027818893',
        appId: '1:648027818893:web:430392fa6404a2f9bacbc4'
    },

    // C# / SQL Server API adresi. BOŞ bırakırsanız uygulama kelimeleri doğrudan
    // data/*.csv dosyalarından okur (önerilen, sunucu gerektirmez).
    // Yerel geliştirmede örnek: 'http://localhost:7047/api'
    apiBaseUrl: ''
};
