/* ==========================================================================
   presets.js — 정적 카드 8종 (기획서 2.4절)

   흔한 상황은 AI를 호출하지 않고 여기서 즉시 답한다.
   각 항목은 AI 응답과 **완전히 같은 JSON 구조**를 쓴다. 렌더링 코드를 그대로 재사용하기 위해서다.
   (제목/부제만 카드 표시용으로 추가된 필드다.)

   각 카드는 실제 저장소에서 명령을 실행해 결과를 확인한 뒤 확정했다.
   ========================================================================== */

window.PRESETS = [

  /* ------------------------------------------------------------------ 1 */
  {
    id: 'amend-add-file',
    제목: '커밋했는데 파일을 빼먹었다',
    부제: '커밋을 하나 더 만들지 않고 직전 커밋에 합치기',
    관련없음: false,
    상황요약: '마지막 커밋에 포함되어야 할 파일이 빠진 상태로 보입니다.',
    근거구분: {
      확인됨: ['커밋을 이미 실행했다', '그 커밋에 파일 하나가 빠졌다'],
      추정: ['아직 push하지 않았을 것으로 보인다'],
      추가확인: ['git status 결과', '이미 push했는지 여부']
    },
    위험도: '주의',
    오류위치: 'local',
    명령어: [
      {
        cmd: 'git status',
        설명: '어떤 파일이 어느 영역에 있는지 먼저 확인합니다. 빠뜨린 파일이 정말 커밋되지 않았는지 여기서 보입니다.',
        변경영역: [],
        유지영역: ['work', 'staging', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git add 빠뜨린파일.txt',
        설명: '빠뜨린 파일을 스테이징에 올립니다. 아직 커밋 기록은 바뀌지 않습니다.',
        변경영역: ['staging'],
        유지영역: ['work', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git commit --amend --no-edit',
        설명: '새 커밋을 만들지 않고 직전 커밋에 합칩니다. --no-edit은 메시지를 그대로 두겠다는 뜻입니다.',
        변경영역: ['local'],
        유지영역: ['work', 'staging', 'origin-tracking', 'remote']
      }
    ],
    주의사항: [
      'amend는 커밋을 고치는 것이 아니라 새 커밋으로 갈아끼우는 것입니다. 커밋 해시가 바뀝니다.',
      '이미 push한 커밋이라면 amend 후 강제 푸시가 필요합니다. 혼자 쓰는 저장소가 아니라면 revert를 쓰세요.'
    ],
    그래프템플릿: 'amend-add-file'
  },

  /* ------------------------------------------------------------------ 2 */
  {
    id: 'amend-message',
    제목: '커밋 메시지를 잘못 썼다',
    부제: '직전 커밋의 메시지만 고치기',
    관련없음: false,
    상황요약: '직전 커밋의 메시지만 바꾸고 싶은 상태로 보입니다.',
    근거구분: {
      확인됨: ['커밋을 이미 실행했다', '메시지 내용이 잘못됐다고 인지하고 있다'],
      추정: ['고치려는 대상이 가장 최근 커밋 하나일 것으로 보인다'],
      추가확인: ['이미 push했는지 여부', '고치려는 커밋이 정말 마지막 커밋인지 (git log --oneline -3)']
    },
    위험도: '주의',
    오류위치: 'local',
    명령어: [
      {
        cmd: 'git status',
        설명: '현재 상태를 먼저 확인합니다. 스테이징에 다른 변경이 남아 있으면 amend에 함께 딸려 들어갑니다.',
        변경영역: [],
        유지영역: ['work', 'staging', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git log --oneline -3',
        설명: '고치려는 커밋이 정말 가장 최근 커밋인지 눈으로 확인합니다.',
        변경영역: [],
        유지영역: ['work', 'staging', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git commit --amend -m "제대로 된 메시지"',
        설명: '직전 커밋의 메시지를 새 메시지로 바꿉니다. 파일 내용은 그대로입니다.',
        변경영역: ['local'],
        유지영역: ['work', 'staging', 'origin-tracking', 'remote']
      }
    ],
    주의사항: [
      '내용은 같아도 커밋은 새로 만들어지므로 해시가 바뀝니다.',
      '이미 push한 커밋이라면 원격과 어긋납니다. 협업 중이라면 그냥 두는 편이 안전합니다.'
    ],
    그래프템플릿: 'amend-message'
  },

  /* ------------------------------------------------------------------ 3 */
  {
    id: 'restore-staged',
    제목: 'add를 취소하고 싶다',
    부제: '스테이징에서만 내리고 수정 내용은 지키기',
    관련없음: false,
    상황요약: 'git add로 스테이징에 올린 파일을 다시 내리고 싶은 상태로 보입니다.',
    근거구분: {
      확인됨: ['git add를 실행했다', '아직 커밋하지는 않았다'],
      추정: ['파일의 수정 내용 자체는 유지하고 싶을 것으로 보인다'],
      추가확인: ['git status 결과 (Changes to be committed 목록)']
    },
    위험도: '안전',
    오류위치: 'local',
    명령어: [
      {
        cmd: 'git status',
        설명: '"Changes to be committed" 아래 있는 것이 스테이징에 올라간 파일입니다.',
        변경영역: [],
        유지영역: ['work', 'staging', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git restore --staged 파일이름.txt',
        설명: '스테이징에서만 내립니다. 작업 폴더에서 고친 내용은 그대로 남아 있습니다.',
        변경영역: ['staging'],
        유지영역: ['work', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git status',
        설명: '해당 파일이 "Changes not staged for commit"으로 내려왔는지 확인합니다.',
        변경영역: [],
        유지영역: ['work', 'staging', 'local', 'origin-tracking', 'remote']
      }
    ],
    주의사항: [
      '검색하면 나오는 git reset HEAD <파일>과 같은 일을 합니다. restore 쪽이 목적이 분명해 덜 헷갈립니다.',
      '이 명령은 수정 내용을 지우지 않습니다. 수정 자체를 버리려면 다른 카드를 보세요.'
    ],
    그래프템플릿: 'restore-staged'
  },

  /* ------------------------------------------------------------------ 4 */
  {
    id: 'restore-worktree',
    제목: '파일 수정을 되돌리고 싶다',
    부제: '마지막 커밋 상태로 파일 내용 돌리기',
    관련없음: false,
    상황요약: '작업 폴더에서 고친 내용을 버리고 마지막 커밋 상태로 돌아가고 싶은 상태로 보입니다.',
    근거구분: {
      확인됨: ['파일을 수정했다', '그 수정을 버리고 싶어한다'],
      추정: ['되돌리려는 기준이 마지막 커밋(HEAD)일 것으로 보인다'],
      추가확인: ['해당 파일을 git add까지 했는지 여부', 'git diff로 무엇이 사라지는지 확인']
    },
    위험도: '주의',
    오류위치: 'local',
    명령어: [
      {
        cmd: 'git status',
        설명: '되돌리려는 파일이 스테이징까지 올라가 있는지 확인합니다. 이 차이가 결과를 바꿉니다.',
        변경영역: [],
        유지영역: ['work', 'staging', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git diff 파일이름.txt',
        설명: '지금 사라지게 될 내용을 눈으로 먼저 봅니다. 이 명령으로 되돌린 수정은 Git이 복구해주지 못합니다.',
        변경영역: [],
        유지영역: ['work', 'staging', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git restore --source=HEAD -- 파일이름.txt',
        설명: '마지막 커밋 상태로 작업 폴더의 파일을 되돌립니다. --source=HEAD를 붙이는 것이 핵심입니다.',
        변경영역: ['work'],
        유지영역: ['staging', 'local', 'origin-tracking', 'remote']
      }
    ],
    주의사항: [
      'git restore <파일>의 기본 소스는 HEAD가 아니라 스테이징(index)입니다. git add를 이미 했다면 아무 일도 일어나지 않은 것처럼 보입니다.',
      '마지막 커밋 상태로 되돌리려면 반드시 --source=HEAD를 붙이세요.',
      '커밋한 적 없는 수정은 git reflog로도 복구되지 않습니다. 아깝다면 먼저 git stash push -u 로 대피시키세요.'
    ],
    그래프템플릿: 'restore-worktree'
  },

  /* ------------------------------------------------------------------ 5 */
  {
    id: 'revert-pushed',
    제목: '이미 push한 커밋을 되돌리고 싶다',
    부제: '기록을 지우지 않고 안전하게 취소하기',
    관련없음: false,
    상황요약: '이미 GitHub에 올라간 커밋의 내용을 취소하고 싶은 상태로 보입니다.',
    근거구분: {
      확인됨: ['되돌리려는 커밋이 이미 원격에 올라가 있다'],
      추정: ['동료가 이미 그 커밋을 받아갔을 수 있다'],
      추가확인: ['되돌릴 커밋의 해시 (git log --oneline -5)', '해당 커밋 이후에 쌓인 커밋이 있는지']
    },
    위험도: '안전',
    오류위치: '저장소관계',
    명령어: [
      {
        cmd: 'git status',
        설명: '먼저 작업 폴더가 정리된 상태인지 확인합니다. 커밋하지 않은 변경이 남아 있으면 revert가 멈출 수 있습니다.',
        변경영역: [],
        유지영역: ['work', 'staging', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git log --oneline -5',
        설명: '되돌릴 커밋의 해시(앞 7자리)를 확인합니다.',
        변경영역: [],
        유지영역: ['work', 'staging', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git revert 7c8d9e0',
        설명: '그 커밋과 반대되는 내용의 새 커밋을 만듭니다. 기존 기록은 지워지지 않습니다.',
        변경영역: ['local', 'work'],
        유지영역: ['origin-tracking', 'remote']
      },
      {
        cmd: 'git push',
        설명: '새로 만들어진 revert 커밋을 GitHub에 올립니다. 강제 푸시가 필요 없습니다.',
        변경영역: ['remote', 'origin-tracking'],
        유지영역: ['work', 'staging', 'local']
      }
    ],
    주의사항: [
      '이미 원격에 올라간 것은 reset이 아니라 revert로 처리합니다. reset은 동료의 기록과 어긋나게 만듭니다.',
      'revert 도중 충돌이 나면 파일을 수정한 뒤 git add, git revert --continue 순으로 진행합니다.'
    ],
    그래프템플릿: 'revert-pushed'
  },

  /* ------------------------------------------------------------------ 6 */
  {
    id: 'non-fast-forward',
    제목: 'push가 거절됐다',
    부제: 'non-fast-forward / rejected 에러',
    관련없음: false,
    상황요약: '원격에 내가 아직 받지 않은 커밋이 있어서 push가 거절된 상태로 보입니다.',
    근거구분: {
      확인됨: ['push를 시도했고 거절됐다'],
      추정: ['동료가 먼저 push했거나, GitHub 웹에서 파일을 수정했을 것으로 보인다'],
      추가확인: ['에러 메시지 전문', 'git fetch 후 git log --oneline main..origin/main 결과']
    },
    위험도: '주의',
    오류위치: '저장소관계',
    명령어: [
      {
        cmd: 'git status',
        설명: '작업 폴더가 정리된 상태인지 먼저 확인합니다. 합치기 전에 정리해두는 편이 안전합니다.',
        변경영역: [],
        유지영역: ['work', 'staging', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git fetch',
        설명: '원격의 커밋을 실제로 받아와 origin/main을 갱신합니다. 로컬 main과 작업 폴더는 아직 그대로입니다.',
        변경영역: ['origin-tracking'],
        유지영역: ['work', 'staging', 'local', 'remote']
      },
      {
        cmd: 'git log --oneline main..origin/main',
        설명: '원격에는 있고 내게 없는 커밋을 봅니다. 방금 fetch했으므로 이 비교는 최신입니다.',
        변경영역: [],
        유지영역: ['work', 'staging', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git merge origin/main',
        설명: '받아둔 origin/main을 로컬 main에 합칩니다. 충돌이 나면 파일을 고친 뒤 git add, git commit 순으로 마무리합니다.',
        변경영역: ['local', 'work'],
        유지영역: ['origin-tracking', 'remote']
      },
      {
        cmd: 'git push',
        설명: '합쳐진 상태를 올립니다. 이제 원격이 앞서 있지 않으므로 거절되지 않습니다.',
        변경영역: ['remote', 'origin-tracking'],
        유지영역: ['work', 'staging', 'local']
      }
    ],
    주의사항: [
      'git push --force 로 밀어버리면 원격에 있던 동료의 커밋이 사라집니다. 이 에러에서 --force는 답이 아닙니다.',
      '커밋 하나짜리 작업이라면 git pull --rebase 로 기록을 더 깔끔하게 만들 수도 있습니다.'
    ],
    그래프템플릿: 'non-fast-forward'
  },

  /* ------------------------------------------------------------------ 7 */
  {
    id: 'remove-secret',
    제목: '.env 같은 파일을 올려버렸다',
    부제: '키가 이미 GitHub에 올라간 상황',
    관련없음: false,
    상황요약: '비밀 값이 든 파일이 커밋되어 원격에 올라갔을 가능성이 있는 상태로 보입니다.',
    근거구분: {
      확인됨: ['비밀 값이 든 파일이 커밋에 포함됐다'],
      추정: ['이미 push까지 됐을 것으로 보인다', '저장소가 공개 상태일 수 있다'],
      추가확인: ['정말 push까지 됐는지 (git log --oneline origin/main..main)', '저장소 공개 여부', '해당 키가 어디에서 발급된 것인지']
    },
    위험도: '위험',
    오류위치: 'github정책',
    명령어: [
      {
        cmd: '# 1) 먼저 발급처에서 그 키를 폐기하고 새로 발급받으세요',
        설명: '순서가 중요합니다. 커밋 이력을 정리하는 동안에도 유출된 키는 계속 유효합니다. 폐기가 먼저입니다.',
        변경영역: [],
        유지영역: ['work', 'staging', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git status',
        설명: '지금 그 파일이 어느 영역에 있는지 확인합니다.',
        변경영역: [],
        유지영역: ['work', 'staging', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'echo ".env" >> .gitignore',
        설명: '앞으로 다시 올라가지 않도록 무시 목록에 넣습니다.',
        변경영역: ['work'],
        유지영역: ['staging', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git rm --cached .env',
        설명: 'Git의 추적 대상에서만 뺍니다. --cached 덕분에 내 컴퓨터의 .env 파일 자체는 지워지지 않습니다.',
        변경영역: ['staging'],
        유지영역: ['work', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git commit -m "chore: .env 추적 제외"',
        설명: '추적 제외 상태를 커밋합니다.',
        변경영역: ['local'],
        유지영역: ['work', 'staging', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git push',
        설명: '앞으로의 커밋에서는 .env가 빠집니다.',
        변경영역: ['remote', 'origin-tracking'],
        유지영역: ['work', 'staging', 'local']
      }
    ],
    주의사항: [
      '위 명령들은 앞으로의 커밋에서만 파일을 빼줍니다. 이미 push된 과거 커밋 안에는 키가 그대로 남아 있습니다.',
      '과거 이력까지 지우려면 git filter-repo 또는 BFG가 필요하고, 이력을 다시 쓰는 작업이라 협업자 전원이 다시 clone해야 합니다.',
      '공개 저장소였다면 올라간 순간 이미 수집됐다고 가정하는 것이 안전합니다. 그래서 키 폐기가 1번입니다.'
    ],
    그래프템플릿: 'none'
  },

  /* ------------------------------------------------------------------ 8 */
  {
    id: 'wrong-branch',
    제목: '다른 브랜치에서 작업하고 있었다',
    부제: 'main에서 해버린 커밋을 원래 브랜치로 옮기기',
    관련없음: false,
    상황요약: 'feature 브랜치에서 했어야 할 커밋을 main에서 해버린 상태로 보입니다.',
    근거구분: {
      확인됨: ['의도한 브랜치가 아닌 곳에서 커밋했다'],
      추정: ['아직 push하지 않았을 것으로 보인다', '옮길 커밋이 main의 맨 끝 몇 개일 것으로 보인다'],
      추가확인: ['이미 push했는지 여부 (git log --oneline origin/main..main)', '옮길 커밋이 정확히 몇 개인지', '커밋하지 않은 변경이 남아 있는지']
    },
    위험도: '위험',
    오류위치: 'local',
    명령어: [
      {
        cmd: 'git status',
        설명: '지금 어느 브랜치에 있는지, 커밋하지 않은 변경이 남아 있는지 확인합니다.',
        변경영역: [],
        유지영역: ['work', 'staging', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git log --oneline origin/main..main',
        설명: '원격에 없고 내게만 있는 커밋 목록입니다. 여기 보이는 것들이 아직 push되지 않은, 옮길 수 있는 커밋입니다.',
        변경영역: [],
        유지영역: ['work', 'staging', 'local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git switch -c feature/작업이름',
        설명: '지금 위치에서 새 브랜치를 만들고 이동합니다. 방금 한 커밋들이 이 브랜치에 그대로 남습니다. 아무것도 사라지지 않습니다.',
        변경영역: ['local'],
        유지영역: ['work', 'staging', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git switch main',
        설명: 'main으로 돌아옵니다. 아직 main은 잘못된 커밋을 가리키고 있습니다.',
        변경영역: ['work', 'staging'],
        유지영역: ['local', 'origin-tracking', 'remote']
      },
      {
        cmd: 'git reset --hard origin/main',
        설명: 'main을 원격과 같은 자리로 되돌립니다. 커밋들은 방금 만든 feature 브랜치에 남아 있으므로 사라지지 않습니다.',
        변경영역: ['local', 'staging', 'work'],
        유지영역: ['origin-tracking', 'remote']
      }
    ],
    주의사항: [
      '이 순서는 아직 push하지 않은 경우에만 쓸 수 있습니다. 이미 push했다면 revert로 처리하세요.',
      'reset --hard는 커밋하지 않은 작업 폴더 변경과 스테이징 내용을 되돌릴 수 없게 지웁니다. 3번 단계 전에 반드시 확인하세요.',
      '아직 커밋조차 하지 않은 상태에서 브랜치만 잘못 들어온 것이라면 더 간단합니다. git stash push -u -m "이동" → git switch 올바른브랜치 → git stash pop.'
    ],
    그래프템플릿: 'wrong-branch'
  }
];

/* ------------------------------ 카드 렌더링 ------------------------------ */
(function () {
  'use strict';

  var grid = document.getElementById('presetGrid');
  if (!grid) return;

  var esc = window.CRUtil.escapeHtml;
  var RISK_CLASS = { '안전': 'safe', '주의': 'warn', '위험': 'danger' };
  var RISK_ICON = { '안전': '✓', '주의': '!', '위험': '⚠' };

  grid.innerHTML = window.PRESETS.map(function (p, i) {
    return '<button type="button" class="preset" data-index="' + i + '">' +
      '<span class="preset__title">' + esc(p.제목) + '</span>' +
      '<span class="preset__foot">' +
        '<span class="risk risk--' + RISK_CLASS[p.위험도] + '">' +
          '<span aria-hidden="true">' + RISK_ICON[p.위험도] + '</span> ' + esc(p.위험도) +
        '</span>' +
        '<span class="preset__instant">즉시 표시</span>' +
      '</span>' +
      '</button>';
  }).join('');

  grid.addEventListener('click', function (e) {
    var btn = e.target.closest('.preset');
    if (!btn) return;
    var preset = window.PRESETS[Number(btn.dataset.index)];
    if (!preset) return;

    grid.querySelectorAll('.preset').forEach(function (b) { b.classList.remove('is-active'); });
    btn.classList.add('is-active');

    // 네트워크 요청 없이 즉시 렌더링한다 (기획서 테스트 21번)
    window.CRRescue.renderResult(preset, { source: '검수된 정적 카드' });
  });
})();
