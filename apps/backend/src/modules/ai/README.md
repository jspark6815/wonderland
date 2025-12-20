# AI Module

## Provider switch (Ollama ↔ Gemini)

This module supports selecting an LLM provider via environment variables.

### Env

- `AI_PROVIDER`: `ollama` (default) | `gemini`

#### Ollama

- `LLM_HOST`: default `http://localhost:11434`
- `LLM_MODEL`: default `llama3.2:3b`
- `LLM_TEMPERATURE`: default `0.7`
- `LLM_MAX_TOKENS`: default `2048`
- `LLM_TIMEOUT`: default `30000`

#### Gemini

- `GEMINI_API_KEY`: **required** when `AI_PROVIDER=gemini`
- `GEMINI_MODEL`: default `gemini-2.0-flash` (또는 `gemini-1.5-flash-latest`)
- `GEMINI_BASE_URL`: default `https://generativelanguage.googleapis.com/v1beta`
- (optional) `GEMINI_TEMPERATURE`, `GEMINI_MAX_TOKENS`, `GEMINI_TIMEOUT`

## Streaming interpret (SSE)

`POST /api/v1/ai/interpret/stream`

- Returns `text/event-stream`
- Emits **split events** so UI can react step-by-step (suggested queries vs follow-up questions).
- Note: Gemini provider currently streams as a single chunk (non-stream call → one `chunk`), to keep the SSE API shape stable.

### Example (curl)

```bash
curl -N \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{"query":"숭실대역 카페 찾고 싶어"}' \
  http://localhost:3000/api/v1/ai/interpret/stream
```

### Event types

- `status`: `{ "stage": "started" | "parsing" | "done" }`
- `chunk`: `{ "text": "..." }` (raw model output chunk; can be ignored by UI)
- `intent`: `{ "intent": "SUGGEST_QUERY" | "REFINE_CONTEXT" | "NEED_MORE_INFO" }`
- `suggestedQueries`: `{ "suggestedQueries": string[] }`
- `followUpQuestions`: `{ "followUpQuestions": string[] }`
- `interpretation`: full `InterpretedQuery`
- `error`: `{ "message": string }`
- `done`: `{ "ok": true }`


