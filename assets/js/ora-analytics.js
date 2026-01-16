(function () {
  function safeJsonParse(text) {
    try { return JSON.parse(text); } catch { return null; }
  }

  function emit(eventName, params) {
    if (window && window.console && console.log) {
      console.log("[ORA_EVENT]", eventName, params || {});
    }
  }

  function pageView() {
    emit("page_view", {
      page_type: document.body.getAttribute("data-page-type") || "unknown",
      url: window.location.href,
      title: document.title
    });
  }

  function viewItemIfPresent() {
    var el = document.getElementById("ora-product");
    if (!el) return;

    var payload = safeJsonParse(el.textContent || "");
    if (!payload) return;

    emit("view_item", payload);
  }

  pageView();
  viewItemIfPresent();

  window.ORA = window.ORA || {};
  window.ORA.emit = emit;
})();
