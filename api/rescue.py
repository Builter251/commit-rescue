"""
api/rescue.py — 상황 기반 Git 수습 계획 생성 (기획서 3장 / 6장)

Vercel Serverless Function (Python). 요청마다 실행되고 응답 후 종료되는 무상태 구조다.
API 키는 이 파일 안에서만 os.environ으로 읽는다. 프론트엔드나 응답에는 절대 포함하지 않는다.

의존성 없이 표준 라이브러리(urllib)만으로 Gemini REST API를 호출한다.
"""

import json
import os
import re
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

# ---------------------------------------------------------------- 상수

GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)
DEFAULT_MODEL = "gemini-2.5-flash"   # 무료 등급 한도가 가장 여유로운 Flash 계열 (기획서 5.1절)
REQUEST_TIMEOUT = 18                 # 프론트 타임아웃(20초)보다 짧게 둔다

MAX_SITUATION = 1000
MIN_SITUATION = 5
MAX_COMMAND = 300
MAX_LONG_FIELD = 1000
MAX_STEPS = 8

# 프론트(js/graph-templates.js)와 반드시 같은 목록이어야 한다.
ALLOWED_TEMPLATES = {
    "amend-add-file",
    "amend-message",
    "restore-staged",
    "restore-worktree",
    "revert-pushed",
    "reset-soft",
    "non-fast-forward",
    "fetch-updates-origin",
    "wrong-branch",
    "none",
}

ALLOWED_AREAS = {"work", "staging", "local", "origin-tracking", "remote"}
ALLOWED_RISK = {"안전", "주의", "위험"}
ALLOWED_WHERE = {"local", "저장소관계", "네트워크인증", "github정책", "판단불가"}

SECRET_PATTERNS = [
    re.compile(r"gh[pousr]_[A-Za-z0-9]{16,}"),
    re.compile(r"\bsk-[A-Za-z0-9_\-]{16,}"),
    re.compile(r"AIza[0-9A-Za-z_\-]{20,}"),
    re.compile(r"glpat-[0-9A-Za-z_\-]{16,}"),
    re.compile(r"xox[baprs]-[0-9A-Za-z\-]{10,}"),
    re.compile(r"https?://[^\s:@]+:[^\s@]+@"),
]

# ---------------------------------------------------------------- 프롬프트

