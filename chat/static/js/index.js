(function () {
  "use strict";

  function setupProgress() {
    const progress = document.querySelector(".reading-progress span");
    if (!progress) return;
    let ticking = false;
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0})`;
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (ticking) return;
      window.requestAnimationFrame(update);
      ticking = true;
    }, { passive: true });
    update();
  }

  function setupNavigation() {
    if (!("IntersectionObserver" in window)) return;
    const links = [...document.querySelectorAll('.section-nav a[href^="#"]')];
    const linksById = new Map(links.map((link) => [link.hash.slice(1), link]));
    const observer = new IntersectionObserver((entries) => {
      const current = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!current) return;
      links.forEach((link) => link.removeAttribute("aria-current"));
      linksById.get(current.target.id)?.setAttribute("aria-current", "true");
    }, { rootMargin: "-18% 0px -68% 0px", threshold: [0, 0.1, 0.4] });
    linksById.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  setupProgress();
  setupNavigation();
})();
