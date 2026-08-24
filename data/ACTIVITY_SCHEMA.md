# Activity feed schema (desk)

Orkiestrator / Executor dopisują do `dashboard/data/activity.json` → `items[]` (najnowsze na górze)
albo wrzucają plik JSON do `logs/activity/*.json` (desk zmerguje przez `/api/files`).

## activity.json item
```json
{
  "id": "2026-08-24T1200_skip_btc",
  "ts": "2026-08-24T12:00:00+02:00",
  "actor": "Orkiestrator",
  "action": "SKIP|BLOCKED|REDUCE|GO|NOTE",
  "reason_code": "NEWS_GATE|SCORECARD|REGIME|RISK|OTHER",
  "reason": "krótki powód PL",
  "instrument": "BTC-USDT-SWAP",
  "context": {"regime":"TREND","tc_pull":"ON_WATCH"},
  "source": "opcjonalnie"
}
```

## Order log (Executor) — `logs/orders/*.json`
Pola czytane przez desk:
- `instId`, `side`, `status` / `blocked`
- `action` opcjonalnie: open|close|reduce|sl|tp|cancel|skipped
- `comment_pl`: `TEZA: … | RISK: … | INVALIDACJA: …`
- `sl`, `tp1`/`tp`, `leverage_planned`, `timestamp_warsaw`

Publikacja: OFF.
