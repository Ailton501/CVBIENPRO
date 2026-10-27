(() => {
    'use strict';

    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    const connectors = [
        document.getElementById('conn-1-2'),
        document.getElementById('conn-2-3'),
    ];
    const contentArea = document.getElementById('content-area');
    const skillBars = document.querySelectorAll('.skill-bar-fill');
    const hudLogo = document.querySelector('.hud-logo');
    const printBtn = document.getElementById('print-btn');

    const pageIds = ['page1', 'page2', 'page3'];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let currentPageIndex = 0;
    let isTransitioning = false;

    // --- Estado de la navegación (menú, conectores, aria-current) ---
    function setNavState(pageId) {
        navItems.forEach(item => {
            const isActive = item.dataset.target === pageId;
            item.classList.toggle('active', isActive);
            if (isActive) {
                item.setAttribute('aria-current', 'page');
            } else {
                item.removeAttribute('aria-current');
            }
        });

        const index = pageIds.indexOf(pageId);
        connectors.forEach((conn, i) => {
            conn.classList.toggle('active-connector', i < index);
        });
        currentPageIndex = index;
    }

    // --- Historial: permite usar el botón "atrás" y compartir #page2, #page3 ---
    function updateHash(pageId, replace = false) {
        try {
            history[replace ? 'replaceState' : 'pushState'](null, '', '#' + pageId);
        } catch (err) {
            // Algunos navegadores restringen el historial en file://; no es crítico.
        }
    }

    // --- Barras de progreso ---
    function animateSkillBars() {
        skillBars.forEach(bar => {
            bar.style.width = '0%';
        });

        requestAnimationFrame(() => {
            skillBars.forEach((bar, index) => {
                const targetWidth = bar.dataset.width;
                setTimeout(() => {
                    bar.style.width = targetWidth + '%';
                }, reduceMotion.matches ? 0 : index * 70);
            });
        });
    }

    // --- Navegar con transición ---
    function navigateTo(pageId, { push = true } = {}) {
        if (isTransitioning) return;
        if (!pageIds.includes(pageId)) return;

        const targetView = document.getElementById(pageId);
        if (!targetView || targetView.classList.contains('active')) return;

        isTransitioning = true;

        const currentView = document.querySelector('.view.active');

        setNavState(pageId);
        if (push) updateHash(pageId);

        if (currentView) currentView.classList.remove('active');

        const enterDelay = reduceMotion.matches ? 0 : 150;
        const unlockDelay = reduceMotion.matches ? 0 : 450;

        setTimeout(() => {
            targetView.classList.add('active');
            contentArea.scrollTop = 0;

            if (pageId === 'page2') animateSkillBars();

            setTimeout(() => {
                isTransitioning = false;
            }, unlockDelay);
        }, enterDelay);
    }

    // --- Mostrar una página sin transición (carga inicial con #hash) ---
    function showImmediately(pageId) {
        views.forEach(view => view.classList.toggle('active', view.id === pageId));
        setNavState(pageId);
        contentArea.scrollTop = 0;
        if (pageId === 'page2') setTimeout(animateSkillBars, 300);
    }

    // --- Ir a la página anterior / siguiente ---
    function go(step) {
        const nextIndex = Math.min(Math.max(currentPageIndex + step, 0), pageIds.length - 1);
        if (nextIndex !== currentPageIndex) navigateTo(pageIds[nextIndex]);
    }

    // --- Menú lateral / barra inferior (los <button> ya manejan Enter y Espacio) ---
    navItems.forEach(item => {
        item.addEventListener('click', () => navigateTo(item.dataset.target));
    });

    // --- Teclado: solo ← y →, para no bloquear el scroll vertical con ↑ ↓ ---
    document.addEventListener('keydown', e => {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        const tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        if (e.key === 'ArrowRight') {
            go(1);
        } else if (e.key === 'ArrowLeft') {
            go(-1);
        }
    });

    // --- Swipe horizontal en móvil ---
    let touchStartX = 0;
    let touchStartY = 0;

    contentArea.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    contentArea.addEventListener('touchend', e => {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;

        // Solo si el gesto es claramente horizontal
        if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;

        go(deltaX < 0 ? 1 : -1); // izquierda = siguiente, derecha = anterior
    }, { passive: true });

    // --- Botón "atrás" / "adelante" del navegador ---
    window.addEventListener('popstate', () => {
        const id = location.hash.slice(1);
        navigateTo(pageIds.includes(id) ? id : 'page1', { push: false });
    });

    // --- Logo: volver al inicio con un destello ---
    if (hudLogo) {
        hudLogo.addEventListener('click', () => {
            navigateTo('page1');
            hudLogo.classList.add('flash');
            setTimeout(() => hudLogo.classList.remove('flash'), 300);
        });
    }

    // --- Guardar como PDF (usa el diálogo de impresión del navegador) ---
    if (printBtn) {
        printBtn.addEventListener('click', () => window.print());
    }

    // Al imprimir, las barras deben verse completas aunque no se haya visitado la página 2
    window.addEventListener('beforeprint', () => {
        skillBars.forEach(bar => {
            bar.style.transition = 'none';
            bar.style.width = bar.dataset.width + '%';
        });
    });
    window.addEventListener('afterprint', () => {
        skillBars.forEach(bar => {
            bar.style.transition = '';
        });
    });

    // --- Inicialización ---
    const initialId = location.hash.slice(1);
    if (pageIds.includes(initialId)) {
        showImmediately(initialId);
        updateHash(initialId, true);
    } else {
        setNavState('page1');
        updateHash('page1', true);
    }
})();