SYSTEM_PROMPT = """당신은 Git 입문자를 돕는 한국어 도우미 "커밋구조대"입니다.
사용자가 겪은 상황을 읽고, 수습 명령어와 그 명령이 바꾸는 영역을 함께 설명합니다.

반드시 지켜야 할 규칙입니다.

1. 첫 단계는 항상 `git status`입니다. 사용자가 상황을 잘못 설명했을 가능성을 이 단계가 걸러줍니다.
2. `checkout`이 아니라 `switch` / `restore`를 제시합니다.
   - 브랜치 이동: `git switch <브랜치>` (생성 후 이동은 `git switch -c <브랜치>`)
   - add 취소: `git restore --staged <파일>`
   - 마지막 커밋 상태로 파일 되돌리기: `git restore --source=HEAD -- <파일>`
   - 주의: `git restore <파일>`의 기본 소스는 HEAD가 아니라 index(스테이징)입니다.
     이미 add한 파일에 이 명령을 쓰면 아무 일도 없는 것처럼 보입니다. 필요하면 이 함정을 주의사항에 적으세요.
3. 기본 브랜치는 `main`으로 가정합니다. 사용자가 `master`라고 명시한 경우만 예외입니다.
4. 이미 원격에 올라간 커밋은 `revert`로 처리합니다. `reset`이나 강제 푸시를 권하지 않습니다.
   push 여부가 `unknown`이면 먼저 확인 방법(`git log --oneline origin/main..main`)을 안내하고,
   확정 전에는 되돌릴 수 없는 명령을 제안하지 않습니다.
5. 각 명령마다 변경영역과 유지영역을 모두 적습니다. "무엇이 바뀌지 않는가"가 초보자에게 더 중요합니다.
   영역 값은 정확히 이 다섯 가지만 씁니다: work(작업 폴더), staging(스테이징), local(로컬 main),
   origin-tracking(로컬에 있는 origin/main 기록), remote(GitHub의 main).
   - `git fetch`는 origin-tracking만 바꿉니다. work와 local은 바꾸지 않습니다.
   - `git commit`은 remote를 절대 바꾸지 않습니다.
   - `git push`는 remote와 origin-tracking을 함께 바꿉니다.
6. 확인된 사실과 추정을 구분합니다. 사용자가 입력하지 않은 정보는 절대 확정으로 서술하지 않습니다.
   상황요약은 "~로 보입니다" 어투를 씁니다.
7. 커밋 ID나 그래프를 직접 만들지 않습니다. 그래프가 필요하면 아래 목록에서 하나를 고르고,
   맞는 것이 없으면 반드시 "none"을 반환합니다.
   amend-add-file, amend-message, restore-staged, restore-worktree, revert-pushed,
   reset-soft, non-fast-forward, fetch-updates-origin, wrong-branch, none
8. `git reflog`를 안내할 때는 "이동하거나 삭제된 커밋"을 찾는 데 유용하지만
   한 번도 커밋하지 않은 파일 변경은 복구해주지 못한다는 점을 함께 적습니다.
9. 되돌릴 수 없는 명령(`reset --hard`, 강제 푸시, `clean -fd` 등)이 포함되면 위험도를 "위험"으로 둡니다.
10. Git과 무관한 질문이면 관련없음을 true로 두고 나머지는 비웁니다.

설명은 초보자가 읽는다고 가정하고 짧고 구체적으로 씁니다. 명령어는 최대 8단계까지만 제시합니다."""

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "관련없음": {"type": "boolean"},
        "상황요약": {"type": "string"},
        "근거구분": {
            "type": "object",
            "properties": {
                "확인됨": {"type": "array", "items": {"type": "string"}},
                "추정": {"type": "array", "items": {"type": "string"}},
                "추가확인": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["확인됨", "추정", "추가확인"],
        },
        "위험도": {"type": "string", "enum": ["안전", "주의", "위험"]},
        "오류위치": {
            "type": "string",
            "enum": ["local", "저장소관계", "네트워크인증", "github정책", "판단불가"],
        },
        "명령어": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "cmd": {"type": "string"},
                    "설명": {"type": "string"},
                    "변경영역": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["work", "staging", "local", "origin-tracking", "remote"],
                        },
                    },
                    "유지영역": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["work", "staging", "local", "origin-tracking", "remote"],
                        },
                    },
                },
                "required": ["cmd", "설명", "변경영역", "유지영역"],
            },
        },
        "주의사항": {"type": "array", "items": {"type": "string"}},
        "그래프템플릿": {
            "type": "string",
            "enum": sorted(ALLOWED_TEMPLATES),
        },
    },
    "required": [
        "관련없음",
        "상황요약",
        "근거구분",
        "위험도",
        "오류위치",
        "명령어",
        "주의사항",
        "그래프템플릿",
    ],
}

PUSH_LABEL = {"yes": "예, 이미 push했습니다", "no": "아니요, 아직 push하지 않았습니다",
              "unknown": "모르겠습니다"}
LEVEL_LABEL = {"beginner": "완전 처음 (용어부터 풀어서 설명해주세요)",
               "intermediate": "기본은 압니다 (add/commit/push는 써봤습니다)"}


