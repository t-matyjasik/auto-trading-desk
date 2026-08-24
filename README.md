# Auto Trading Desk (public)

Publiczny snapshot dashboardu Auto Trading OKX — **bez hasła**.

**URL:** https://t-matyjasik.github.io/auto-trading-desk/

## Zawartość (zero secrets / API keys)
- UI: `index.html`, `css/`, `js/`
- `data/status.json` — status, strategia, KPI
- `data/activity.json` + `files.json` — feed decyzji + zlecenia (pola publiczne)
- `data/daily_summary.md`

## Update po zmianach
```bash
# Źródło prawdy: ~/70_Trading/dashboard (+ logs/orders, logs/activity)
# Skopiuj UI + data do dashboard-share (bez .env / kluczy), potem:
cd ~/70_Trading/dashboard-share
git add -A
git status   # zero .env / credentials
git commit -m "desk: refresh snapshot"
git push origin main
```
GitHub Pages (~1–2 min) serwuje branch `main`.

Auto-refresh: desk odpytuje `./data/*.json` jak lokalny tryb static.
