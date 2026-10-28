/* ============================================================
   LUMINA — BAŞLANGIÇ
   Sayfa yüklenince çalışan kurulum ve olay bağlantıları
============================================================ */

// ── INITIALIZATION ──
document.addEventListener('DOMContentLoaded', async () => {
    loadSavedTheme();
    NotificationManager.renderNotifs();

    // index.html çift tıklanarak (file://) açıldıysa tarayıcı CSV'leri okutmaz → kelimeler eksik görünür
    if (location.protocol === 'file:') {
        const b = document.createElement('div');
        b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10000;background:#e53935;color:#fff;padding:10px 14px;text-align:center;font:600 14px Inter,sans-serif';
        b.textContent = '⚠️ Sayfa dosya olarak açıldı: kelime dosyaları okunamaz. Klasörde "npx serve ." ile açın (http://localhost:3000).';
        document.body.appendChild(b);
    }

    // Başlangıç dil verisi (hata olsa bile arayüz çalışmaya devam etsin)
    try {
        await loadLanguageData('English');
        await loadVerbsLabData();
    } catch (e) {
        console.error('Başlangıç verisi yüklenemedi:', e);
    }

    // Reset Progress Button
    document.getElementById('btnResetProgress')?.addEventListener('click', () => {
        if (confirm('Tüm ilerlemeniz kalıcı olarak silinecek. Emin misiniz?')) {
            resetActiveProgress();
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

    // Dil kartlarının tıklamaları: js/app/dashboard.js → renderLanguageCards()

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

    // Oturum durumunu bekle (Firebase kayıtlı oturumu geri yükler)
    const session = await AuthManager.ready;
    if (session) {
        updateUserUI(session);
        showScreen('languageScreen');
    } else {
        showScreen('authScreen');
    }
});
