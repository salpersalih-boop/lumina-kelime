/* ============================================================
   LUMINA — GERİ GİTME (tarayıcı geçmişi)
   Ekran ve pencere (modal) geçişleri tarayıcı geçmişine yazılır. Böylece:
   - telefonda kenardan içeri kaydırma (iPhone Safari, Android geri hareketi),
   - farenin yan "geri" tuşu, tarayıcının geri düğmesi, Alt+Sol ok
   uygulamanın içinde bir önceki ekrana döner.
   Uygulama içindeki "geri" tuşları da aynı geçmişi kullanır; ileri-geri karışmaz.
============================================================ */
const Nav = (() => {
    const supported = typeof history !== 'undefined' && typeof history.pushState === 'function';
    const RACE_SCREENS = ['typingRaceScreen', 'quickQuizScreen', 'speedMatchScreen'];

    const stack = [];      // geçmişteki bizim girdilerimiz: ekran id'si ya da 'modal:<id>'
    let ignorePops = 0;    // kendi tetiklediğimiz history.back()/go() sayısı
    let applying = false;  // geçmişten bir ekran uygulanırken yeni kayıt yazılmasın

    const top = () => stack[stack.length - 1];
    const write = (method, entry) => history[method]({ lumina: entry, idx: stack.length - 1 }, '');

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
        if (id === top()) return;

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
            default:               showScreen(id);
        }
    }

    function onPopState(e) {
        if (ignorePops > 0) { ignorePops--; return; }
        const entry = e.state && e.state.lumina;
        if (!entry) return;

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
    }

    if (supported) window.addEventListener('popstate', onPopState);

    return { recordScreen, recordModalOpen, recordModalClose };
})();
