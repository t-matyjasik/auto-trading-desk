/* Password gate — hash only; plain password never in repo */
(function () {
  const HASH = "f4f0df0a5403ed0ce9bda37797ac569cae7f38fc739d3bf7ad8f70281b96c4a6";
  const KEY = "at_desk_ok_v1";

  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function unlock() {
    sessionStorage.setItem(KEY, "1");
    const gate = document.getElementById("pw-gate");
    if (gate) gate.remove();
    document.documentElement.classList.remove("gated");
  }

  async function tryPass(raw) {
    const h = await sha256(String(raw || "").trim());
    if (h === HASH) {
      unlock();
      return true;
    }
    return false;
  }

  if (sessionStorage.getItem(KEY) === "1") {
    document.documentElement.classList.remove("gated");
    return;
  }

  document.documentElement.classList.add("gated");

  function mount() {
    if (document.getElementById("pw-gate")) return;
    const el = document.createElement("div");
    el.id = "pw-gate";
    el.innerHTML = `
      <div class="pw-card">
        <div class="pw-brand">Auto Trading</div>
        <h1>Dostęp chroniony</h1>
        <p>Podaj hasło, żeby zobaczyć desk.</p>
        <form id="pw-form">
          <input id="pw-input" type="password" autocomplete="current-password" placeholder="Hasło" autofocus />
          <button type="submit">Wejdź</button>
        </form>
        <div id="pw-err" class="pw-err" hidden>Złe hasło</div>
      </div>`;
    document.body.appendChild(el);
    const form = document.getElementById("pw-form");
    const input = document.getElementById("pw-input");
    const err = document.getElementById("pw-err");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.hidden = true;
      const ok = await tryPass(input.value);
      if (!ok) {
        err.hidden = false;
        input.select();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
