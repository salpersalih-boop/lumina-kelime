/* ============================================================
   LUMINA — GERİ GİTME (tarayıcı geçmişi)
   Ekran ve pencere (modal) geçişleri tarayıcı geçmişine yazılır. Böylece:
   - telefonda kenardan içeri kaydırma (iPhone Safari, Android geri hareketi),
   - farenin yan "geri" tuşu, tarayıcının geri düğmesi, Alt+Sol ok
   uygulamanın içinde bir önceki ekrana döner.
   Uygulama içindeki "geri" tuşları da aynı geçmişi kullanır; ileri-geri karışmaz.
   Her girdi ekranın adresini de taşır (#/football/groups/3 …): adresler js/app/router.js'te.
============================================================ */
const Nav = (() => {
    const supported = typeof history !== 'undefined' && typeof history.pushState === 'function';
    const RACE_SCREENS = ['typingRaceScreen', 'quickQuizScreen', 'speedMatchScreen'];

    const stack = [];      // geçmişteki bizim girdilerimiz: ekran id'si ya da 'modal:<id>'
    let ignorePops = 0;    // kendi tetiklediğimiz history.back()/go() sayısı
    let applying = false;  // geçmişten bir ekran uygulanırken yeni kayıt yazılmasın

    const top = () => stack[stack.length - 1];
    // Pencere girdileri adresi değiştirmez; ekran girdileri o ekranın adresini yazar
    const urlOf = entry => entry.startsWith('modal:') || typeof Router === 'undefined' ? undefined : Router.urlFor(entry);
    const write = (method, entry) => history[method]({ lumina: entry, idx: stack.length - 1 }, '', urlOf(entry));

    // Görünen ekranın adresini, geçmişe yeni girdi eklemeden güncelle
    function syncUrl() {
        if (!supported || typeof Router === 'undefined' || !history.state || !history.state.lumina) return;
        if (history.state.lumina.startsWith('modal:')) return;
        const url = Router.current();
        if (url !== location.pathname + location.search + location.hash) history.replaceState(history.state, '', url);
    }

    function goBackTo(index) {
        const steps = stack.length - 1 - index;
        if (steps <= 0) return;
        stack.length = index + 1;
        ignorePops++;
        history.go(-steps);
    }

    // showScreen() her çağrıldığında
    function recordScreen(id) {
        if (!supported || applying) return;
        // Aynı ekran başka içerikle yeniden çizildi (ör. sonraki konu): yalnızca adresi güncelle
        if (id === top()) { if (ignorePops === 0) syncUrl(); return; }

        // Giriş ekranı geçmişte tutulmaz: çıkış yapınca ya da ilk açılışta yığın sıfırlanır
        if (id === 'authScreen' || stack.length === 0 || top() === 'authScreen') {
            stack.length = 0;
            stack.push(id);
            write('replaceState', id);
            return;
        }
        // Açık pencere varken ekran değişirse: pencere girdisinin yerine yeni ekranı yaz
        if (top().startsWith('modal:')) {
            stack.pop();
            if (stack.lastIndexOf(id) === -1) {
                stack.push(id);
                write('replaceState', id);
                return;
            }
        }

        // Uygulama içi "geri" tuşu: hedef ekran zaten geçmişte → oraya geri dön
        const earlier = stack.lastIndexOf(id);
        if (earlier !== -1) {
            goBackTo(earlier);
            return;
        }
        stack.push(id);
        write('pushState', id);
    }

    function recordModalOpen(modalId) {
        if (!supported || applying || stack.length === 0) return;
        const entry = 'modal:' + modalId;
        if (top() === entry) return;
        stack.push(entry);
        write('pushState', entry);
    }

    function recordModalClose(modalId) {
        if (!supported || applying) return;
        const index = stack.lastIndexOf('modal:' + modalId);
        if (index > 0) goBackTo(index - 1);
    }

    function closeOverlays() {
        document.querySelectorAll('.modal-overlay:not(.hidden), .modal:not(.hidden)').forEach(m => m.classList.add('hidden'));
        document.getElementById('userDropdownMenu')?.classList.add('hidden');
        document.getElementById('notifPopover')?.classList.add('hidden');
    }

    function stopRaces() {
        [typeof TypingRace !== 'undefined' && TypingRace,
         typeof QuickQuiz !== 'undefined' && QuickQuiz,
         typeof SpeedMatch !== 'undefined' && SpeedMatch]
            .forEach(game => { if (game && game.cleanup) game.cleanup(); });
    }

    // Geçmişten dönülen ekranı güncel verilerle yeniden çiz
    function showFromHistory(id) {
        switch (id) {
            case 'dashboard':      renderDashboard(); break;
            case 'groupScreen':    state.currentGroup ? openGroup(state.currentGroup) : showScreen(id); break;
            case 'testHubScreen':  openTestHub(); break;
            case 'writeHubScreen': openWriteHub(); break;
            case 'raceHubScreen':  openRaceHub(); break;
            default:
                if (typeof TomerModule !== 'undefined' && TomerModule.refresh(id)) break;
                if (typeof DerslerModule !== 'undefined' && DerslerModule.refresh(id)) break;
                showScreen(id);
        }
    }

    function onPopState(e) {
        // Kendi geri dönüşümüz bitti: hedef girdinin adresini görünen içerikle eşitle
        if (ignorePops > 0) { ignorePops--; if (ignorePops === 0) syncUrl(); return; }
        const entry = e.state && e.state.lumina;
        if (!entry) {
            // Adres çubuğu elle değiştirildi (#/spanish/groups/2 …): o ekranı temiz açılışla göster
            if (typeof Router !== 'undefined' && location.hash.startsWith('#/')) location.reload();
            return;
        }

        const activeId = document.querySelector('.screen.active')?.id;
        closeOverlays();

        // Oturum yokken uygulama ekranlarına geri dönülmesin
        if (entry !== 'authScreen' && !AuthManager.getSession()) {
            stack.length = 0;
            stack.push('authScreen');
            history.pushState({ lumina: 'authScreen', idx: 0 }, '');
            applying = true;
            try { showScreen('authScreen'); } finally { applying = false; }
            return;
        }

        stack.length = Math.max(0, e.state.idx);
        stack.push(entry);

        applying = true;
        try {
            if (entry.startsWith('modal:')) {
                // İleri tuşuyla pencereye dönüldü: pencereyi yeniden aç
                openModal(entry.slice(6));
                return;
            }
            if (RACE_SCREENS.includes(activeId) && activeId !== entry) stopRaces();
            if (entry !== activeId) showFromHistory(entry);
        } catch (err) {
            console.warn('Geri gidilemedi:', err);
        } finally {
            applying = false;
        }
        syncUrl();
    }

    if (supported) window.addEventListener('popstate', onPopState);

    return { recordScreen, recordModalOpen, recordModalClose };
})();
