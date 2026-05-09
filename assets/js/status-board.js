// Live updater for the public statut page (FR + EN).
// Fetches /api/platform-status and rewrites the headline, timestamp and per-component cards.
(function () {
  var board = document.querySelector("[data-status-board]");
  if (!board) return;

  var locale = board.getAttribute("data-status-locale") || "fr";
  var labels = locale === "en"
    ? {
        operational: "Operational.",
        degraded: "Degraded.",
        down: "Down.",
        headlineOk: "All services operational",
        headlineDegraded: "One or more services degraded",
        headlineDown: "One or more services down",
        failed: "Live check unavailable."
      }
    : {
        operational: "Op\u00e9rationnel.",
        degraded: "D\u00e9grad\u00e9.",
        down: "Hors service.",
        headlineOk: "Tous les services sont op\u00e9rationnels",
        headlineDegraded: "Un ou plusieurs services sont d\u00e9grad\u00e9s",
        headlineDown: "Un ou plusieurs services sont hors service",
        failed: "V\u00e9rification en direct indisponible."
      };

  function fmtTime(iso) {
    try {
      return new Date(iso).toLocaleString(locale === "en" ? "en-CA" : "fr-CA");
    } catch (e) {
      return iso;
    }
  }

  fetch("/api/platform-status", {
    headers: { accept: "application/json" },
    credentials: "omit"
  })
    .then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    })
    .then(function (data) {
      if (!data || !data.ok || !Array.isArray(data.components)) return;

      var checked = document.querySelector("[data-status-checked-at]");
      if (checked && data.checkedAt) {
        checked.setAttribute("datetime", data.checkedAt);
        checked.textContent = fmtTime(data.checkedAt);
      }

      var headline = document.querySelector("[data-status-headline]");
      if (headline) {
        headline.textContent = data.overall === "down"
          ? labels.headlineDown
          : data.overall === "degraded"
            ? labels.headlineDegraded
            : labels.headlineOk;
      }

      data.components.forEach(function (c) {
        var card = board.querySelector('[data-status-component="' + c.id + '"]');
        if (!card) return;
        var lbl = card.querySelector("[data-status-label]");
        var det = card.querySelector("[data-status-detail]");
        card.setAttribute("data-status-state", c.status);
        if (lbl) {
          lbl.textContent = c.status === "down"
            ? labels.down
            : c.status === "degraded"
              ? labels.degraded
              : labels.operational;
        }
        if (det && c.detail) det.textContent = c.detail;
      });
    })
    .catch(function () {
      var checked = document.querySelector("[data-status-checked-at]");
      if (checked) checked.textContent = labels.failed;
    });
})();
