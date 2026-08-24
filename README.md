# Auto Trading Desk (password-gated)

Publiczny snapshot dashboardu Auto Trading OKX z prostym loginem hasłem.

**URL:** https://t-matyjasik.github.io/auto-trading-desk/

Hasło: nie jest w tym repo. Dostaniesz je od Tomasza / Orkiestratora / Dashboard OKX.

## Zawartość (zero secrets API)
- UI: `index.html`, `css/`, `js/` (w tym `gate.js` — tylko hash hasła)
- `data/status.json`, `activity.json`, `files.json`, `daily_summary.md`

## Update po zmianach
```bash
# Źródło: ~/70_Trading/dashboard (+ logs/orders, logs/activity)
# 1) Skopiuj UI + data do dashboard-share (bez .env / kluczy)
# 2) Odśwież files.json (orders + activity public fields)
# 3) Zsynchronizuj gate.js (hash) jeśli zmieniasz hasło
cd ~/70_Trading/dashboard-share
git add -A
git status   # upewnij się, że nie ma .env / credentials
git commit -m "desk: refresh snapshot"
git push origin main
```
Pages (~1–2 min) serwuje `main` z roota.

## Bezpieczeństwo
Client-side gate = prosty dostęp współdzielony, nie bank-grade. Na poważniejszy lock: Cloudflare Access.
Lokalny plik z hasłem (nie commitować): `dashboard/.publish_password_local`
