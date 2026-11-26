// Fills the owner's details (from config.js) into privacy.html and terms.html.
// Anything not filled in yet is shown highlighted, so it's easy to spot before publishing.
(function () {
  const cfg = window.DAILYTIME_CONFIG || {};
  const fill = {
    owner: cfg.ownerName || "",
    email: cfg.supportEmail || "",
    country: cfg.ownerCountry || "",
    holder: cfg.ownerName || "MyServiceTime",
    year: new Date().getFullYear() > 2026 ? `2026–${new Date().getFullYear()}` : "2026",
  };
  const missing = { owner: "[your name or business name]", email: "[your support email]", country: "[your country]" };
  document.querySelectorAll("[data-fill]").forEach((el) => {
    const key = el.dataset.fill;
    const value = fill[key];
    if (value) {
      if (key === "email") {
        const a = document.createElement("a");
        a.href = "mailto:" + value;
        a.textContent = value;
        el.replaceChildren(a);
      } else {
        el.textContent = value;
      }
    } else {
      el.textContent = missing[key];
      el.classList.add("missing");
    }
  });
})();
