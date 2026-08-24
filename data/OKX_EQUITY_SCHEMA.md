# okx_equity.json (Executor → Dashboard)

Executor zapisuje `dashboard/data/okx_equity.json` (bez secrets/API keys).

## Wymagane pola
```json
{
  "updated_at": "ISO-8601",
  "source": "executor_okx",
  "equity_usd": 1234.56,
  "start_usd": 1000,
  "available_usd": null,
  "pnl_usd": 0,
  "pnl_pct": 0,
  "realized_pnl_usd": 0,
  "unrealized_pnl_usd": 0,
  "open_positions": [],
  "currency": "USD",
  "note": "opcjonalnie"
}
```

Dashboard mapuje:
- `equity_usd` → `paper.equity_usd` (KPI Equity)
- `start_usd` → `paper.start_usd`
- `pnl_*` → `paper.pnl_*`
- `realized/unrealized/open_positions` → `performance.*`

Gdy pliku brak lub `equity_usd` null → KPI pokazuje „—” (nie sztywne 1000).
