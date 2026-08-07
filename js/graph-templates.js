/* ==========================================================================
   graph-templates.js — 검증된 커밋 그래프 데이터 (기획서 3.7 / 4.2절)

   AI는 그래프를 직접 만들지 않는다. 여기 있는 ID 중 하나를 고를 뿐이다.
   렌더링은 graph.js가 이 검수된 데이터로만 수행한다.

   데이터 규약
     commits: [{ id, parent(또는 parents), col, row, note?, hi? }]
       col : 가로 순서 (0부터). x = 40 + col * 110
       row : 0 = 주 브랜치(y 60), 1 = 두 번째 브랜치(y 130)
       hi  : 강조 표시할 커밋
     refs:    [{ name, on: 커밋 id, dashed? }]
       dashed: origin/main 처럼 "원격 추적" 포인터임을 색 외의 수단으로도 구분

   제한 (기획서 4.2절): 커밋 최대 7개, 브랜치 최대 2개, 애니메이션 없음.
   ========================================================================== */

window.GRAPH_TEMPLATES = {

  /* 1. 직전 커밋에 파일을 합침 */
  'amend-add-file': {
    label: '직전 커밋에 파일 합치기',
    caption: 'amend는 커밋을 고치는 것이 아니라 새 커밋으로 갈아끼웁니다. 그래서 해시가 바뀝니다.',
    before: {
      title: '실행 전',
      commits: [
        { id: 'a1b2c3d', col: 0, row: 0 },
        { id: 'e4f5a6b', col: 1, row: 0, parent: 'a1b2c3d', note: '파일 하나 누락', hi: true }
      ],
      refs: [{ name: 'main', on: 'e4f5a6b' }, { name: 'HEAD', on: 'e4f5a6b' }]
    },
    after: {
      title: '실행 후',
      commits: [
        { id: 'a1b2c3d', col: 0, row: 0 },
        { id: '9c8d7e6', col: 1, row: 0, parent: 'a1b2c3d', note: '파일 포함 · 새 해시', hi: true }
      ],
      refs: [{ name: 'main', on: '9c8d7e6' }, { name: 'HEAD', on: '9c8d7e6' }]
    }
  },

  /* 2. 직전 커밋 메시지 수정 */
  'amend-message': {
    label: '직전 커밋 메시지 수정',
    caption: '내용은 그대로지만 커밋은 새로 만들어집니다. 이미 push했다면 강제 푸시가 필요해집니다.',
    before: {
      title: '실행 전',
      commits: [
        { id: 'a1b2c3d', col: 0, row: 0 },
        { id: 'e4f5a6b', col: 1, row: 0, parent: 'a1b2c3d', note: '"기능추가함ㅁ"', hi: true }
      ],
      refs: [{ name: 'main', on: 'e4f5a6b' }]
    },
    after: {
      title: '실행 후',
      commits: [
        { id: 'a1b2c3d', col: 0, row: 0 },
        { id: '2f3a4b5', col: 1, row: 0, parent: 'a1b2c3d', note: '"로그인 기능 추가"', hi: true }
      ],
      refs: [{ name: 'main', on: '2f3a4b5' }]
    }
  },

  /* 3. 스테이징만 되돌림 */
  'restore-staged': {
    label: 'add 취소 (스테이징만 되돌림)',
    caption: '커밋 그래프는 전혀 변하지 않습니다. 바뀌는 것은 스테이징 영역뿐이고, 작업 폴더의 수정 내용도 그대로 남습니다.',
    before: {
      title: '실행 전 · 실행 후 (동일)',
      commits: [
        { id: 'a1b2c3d', col: 0, row: 0 },
        { id: 'e4f5a6b', col: 1, row: 0, parent: 'a1b2c3d' }
      ],
      refs: [{ name: 'main', on: 'e4f5a6b' }]
    },
    after: null
  },

  /* 4. 작업 파일만 되돌림 */
  'restore-worktree': {
    label: '파일 수정 되돌리기',
    caption: '커밋 기록은 그대로입니다. 바뀌는 것은 작업 폴더의 파일 내용뿐이며, 이 변경은 되돌릴 수 없습니다.',
    before: {
      title: '실행 전 · 실행 후 (동일)',
      commits: [
        { id: 'a1b2c3d', col: 0, row: 0 },
        { id: 'e4f5a6b', col: 1, row: 0, parent: 'a1b2c3d' }
      ],
      refs: [{ name: 'main', on: 'e4f5a6b' }]
    },
    after: null
  },

  /* 5. 되돌리는 새 커밋을 추가 */
  'revert-pushed': {
    label: '이미 올린 커밋 되돌리기',
    caption: '기록을 지우지 않고 반대 내용의 커밋을 하나 더 쌓습니다. 그래서 동료의 기록과 어긋나지 않습니다.',
    before: {
      title: '실행 전',
      commits: [
        { id: 'a1b2c3d', col: 0, row: 0 },
        { id: 'e4f5a6b', col: 1, row: 0, parent: 'a1b2c3d' },
        { id: '7c8d9e0', col: 2, row: 0, parent: 'e4f5a6b', note: '되돌리고 싶은 커밋', hi: true }
      ],
      refs: [{ name: 'main', on: '7c8d9e0' }, { name: 'origin/main', on: '7c8d9e0', dashed: true }]
    },
    after: {
      title: '실행 후',
      commits: [
        { id: 'a1b2c3d', col: 0, row: 0 },
        { id: 'e4f5a6b', col: 1, row: 0, parent: 'a1b2c3d' },
        { id: '7c8d9e0', col: 2, row: 0, parent: 'e4f5a6b', note: '그대로 남음' },
        { id: 'b5c6d7e', col: 3, row: 0, parent: '7c8d9e0', note: 'Revert 커밋', hi: true }
      ],
      refs: [{ name: 'main', on: 'b5c6d7e' }, { name: 'origin/main', on: '7c8d9e0', dashed: true }]
    }
  },

  /* 6. 커밋 취소, 변경은 유지 */
  'reset-soft': {
    label: '커밋만 취소 (변경 내용은 유지)',
    caption: 'main 포인터가 한 칸 뒤로 갑니다. 커밋 내용은 스테이징 영역에 그대로 남아 있어 다시 커밋할 수 있습니다.',
    before: {
      title: '실행 전',
      commits: [
        { id: 'a1b2c3d', col: 0, row: 0 },
        { id: 'e4f5a6b', col: 1, row: 0, parent: 'a1b2c3d' },
        { id: '7c8d9e0', col: 2, row: 0, parent: 'e4f5a6b', note: '취소할 커밋', hi: true }
      ],
      refs: [{ name: 'main', on: '7c8d9e0' }]
    },
    after: {
      title: '실행 후',
      commits: [
        { id: 'a1b2c3d', col: 0, row: 0 },
        { id: 'e4f5a6b', col: 1, row: 0, parent: 'a1b2c3d', hi: true },
        { id: '7c8d9e0', col: 2, row: 0, parent: 'e4f5a6b', note: '가리키는 이름이 없어짐' }
      ],
      refs: [{ name: 'main', on: 'e4f5a6b' }]
    }
  },

  /* 7. 원격이 앞서 push가 거절됨 */
  'non-fast-forward': {
    label: 'push 거절 (non-fast-forward)',
    caption: '원격에 내가 모르는 커밋이 있어서 거절됐습니다. 먼저 가져와 합친 뒤 다시 push합니다.',
    before: {
      title: '실행 전 · push가 거절된 상태',
      commits: [
        { id: 'a1b2c3d', col: 0, row: 0 },
        { id: 'e4f5a6b', col: 1, row: 0, parent: 'a1b2c3d' },
        { id: '3f4a5b6', col: 2, row: 0, parent: 'e4f5a6b', note: '내 커밋', hi: true },
        { id: 'd9e8f7a', col: 2, row: 1, parent: 'e4f5a6b', note: '동료가 올린 커밋' }
      ],
      refs: [
        { name: 'main', on: '3f4a5b6' },
        { name: 'origin/main', on: 'd9e8f7a', dashed: true }
      ]
    },
    after: {
      title: 'fetch + merge 후',
      commits: [
        { id: 'a1b2c3d', col: 0, row: 0 },
        { id: 'e4f5a6b', col: 1, row: 0, parent: 'a1b2c3d' },
        { id: '3f4a5b6', col: 2, row: 0, parent: 'e4f5a6b', note: '내 커밋' },
        { id: 'd9e8f7a', col: 2, row: 1, parent: 'e4f5a6b', note: '동료 커밋' },
        { id: 'c1d2e3f', col: 3, row: 0, parents: ['3f4a5b6', 'd9e8f7a'], note: '병합 커밋', hi: true }
      ],
      refs: [
        { name: 'main', on: 'c1d2e3f' },
        { name: 'origin/main', on: 'd9e8f7a', dashed: true }
      ]
    }
  },

  /* 8. origin/main만 이동, 로컬 main은 유지 */
  'fetch-updates-origin': {
    label: 'fetch — origin/main만 갱신',
    caption: 'fetch는 커밋을 실제로 받아옵니다. 다만 움직이는 것은 origin/main뿐이고, 로컬 main과 작업 폴더는 그대로입니다.',
    before: {
      title: 'fetch 전',
      commits: [
        { id: 'a1b2c3d', col: 0, row: 0 },
        { id: 'e4f5a6b', col: 1, row: 0, parent: 'a1b2c3d' }
      ],
      refs: [
        { name: 'main', on: 'e4f5a6b' },
        { name: 'origin/main', on: 'e4f5a6b', dashed: true }
      ]
    },
    after: {
      title: 'fetch 후',
      commits: [
        { id: 'a1b2c3d', col: 0, row: 0 },
        { id: 'e4f5a6b', col: 1, row: 0, parent: 'a1b2c3d', note: '내 작업은 여기 그대로' },
        { id: '8a9b0c1', col: 2, row: 0, parent: 'e4f5a6b', note: '받아온 커밋', hi: true }
      ],
      refs: [
        { name: 'main', on: 'e4f5a6b' },
        { name: 'origin/main', on: '8a9b0c1', dashed: true }
      ]
    }
  },

  /* 9. 다른 브랜치에서 작업한 커밋 이동 */
  'wrong-branch': {
    label: '다른 브랜치에서 한 커밋 옮기기',
    caption: '커밋을 복사하는 것이 아니라, 그 커밋을 가리키는 이름표를 새로 붙이고 main을 원래 자리로 되돌립니다.',
    before: {
      title: '실행 전 · main에서 작업해버린 상태',
      commits: [
        { id: 'a1b2c3d', col: 0, row: 0 },
        { id: 'e4f5a6b', col: 1, row: 0, parent: 'a1b2c3d' },
        { id: '5d6e7f8', col: 2, row: 0, parent: 'e4f5a6b', note: 'feature에 있어야 할 커밋', hi: true }
      ],
      refs: [
        { name: 'main', on: '5d6e7f8' },
        { name: 'origin/main', on: 'e4f5a6b', dashed: true }
      ]
    },
    after: {
      title: '실행 후',
      commits: [
        { id: 'a1b2c3d', col: 0, row: 0 },
        { id: 'e4f5a6b', col: 1, row: 0, parent: 'a1b2c3d' },
        { id: '5d6e7f8', col: 2, row: 1, parent: 'e4f5a6b', note: 'feature 브랜치로', hi: true }
      ],
      refs: [
        { name: 'main', on: 'e4f5a6b' },
        { name: 'origin/main', on: 'e4f5a6b', dashed: true },
        { name: 'feature', on: '5d6e7f8' }
      ]
    }
  }
};

/* 서버와 프론트가 같은 목록을 본다. 목록에 없으면 none으로 처리한다. */
window.GRAPH_TEMPLATE_IDS = Object.keys(window.GRAPH_TEMPLATES).concat(['none']);
