/* ═══════════════════════════════════════════
   Nutrify — Sidebar Navigation + Hash Router
   ═══════════════════════════════════════════ */

(function () {
  var VIEWS = [
    "dashboard",
    "log-meal",
    "history",
    "statistics",
    "profile",
    "progress",
  ];
  var DEFAULT_VIEW = "dashboard";

  function currentView() {
    var hash = (window.location.hash || "").replace(/^#\/?/, "").trim();
    return VIEWS.indexOf(hash) !== -1 ? hash : DEFAULT_VIEW;
  }

  var switchTimer = null;

  function finishSwitch(id) {
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.remove("view-leaving");
      v.classList.toggle("active", v.id === "view-" + id);
    });
    document.querySelectorAll(".nav-item").forEach(function (n) {
      n.classList.toggle("active", n.getAttribute("data-view") === id);
    });
    window.scrollTo({ top: 0 });
  }

  function showView(id) {
    var target = document.getElementById("view-" + id);
    var current = document.querySelector(".view.active");
    if (switchTimer) {
      clearTimeout(switchTimer);
      switchTimer = null;
    }
    if (current && current !== target) {
      // Fade the old page out, then reveal the new one
      current.classList.add("view-leaving");
      switchTimer = setTimeout(function () {
        switchTimer = null;
        finishSwitch(id);
      }, 180);
    } else {
      finishSwitch(id);
    }
  }

  function route() {
    var id = currentView();
    if (!window.location.hash || window.location.hash === "#") {
      history.replaceState(null, "", "#/" + id);
    }
    showView(id);
  }

  window.addEventListener("hashchange", route);
  window.showView = showView; // expose for programmatic navigation

  // Initialize on load (DOM is ready — scripts are at end of body)
  route();
})();