def build_user_prompt(data):
    lines = ["[어떤 상황인가요]", data["situation"]]

    if data["executedCommand"]:
        lines += ["", "[실행한 명령]", data["executedCommand"]]
    if data["errorMessage"]:
        lines += ["", "[오류 메시지]", data["errorMessage"]]
    if data["statusOutput"]:
        lines += ["", "[git status 결과]", data["statusOutput"]]

    lines += ["", "[이미 push했나요]", PUSH_LABEL.get(data["alreadyPushed"], "모르겠습니다")]
    lines += ["", "[설명 수준]", LEVEL_LABEL.get(data["level"], LEVEL_LABEL["beginner"])]
    lines += [
        "",
        "위 정보만으로 판단하세요. 적혀 있지 않은 것은 추정으로 표시하고, "
        "확인이 필요한 것은 추가확인에 넣으세요.",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------- 검증 / 정규화

class InvalidInput(Exception):
    pass


def clean_str(value, limit):
    if value is None:
        return ""
    if not isinstance(value, str):
        raise InvalidInput("입력 형식이 올바르지 않습니다.")
    return value.strip()[:limit]


def parse_request(raw):
    try:
        body = json.loads(raw.decode("utf-8"))
    except Exception:
        raise InvalidInput("요청 형식이 올바르지 않습니다.")
    if not isinstance(body, dict):
        raise InvalidInput("요청 형식이 올바르지 않습니다.")

    situation = clean_str(body.get("situation"), MAX_SITUATION + 1)
    if len(situation) < MIN_SITUATION:
        raise InvalidInput("상황 설명이 너무 짧습니다. 조금만 더 자세히 적어주세요.")
    if len(situation) > MAX_SITUATION:
        raise InvalidInput("1,000자 이내로 줄여주세요.")

    data = {
        "situation": situation,
        "executedCommand": clean_str(body.get("executedCommand"), MAX_COMMAND),
        "errorMessage": clean_str(body.get("errorMessage"), MAX_LONG_FIELD),
        "statusOutput": clean_str(body.get("statusOutput"), MAX_LONG_FIELD),
        "alreadyPushed": body.get("alreadyPushed") if body.get("alreadyPushed") in PUSH_LABEL else "unknown",
        "level": body.get("level") if body.get("level") in LEVEL_LABEL else "beginner",
    }

    joined = "\n".join(
        [data["situation"], data["executedCommand"], data["errorMessage"], data["statusOutput"]]
    )
    for pattern in SECRET_PATTERNS:
        if pattern.search(joined):
            raise InvalidInput("API 키나 토큰으로 보이는 값이 있습니다. 지우고 보내주세요.")

    return data


def normalize_response(payload):
    """AI 응답을 화면이 신뢰할 수 있는 형태로 정규화한다.

    허용 목록에 없는 값은 조용히 안전한 기본값으로 바꾼다.
    (기획서 6장: 그래프템플릿이 목록에 없으면 서버가 none으로 치환한다.)
    """
    if not isinstance(payload, dict):
        raise ValueError("dict가 아님")

    if payload.get("관련없음") is True:
        return {
            "관련없음": True,
            "상황요약": "",
            "근거구분": {"확인됨": [], "추정": [], "추가확인": []},
            "위험도": "안전",
            "오류위치": "판단불가",
            "명령어": [],
            "주의사항": [],
            "그래프템플릿": "none",
        }

    def str_list(value, limit=8):
        if not isinstance(value, list):
            return []
        return [str(v).strip() for v in value if isinstance(v, (str, int, float))][:limit]

    evidence = payload.get("근거구분") or {}
    if not isinstance(evidence, dict):
        evidence = {}

    steps = []
    for raw_step in (payload.get("명령어") or [])[:MAX_STEPS]:
        if not isinstance(raw_step, dict):
            continue
        cmd = str(raw_step.get("cmd", "")).strip()
        if not cmd:
            continue
        changed = [a for a in (raw_step.get("변경영역") or []) if a in ALLOWED_AREAS]
        kept = [a for a in (raw_step.get("유지영역") or []) if a in ALLOWED_AREAS and a not in changed]
        steps.append(
            {
                "cmd": cmd[:200],
                "설명": str(raw_step.get("설명", "")).strip()[:400],
                "변경영역": changed,
                "유지영역": kept,
            }
        )

    template = payload.get("그래프템플릿")
    if template not in ALLOWED_TEMPLATES:
        template = "none"

    risk = payload.get("위험도")
    if risk not in ALLOWED_RISK:
        risk = "주의"

    where = payload.get("오류위치")
    if where not in ALLOWED_WHERE:
        where = "판단불가"

    return {
        "관련없음": False,
        "상황요약": str(payload.get("상황요약", "")).strip()[:300],
        "근거구분": {
            "확인됨": str_list(evidence.get("확인됨")),
            "추정": str_list(evidence.get("추정")),
            "추가확인": str_list(evidence.get("추가확인")),
        },
        "위험도": risk,
        "오류위치": where,
        "명령어": steps,
        "주의사항": str_list(payload.get("주의사항"), limit=5),
        "그래프템플릿": template,
    }


# ---------------------------------------------------------------- Gemini 호출

class UpstreamError(Exception):
    def __init__(self, status, code, message, retry_after=None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.retry_after = retry_after


def call_gemini(user_prompt):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        # 키가 없는 것은 서버 설정 문제다. 원인을 사용자에게 노출하지 않는다.
        raise UpstreamError(500, "SERVER_ERROR", "일시적인 문제가 발생했습니다.")

    # `.get(키, 기본값)`은 환경 변수가 **빈 문자열**일 때 기본값을 쓰지 않는다.
    # .env.example 을 그대로 복사하면 GEMINI_MODEL 이 빈 값이 되므로 반드시 or 로 받는다.
    model = os.environ.get("GEMINI_MODEL") or DEFAULT_MODEL
    url = GEMINI_ENDPOINT.format(model=model)

    request_body = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2048,
            "responseMimeType": "application/json",
            "responseSchema": RESPONSE_SCHEMA,
        },
    }

    request = urllib.request.Request(
        url,
        data=json.dumps(request_body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,   # 키를 URL 쿼리에 넣지 않는다
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        if exc.code == 429:
            raise UpstreamError(429, "RATE_LIMITED", "지금 이용자가 많습니다.", retry_after=30)
        # 상류의 오류 코드와 본문을 그대로 전달하지 않는다
        raise UpstreamError(502, "UPSTREAM_ERROR", "일시적인 문제가 발생했습니다.")
    except Exception:
        raise UpstreamError(502, "UPSTREAM_ERROR", "일시적인 문제가 발생했습니다.")

    try:
        parsed = json.loads(raw)
        text = parsed["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except Exception:
        raise UpstreamError(502, "BAD_FORMAT", "결과를 불러오지 못했습니다.")


# ---------------------------------------------------------------- 핸들러

class handler(BaseHTTPRequestHandler):

    def _send(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0

        if length <= 0 or length > 20000:
            self._send(400, {"error": "INVALID_INPUT", "message": "요청 본문이 비었거나 너무 큽니다."})
            return

        raw = self.rfile.read(length)

        try:
            data = parse_request(raw)
        except InvalidInput as exc:
            self._send(400, {"error": "INVALID_INPUT", "message": str(exc)})
            return

        try:
            ai_payload = call_gemini(build_user_prompt(data))
            result = normalize_response(ai_payload)
        except UpstreamError as exc:
            payload = {"error": exc.code, "message": exc.message}
            if exc.retry_after:
                payload["retryAfter"] = exc.retry_after
            self._send(exc.status, payload)
            return
        except Exception:
            # 내부 stack trace를 노출하지 않는다
            self._send(500, {"error": "SERVER_ERROR", "message": "일시적인 문제가 발생했습니다."})
            return

        self._send(200, result)

    def do_GET(self):
        self._send(405, {"error": "METHOD_NOT_ALLOWED", "message": "POST로 요청해주세요."})
