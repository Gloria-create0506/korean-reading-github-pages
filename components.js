(function () {
  function ensureToastHost() {
    let host = document.getElementById("toastHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "toastHost";
      host.className = "toastHost";
      document.body.appendChild(host);
    }
    return host;
  }

  function toast(message) {
    const host = ensureToastHost();
    const item = document.createElement("div");
    item.className = "toastItem";
    item.textContent = message;
    host.appendChild(item);
    window.setTimeout(() => item.remove(), 2600);
  }

  function showReadingAssistantPanel(content) {
    const panel = document.getElementById("readingAssistantPanel");
    if (!panel) return;
    panel.hidden = false;
    document.getElementById("progressWidget")?.classList.add("isPanelHidden");
    panel.querySelector("[data-reading-assistant-title]").textContent = content.title || "阅读助手";
    const body = panel.querySelector("[data-reading-assistant-body]");
    if (content.html) {
      body.innerHTML = content.html;
      return;
    }
    body.innerHTML = (content.body || []).map((line) => `<p>${line}</p>`).join("");
  }

  function closeReadingAssistantPanel() {
    const panel = document.getElementById("readingAssistantPanel");
    if (panel) panel.hidden = true;
    document.getElementById("progressWidget")?.classList.remove("isPanelHidden");
  }

  window.KRComponents = { toast, showReadingAssistantPanel, closeReadingAssistantPanel };
})();
