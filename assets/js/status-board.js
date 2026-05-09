// Live updater for the public statut page (FR + EN).
// Fetches /api/platform-status and rewrites the headline, timestamp and per-component cards.
(function () {
  var board = document.querySelector("[data-status-board]");
  if (!board) return;

  var CACHE_KEY = "nexuradata:platform-status";
  var CACHE_MAX_AGE_MS = 10 * 60 * 1000;
  var RETRY_DELAYS = [1500, 3000];
  var FETCH_TIMEOUT_MS = 5000;
  var requestId = 0;

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

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.checkedAt || !Array.isArray(parsed.components)) return null;
      var age = Date.now() - Date.parse(parsed.checkedAt);
      if (!isFinite(age) || age > CACHE_MAX_AGE_MS) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          checkedAt: data.checkedAt,
          overall: data.overall,
          components: data.components
        })
      );
    } catch (e) {
      /* localStorage unavailable */
    }
  }

  function applyData(data) {
    if (!data || !data.ok || !Array.isArray(data.components)) return false;

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
      if (det) det.textContent = c.detail || "";
    });

    return true;
  }

  function applyDataSafe(data) {
    try {
      return applyData(data);
    } catch (e) {
      return false;
    }
  }

  function fetchWithTimeout(url, options, ms) {
    if (typeof AbortController === "undefined") return fetch(url, options);
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, ms);
    var opts = Object.assign({}, options, { signal: controller.signal });
    return fetch(url, opts).finally(function () {
      clearTimeout(timer);
    });
  }

  var cacheApplied = false;
  var cached = readCache();
  if (cached) {
    cacheApplied = applyDataSafe(cached);
  }

  function fetchStatus(attempt) {
    requestId += 1;
    var currentRequest = requestId;
    fetchWithTimeout(
      "/api/platform-status",
      {
        headers: { accept: "application/json" },
        credentials: "omit"
      },
      FETCH_TIMEOUT_MS
    )
      .then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (currentRequest !== requestId) return;
        if (!applyDataSafe(data)) return;
        writeCache(data);
      })
      .catch(function () {
        if (currentRequest !== requestId) return;
        if (attempt < RETRY_DELAYS.length) {
          setTimeout(function () {
            fetchStatus(attempt + 1);
          }, RETRY_DELAYS[attempt]);
          return;
        }

        if (!cacheApplied) {
          var checked = document.querySelector("[data-status-checked-at]");
          if (checked) checked.textContent = labels.failed;
        }
      });
  }

  fetchStatus(0);
})();
