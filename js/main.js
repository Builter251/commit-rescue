/* ==========================================================================
   main.js — 네비게이션, 햄버거 메뉴, 스크롤 활성 표시, 테마, 복사 버튼
   ========================================================================== */

(function () {
  'use strict';

  var toast = window.CRUtil.toast;
  var copyText = window.CRUtil.copyText;

  /* ------------------------------ 햄버거 메뉴 ------------------------------ */
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('navMenu');

  function closeMenu() {
    if (!menu) return;
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '메뉴 열기');
  }
  function openMenu() {
    menu.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', '메뉴 닫기');
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      menu.classList.contains('is-open') ? closeMenu() : openMenu();
    });

    // 메뉴 안의 링크를 고르면 닫는다 (키보드 이동 포함)
    menu.addEventListener('click', function (e) {
      if (e.target.closest('.nav__link')) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        closeMenu();
        toggle.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (!menu.classList.contains('is-open')) return;
      if (e.target.closest('.nav__inner')) return;
      closeMenu();
    });

    // 데스크톱 폭으로 돌아오면 인라인 상태를 초기화한다
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 768) closeMenu();
    });
  }

  /* --------------------------- 스크롤 활성 표시 --------------------------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  function setActive(id) {
    links.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-active', on);
      if (on) { a.setAttribute('aria-current', 'true'); } else { a.removeAttribute('aria-current'); }
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    var visible = {};
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });
      var best = null, bestRatio = 0;
      sections.forEach(function (s) {
        var r = visible[s.id] || 0;
        if (r > bestRatio) { bestRatio = r; best = s.id; }
      });
      if (best) setActive(best);
    }, { rootMargin: '-70px 0px -55% 0px', threshold: [0, 0.15, 0.4, 0.75, 1] });

    sections.forEach(function (s) { observer.observe(s); });
  }

  /* ------------------------------- 테마 토글 ------------------------------- */
  var themeBtn = document.getElementById('themeToggle');

  function paintThemeButton(theme) {
    if (!themeBtn) return;
    var isDark = theme === 'dark';
    themeBtn.querySelector('.theme-toggle__icon').textContent = isDark ? '☀️' : '🌙';
    themeBtn.querySelector('.theme-toggle__text').textContent = isDark ? '라이트 모드' : '다크 모드';
    themeBtn.setAttribute('aria-pressed', String(isDark));
    themeBtn.setAttribute('aria-label', isDark ? '라이트 모드로 바꾸기' : '다크 모드로 바꾸기');
  }

  paintThemeButton(document.documentElement.getAttribute('data-theme'));

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('cr-theme', next); } catch (e) { /* noop */ }
      paintThemeButton(next);
    });
  }

  /* ------------------------------- 복사 버튼 ------------------------------- */
  // 결과 영역은 동적으로 그려지므로 문서 단위 위임으로 처리한다
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.copy-btn');
    if (!btn || btn.disabled) return;

    var text = btn.dataset.copy;
    if (!text) {
      var pre = btn.parentElement.querySelector('pre');
      text = pre ? pre.textContent : '';
    }
    copyText(text).then(function () {
      toast('복사했습니다');
      var old = btn.textContent;
      btn.textContent = '복사됨';
      setTimeout(function () { btn.textContent = old; }, 1400);
    }).catch(function () {
      toast('복사에 실패했습니다. 직접 선택해 복사해주세요.');
    });
  });
})();
