/* ==========================================================================
   areas.js — V1 5영역 다이어그램 제어 + 결과용 미니 영역 표시
   ========================================================================== */

(function () {
  'use strict';

  const esc = window.CRUtil.escapeHtml;

  /* 5영역 정의 — AI 응답의 변경영역/유지영역 키와 1:1로 대응한다 */
  const AREA_META = {
    'work':            { no: '1.', name: '작업 폴더',      where: '내 컴퓨터' },
    'staging':         { no: '2.', name: '스테이징 영역',   where: '내 컴퓨터' },
    'local':           { no: '3.', name: '내 작업본',        where: '내 컴퓨터' },
    'origin-tracking': { no: '4.', name: 'origin/main 메모', where: '내 컴퓨터 (기록)' },
    'remote':          { no: '5.', name: '공유 폴더',        where: 'GitHub' }
  };
  const AREA_ORDER = ['work', 'staging', 'local', 'origin-tracking', 'remote'];

  /* 명령어 → 강조할 화살표와 영역 */
  const FLOWS = {
    'add': {
      arrows: ['arrow-add'], areas: ['area-work', 'area-staging'],
      desc: 'git add — 작업 폴더에서 고른 파일을 스테이징에 올립니다. 커밋 기록은 아직 만들어지지 않습니다.'
    },
    'commit': {
      arrows: ['arrow-commit'], areas: ['area-staging', 'area-local'],
      desc: 'git commit — 고른 것만 지금 있는 작업본에 버전으로 남습니다. GitHub에는 아무것도 가지 않습니다.'
    },
    'push': {
      arrows: ['arrow-push'], areas: ['area-local', 'area-remote', 'area-origin'],
      desc: 'git push — 지금 작업본에 남긴 버전을 공유 폴더로 보냅니다. 성공하면 origin/main 메모도 함께 최신이 됩니다.'
    },
    'fetch': {
      arrows: ['arrow-fetch'], areas: ['area-remote', 'area-origin'],
      desc: 'git fetch — 공유 폴더의 새 버전을 실제로 받아와 origin/main 메모를 갱신합니다. 내 작업본과 책상은 그대로입니다.'
    },
    'merge': {
      arrows: ['arrow-merge'], areas: ['area-origin', 'area-local', 'area-work'],
      desc: 'git merge origin/main — origin/main 메모에 받아둔 내용을 지금 있는 작업본과 책상에 합칩니다.'
    },
    'pull': {
      arrows: ['arrow-fetch', 'arrow-merge'], areas: ['area-remote', 'area-origin', 'area-local', 'area-work'],
      desc: 'git pull — fetch와 merge를 연달아 합니다. 화살표 두 개가 함께 강조되는 것이 그 이유입니다.'
    },
    'restore': {
      arrows: ['arrow-restore-work'], areas: ['area-staging', 'area-work'],
      desc: 'git restore <파일> — 기본 소스는 HEAD가 아니라 스테이징(index)입니다. 스테이징의 내용으로 작업 폴더를 덮어씁니다.'
    },
    'restore-staged': {
      arrows: ['arrow-restore-staged'], areas: ['area-local', 'area-staging'],
      desc: 'git restore --staged <파일> — 스테이징에서만 내립니다. 작업 폴더의 수정 내용은 그대로 남습니다.'
    },
    'restore-head': {
      arrows: ['arrow-restore-staged', 'arrow-restore-work'], areas: ['area-local', 'area-staging', 'area-work'],
      desc: 'git restore --source=HEAD -- <파일> — 마지막 커밋 상태로 작업 폴더를 되돌립니다. 커밋하지 않은 수정은 사라집니다.'
    },
    'switch': {
      arrows: ['arrow-switch'], areas: ['area-local', 'area-branch', 'area-staging', 'area-work'],
      desc: 'git switch <브랜치> — HEAD 표시를 다른 작업본으로 옮깁니다. 그 작업본의 마지막 버전에 맞춰 책상과 고르는 자리도 다시 채워집니다.'
    },
    'none': { arrows: [], areas: [], desc: '' }
  };

  const svg = document.getElementById('areaDiagram');
  const descEl = document.getElementById('flowDesc');
  const DEFAULT_DESC = descEl ? descEl.textContent : '';

  function clearHighlight() {
    if (!svg) return;
    svg.classList.remove('is-focused');
    svg.querySelectorAll('.is-on, .is-changed').forEach(function (el) {
      el.classList.remove('is-on', 'is-changed');
    });
  }

  /**
   * V1 다이어그램에서 특정 명령의 영향 범위를 강조한다 (V3).
   * @param {string} flowId FLOWS의 키
   */
  function highlightFlow(flowId) {
    if (!svg) return;
    clearHighlight();
    const flow = FLOWS[flowId];
    if (!flow || flowId === 'none') {
      if (descEl) descEl.textContent = DEFAULT_DESC;
      return;
    }
    svg.classList.add('is-focused');
    flow.arrows.concat(flow.areas).forEach(function (id) {
      const el = svg.querySelector('#' + id);
      if (el) el.classList.add('is-on');
    });
    if (descEl) descEl.textContent = flow.desc;
  }

  /**
   * 결과 화면용 5영역 요약. 어느 영역이 바뀌고 어느 영역이 그대로인지 함께 보여준다.
   * @param {string[]} changed 변경영역 키 배열
   * @param {string[]} kept    유지영역 키 배열
   * @returns {string} HTML
   */
  function renderMiniAreas(changed, kept) {
    changed = Array.isArray(changed) ? changed : [];
    kept = Array.isArray(kept) ? kept : [];

    const rows = AREA_ORDER.map(function (key) {
      const meta = AREA_META[key];
      const state = changed.indexOf(key) !== -1 ? 'changed'
                : kept.indexOf(key) !== -1 ? 'kept' : 'none';
      const mark = state === 'changed' ? '▲' : state === 'kept' ? '=' : '·';
      const note = state === 'changed' ? '이 명령으로 바뀝니다'
               : state === 'kept' ? '그대로 유지됩니다' : '해당 없음';
      return '<li class="mini-area is-' + state + '">' +
        '<span class="mini-area__mark" aria-hidden="true">' + mark + '</span>' +
        '<span class="mini-area__name">' + meta.no + ' ' + esc(meta.name) + '</span>' +
        '<span class="mini-area__note">' + esc(note) + ' · ' + esc(meta.where) + '</span>' +
        '</li>';
    }).join('');

    return '<ul class="mini-areas">' + rows + '</ul>' +
      '<p class="mini-areas__legend">▲ 바뀜 · = 유지(테두리 점선) · · 해당 없음 — 색 없이도 구분됩니다.</p>';
  }

  /** 영역 키 배열을 사람이 읽는 이름 칩으로 */
  function renderAreaChips(changed, kept) {
    let out = '';
    (changed || []).forEach(function (key) {
      if (!AREA_META[key]) return;
      out += '<span class="chip chip--change">' + esc(AREA_META[key].name) + ' 변경</span>';
    });
    (kept || []).forEach(function (key) {
      if (!AREA_META[key]) return;
      out += '<span class="chip chip--keep">' + esc(AREA_META[key].name) + ' 유지</span>';
    });
    if (!out) out = '<span class="chip chip--keep">아무것도 바꾸지 않음</span>';
    return out;
  }

  /* ------------------------- 이벤트 연결 ------------------------- */

  // 개념 섹션의 명령어 버튼
  document.querySelectorAll('.flow-buttons .pill').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const flowId = btn.dataset.flow;
      const isActive = btn.classList.contains('is-active');
      document.querySelectorAll('.flow-buttons .pill').forEach(function (b) { b.classList.remove('is-active'); });
      document.querySelectorAll('.cmd').forEach(function (c) { c.classList.remove('is-active'); });

      if (isActive || flowId === 'none') {
        highlightFlow('none');
      } else {
        btn.classList.add('is-active');
        highlightFlow(flowId);
      }
    });
  });

  /* 명령어 사전 카드 → 위쪽 다이어그램 강조 (V3)

     예전에는 카드 자체에 role="button" + tabindex 를 붙였는데 두 가지가 잘못이었다.
       1) 카드 안에 이미 <button>(복사)이 들어 있어 버튼 안에 버튼이 중첩됐다. ARIA 위반이다.
       2) role="button" 의 접근가능한 이름이 카드 본문 전체(90자 넘는 문장)가 되어
          스크린리더가 버튼 하나를 읽는 데 문단 하나를 통째로 읽었다.
     그래서 카드는 평범한 컨테이너로 되돌리고, 전용 버튼을 하나 넣는다.
     마우스 사용자의 "카드 아무 데나 클릭"은 보조 수단으로 남긴다. */
  document.querySelectorAll('.cmd').forEach(function (card) {
    const flowId = card.dataset.flow || 'none';

    const activate = function () {
      const wasActive = card.classList.contains('is-active');
      document.querySelectorAll('.cmd').forEach(function (c) { c.classList.remove('is-active'); });
      document.querySelectorAll('.flow-buttons .pill').forEach(function (b) { b.classList.remove('is-active'); });

      if (wasActive) { highlightFlow('none'); return; }
      card.classList.add('is-active');
      highlightFlow(flowId);
      const target = document.getElementById('home');   // 섹션 개편으로 #basics -> #home
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // 강조할 영역이 없는 명령(git status, git worktree)은 버튼을 만들지 않는다
    if (flowId === 'none') return;

    const title = card.querySelector('h3');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cmd__focus';
    btn.textContent = '영향 영역 보기';
    btn.setAttribute('aria-label',
      (title ? title.textContent.trim() + ' — ' : '') + '영향 영역을 5영역 다이어그램에서 보기');
    btn.addEventListener('click', activate);
    card.appendChild(btn);

    // 마우스 편의용. 카드 안의 버튼·링크 클릭은 그대로 통과시킨다.
    card.addEventListener('click', function (e) {
      if (e.target.closest('button, a')) return;
      activate();
    });
  });

  window.CRAreas = {
    highlightFlow: highlightFlow,
    renderMiniAreas: renderMiniAreas,
    renderAreaChips: renderAreaChips,
    AREA_META: AREA_META,
    AREA_ORDER: AREA_ORDER
  };
})();
