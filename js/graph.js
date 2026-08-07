/* ==========================================================================
   graph.js — V2 커밋 그래프 렌더러 (기획서 4.2절)

   그리는 요소는 네 가지뿐이다: 커밋 원 / 부모 연결선 / 브랜치·HEAD 라벨 / 강조 색상.
   좌표 규칙
     반지름  r   = 13
     원 간격 gap = 110
     시작 x  x0  = 40
     중심 y  y   = 60  (두 번째 브랜치는 y = 130)
     i번째 원의 x = x0 + col * gap
     라벨 알약   원 중심 위 y - 34, 폭 = 글자수 * 8 + 20
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------- 공용 유틸 ------------------------------- */
  var util = {
    escapeHtml: function (value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },
    toast: function (message) {
      var el = document.getElementById('toast');
      if (!el) return;
      el.textContent = message;
      el.hidden = false;
      clearTimeout(el._timer);
      el._timer = setTimeout(function () { el.hidden = true; }, 2000);
    },
    copyText: function (text) {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      }
      // 구형 브라우저 / http 환경 대비
      return new Promise(function (resolve, reject) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy') ? resolve() : reject(new Error('copy failed'));
        } catch (e) {
          reject(e);
        } finally {
          document.body.removeChild(ta);
        }
      });
    }
  };
  window.CRUtil = util;

  /* ------------------------------- 렌더링 ------------------------------- */
  var R = 13, GAP = 110, X0 = 40, Y0 = 60, ROW_GAP = 70;

  function cx(commit) { return X0 + commit.col * GAP; }
  function cy(commit) { return Y0 + (commit.row || 0) * ROW_GAP; }

  /**
   * 한 단계(before 또는 after)를 SVG 문자열로 만든다.
   * @param {Object} stage { title, commits, refs }
   * @returns {string} SVG 마크업
   */
  function buildStageSvg(stage) {
    var commits = stage.commits || [];
    if (!commits.length) return '';

    var byId = {};
    commits.forEach(function (c) { byId[c.id] = c; });

    var refsByCommit = {};
    (stage.refs || []).forEach(function (ref) {
      (refsByCommit[ref.on] = refsByCommit[ref.on] || []).push(ref);
    });

    var parts = [];
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    function track(x, y) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    /* 1) 부모 연결선 — 원 뒤에 깔리도록 먼저 그린다 */
    commits.forEach(function (c) {
      var parents = c.parents || (c.parent ? [c.parent] : []);
      parents.forEach(function (pid) {
        var p = byId[pid];
        if (!p) return;
        var px = cx(p), py = cy(p), qx = cx(c), qy = cy(c);
        var d;
        if (py === qy) {
          d = 'M' + (px + R) + ',' + py + ' L' + (qx - R) + ',' + qy;
        } else {
          // 브랜치가 갈리거나 합쳐지는 구간은 곡선 하나로 잇는다
          d = 'M' + (px + R) + ',' + py + ' Q' + (qx - 40) + ',' + py + ' ' + (qx - R) + ',' + qy;
        }
        parts.push('<path class="cg-link" d="' + d + '"></path>');
        track(px, py); track(qx, qy);
      });
    });

    /* 2) 커밋 원 + 해시 + 메모 + 라벨 알약 */
    commits.forEach(function (c) {
      var x = cx(c), y = cy(c), isRow1 = (c.row || 0) === 1;
      track(x - R, y - R); track(x + R, y + R);

      parts.push(
        '<circle class="cg-node' + (c.hi ? ' is-hi' : '') + '" cx="' + x + '" cy="' + y + '" r="' + R + '"></circle>'
      );
      parts.push(
        '<text class="cg-id" x="' + x + '" y="' + (y + 4) + '" text-anchor="middle"' +
        (c.hi ? ' fill="#fff"' : '') + '>' + util.escapeHtml(c.id.slice(0, 3)) + '</text>'
      );

      var refs = refsByCommit[c.id] || [];
      refs.forEach(function (ref, i) {
        // row 0 은 위로, row 1 은 아래로 쌓는다 (두 줄이 서로 겹치지 않게)
        var centerY = isRow1 ? (y + 34 + i * 24) : (y - 34 - i * 24);
        var w = ref.name.length * 8 + 20;
        var boxX = x - w / 2, boxY = centerY - 10;
        parts.push(
          '<rect class="cg-ref-box' + (ref.dashed ? ' is-dashed' : '') + '" x="' + boxX + '" y="' + boxY +
          '" width="' + w + '" height="20" rx="10"></rect>'
        );
        parts.push(
          '<text class="cg-ref-text" x="' + x + '" y="' + (centerY + 4) + '" text-anchor="middle">' +
          util.escapeHtml(ref.name) + '</text>'
        );
        track(boxX, boxY); track(boxX + w, boxY + 20);
      });

      if (c.note) {
        var noteY = isRow1
          ? y + 34 + (refs.length ? refs.length * 24 + 4 : 0)
          : y + 34;
        parts.push(
          '<text class="cg-note" x="' + x + '" y="' + noteY + '" text-anchor="middle">' +
          util.escapeHtml(c.note) + '</text>'
        );
        var noteHalf = Math.max(40, c.note.length * 6);
        track(x - noteHalf, noteY - 11); track(x + noteHalf, noteY + 4);
      }
    });

    var pad = 8;
    var vbX = Math.floor(minX - pad);
    var vbY = Math.floor(minY - pad);
    var vbW = Math.ceil(maxX - minX + pad * 2);
    var vbH = Math.ceil(maxY - minY + pad * 2);

    return '<svg class="commit-graph" viewBox="' + vbX + ' ' + vbY + ' ' + vbW + ' ' + vbH + '" ' +
           'width="' + vbW + '" height="' + vbH + '" role="img" aria-label="' +
           util.escapeHtml(stage.title || '커밋 그래프') + ' 개념 예시">' +
           parts.join('') + '</svg>';
  }

  /**
   * 템플릿 ID로 그래프 블록 전체(안내 문구 + before/after)를 만든다.
   * @param {string} templateId
   * @returns {string} HTML. 템플릿이 없거나 'none'이면 빈 문자열
   */
  function renderGraphTemplate(templateId) {
    var tpl = window.GRAPH_TEMPLATES[templateId];
    if (!templateId || templateId === 'none' || !tpl) return '';

    var stages = [tpl.before, tpl.after].filter(Boolean);
    var html = '<div class="graph-box">' +
      '<p class="graph-notice"><span aria-hidden="true">ℹ️</span>' +
      '<span>이 그림은 <strong>개념 예시</strong>입니다. 현재 저장소의 실제 그래프가 아닙니다.</span></p>';

    stages.forEach(function (stage) {
      html += '<div class="graph-stage">' +
        '<p class="graph-stage__label">' + util.escapeHtml(stage.title || '') + '</p>' +
        '<div class="graph-scroll">' + buildStageSvg(stage) + '</div>' +
        '</div>';
    });

    if (tpl.caption) {
      html += '<p class="graph-caption">' + util.escapeHtml(tpl.caption) + '</p>';
    }
    return html + '</div>';
  }

  window.renderGraphTemplate = renderGraphTemplate;
})();
