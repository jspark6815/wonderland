# AI Module

## Streaming interpret (SSE)

`POST /api/v1/ai/interpret/stream`

- Returns `text/event-stream`
- Emits **split events** so UI can react step-by-step (suggested queries vs follow-up questions).

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


