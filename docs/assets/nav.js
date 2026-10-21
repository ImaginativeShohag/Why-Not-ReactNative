// Top navigation: "Back" returns to the previous page when there is one
// (otherwise the link's href is followed), the Write-ups menu closes on an
// outside click or Escape, and the theme button switches light/dark for the
// whole site. The theme lives in localStorage["wnrn-theme"] ("light" or
// "dark"; missing means follow the system). Every page applies it before first
// paint with a small inline script, so this file only handles changes.
(function () {
  var THEME_KEY = "wnrn-theme";
  var root = document.documentElement;
  var systemLight = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;

  function storedTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      return t === "light" || t === "dark" ? t : null;
    } catch (e) {
      return null;
    }
  }
  function resolvedTheme() {
    return storedTheme() || (systemLight && systemLight.matches ? "light" : "dark");
  }
  function applyTheme(theme) {
    root.dataset.theme = theme;
    var next = theme === "light" ? "dark" : "light";
    Array.prototype.forEach.call(document.querySelectorAll(".tn-theme"), function (b) {
      b.setAttribute("aria-label", "Switch to " + next + " theme");
      b.title = "Switch to " + next + " theme";
    });
    document.dispatchEvent(new CustomEvent("wnrn-themechange", { detail: { theme: theme, stored: storedTheme() } }));
  }
  function setTheme(theme) {
    try {
      if (theme === "light" || theme === "dark") localStorage.setItem(THEME_KEY, theme);
      else localStorage.removeItem(THEME_KEY);
    } catch (e) {}
    var swap = function () { applyTheme(resolvedTheme()); };
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && !reduce) document.startViewTransition(swap);
    else swap();
  }
  window.WNRN_THEME = { set: setTheme, get: storedTheme };

  applyTheme(resolvedTheme());
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".tn-theme");
    if (b) setTheme(root.dataset.theme === "light" ? "dark" : "light");
  });
  if (systemLight && systemLight.addEventListener) {
    systemLight.addEventListener("change", function () {
      if (!storedTheme()) applyTheme(resolvedTheme());
    });
  }
  window.addEventListener("storage", function (e) {
    if (e.key === THEME_KEY) applyTheme(resolvedTheme());
  });

  // "Skip to content" focuses the content without touching the URL hash (the
  // quiz uses the hash for routing).
  var skip = document.querySelector(".skip");
  if (skip) {
    skip.addEventListener("click", function (e) {
      var target = document.getElementById(skip.getAttribute("href").slice(1));
      if (!target) return;
      e.preventDefault();
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus();
      target.scrollIntoView();
    });
  }

  var back = document.querySelector(".tn-back");
  if (back) {
    back.addEventListener("click", function (e) {
      if (window.history.length > 1) {
        e.preventDefault();
        window.history.back();
      }
    });
  }
  var menu = document.querySelector(".tn-menu");
  if (menu) {
    document.addEventListener("click", function (e) {
      if (menu.open && !menu.contains(e.target)) menu.open = false;
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.open) {
        menu.open = false;
        menu.querySelector("summary").focus();
      }
    });
  }

  // "On this page": highlight the section in view, and close the mobile list
  // after a jump.
  var links = Array.prototype.slice.call(document.querySelectorAll(".lp-toc a"));
  if (links.length && "IntersectionObserver" in window) {
    var byId = {};
    links.forEach(function (a) { byId[decodeURIComponent(a.getAttribute("href").slice(1))] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove("active"); });
        var a = byId[e.target.id];
        if (a) {
          a.classList.add("active");
          // Keep the active entry visible inside the sidebar without moving the page.
          var list = a.closest("ol");
          if (list && list.scrollHeight > list.clientHeight) {
            var top = a.offsetTop - list.offsetTop;
            if (top < list.scrollTop || top > list.scrollTop + list.clientHeight - a.offsetHeight) {
              list.scrollTop = top - list.clientHeight / 2;
            }
          }
        }
      });
    }, { rootMargin: "-80px 0px -65% 0px" });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }
  var mobileToc = document.querySelector(".wu-toc-m");
  if (mobileToc) {
    mobileToc.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("a")) mobileToc.open = false;
    });
  }
})();
