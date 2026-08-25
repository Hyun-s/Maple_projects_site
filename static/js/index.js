(function () {
  "use strict";

  const progress = document.querySelector(".reading-progress span");
  if (!progress) return;

  let ticking = false;
  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
    progress.style.transform = `scaleX(${ratio})`;
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (ticking) return;
    window.requestAnimationFrame(update);
    ticking = true;
  }, { passive: true });

  update();
})();
