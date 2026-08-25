(function () {
  "use strict";

  const data = window.MAPLE_EXPERIMENT_DATA ?? {};

  function textElement(tagName, value, className) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = value;
    return element;
  }

  function formatDate(value) {
    if (!value) return "Pending";
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? `${match[1]}.${match[2]}.${match[3]}` : value;
  }

  function formatScore(value) {
    return Number.isFinite(value) ? Number(value).toFixed(3) : "—";
  }

  function renderProtocol() {
    const container = document.getElementById("protocol-list");
    if (!container || !Array.isArray(data.protocol) || data.protocol.length === 0) return;

    const fragment = document.createDocumentFragment();
    data.protocol.forEach((item) => {
      const row = document.createElement("div");
      row.className = "protocol-row";
      row.append(textElement("span", item.label ?? ""), textElement("strong", item.value ?? "Pending"));
      fragment.append(row);
    });
    container.replaceChildren(fragment);
  }

  function renderResultSummary(results) {
    const runCount = document.getElementById("published-run-count");
    const sampleCount = document.getElementById("benchmark-sample-count");
    const lastEvaluated = document.getElementById("last-evaluated");

    if (runCount) runCount.textContent = String(results.length);
    if (sampleCount) {
      const count = data.benchmark?.sampleCount;
      sampleCount.textContent = Number.isFinite(count) ? String(count) : "—";
    }
    if (lastEvaluated) lastEvaluated.textContent = formatDate(data.benchmark?.lastEvaluated);
  }

  function renderResults() {
    const body = document.getElementById("results-body");
    const placeholder = document.getElementById("result-placeholder");
    const results = Array.isArray(data.results) ? data.results : [];
    renderResultSummary(results);

    if (!body || results.length === 0) return;

    const bestOverall = Math.max(
      ...results.map((result) =>
        Number.isFinite(result.metrics?.overall) ? Number(result.metrics.overall) : Number.NEGATIVE_INFINITY,
      ),
    );
    const fragment = document.createDocumentFragment();

    results.forEach((result) => {
      const row = document.createElement("tr");
      [result.name, result.model, result.method, result.style].forEach((value) => {
        row.append(textElement("td", value ?? "—"));
      });

      const metrics = result.metrics ?? {};
      ["quality", "identity", "overall"].forEach((key) => {
        const cell = textElement("td", formatScore(metrics[key]), "score-cell");
        if (key === "overall" && Number(metrics[key]) === bestOverall) cell.classList.add("best");
        row.append(cell);
      });
      fragment.append(row);
    });

    body.replaceChildren(fragment);
    if (placeholder) placeholder.hidden = true;
  }

  function makeSampleFigure(asset, fallbackLabel) {
    const figure = document.createElement("figure");

    if (asset?.src) {
      const image = document.createElement("img");
      image.src = asset.src;
      image.alt = asset.alt ?? `${fallbackLabel} image`;
      image.loading = "lazy";
      image.decoding = "async";
      figure.append(image);
    } else {
      const placeholder = textElement("div", "Image not published", "sample-image-missing");
      placeholder.setAttribute("role", "img");
      placeholder.setAttribute("aria-label", `${fallbackLabel} image not published`);
      figure.append(placeholder);
    }

    const caption = document.createElement("figcaption");
    caption.append(
      textElement("span", fallbackLabel),
      textElement("span", asset?.detail ?? "Approved sample"),
    );
    figure.append(caption);
    return figure;
  }

  function renderSamples() {
    const gallery = document.getElementById("sample-gallery");
    const count = document.getElementById("sample-count");
    const samples = Array.isArray(data.samples) ? data.samples : [];

    if (count) count.textContent = `${samples.length} approved sample set${samples.length === 1 ? "" : "s"}`;
    if (!gallery || samples.length === 0) return;

    const fragment = document.createDocumentFragment();
    samples.forEach((sample, index) => {
      const article = document.createElement("article");
      article.className = "sample-set";

      const head = document.createElement("div");
      head.className = "sample-set-head";
      const heading = document.createElement("div");
      heading.append(
        textElement("span", sample.id ?? `Sample ${String(index + 1).padStart(3, "0")}`),
        textElement("h3", sample.title ?? "Untitled comparison"),
      );
      head.append(heading, textElement("p", sample.description ?? ""));

      const images = document.createElement("div");
      images.className = "sample-images";
      images.append(
        makeSampleFigure(sample.input, "Input"),
        makeSampleFigure(sample.target, "Target"),
        makeSampleFigure(sample.generated, "Generated"),
      );

      article.append(head, images);
      fragment.append(article);
    });

    gallery.replaceChildren(fragment);
  }

  function renderChangelog() {
    const container = document.getElementById("changelog");
    if (!container || !Array.isArray(data.changelog) || data.changelog.length === 0) return;

    const fragment = document.createDocumentFragment();
    data.changelog.forEach((entry) => {
      const article = document.createElement("article");
      const time = textElement("time", formatDate(entry.date));
      time.dateTime = entry.date ?? "";
      const copy = document.createElement("div");
      copy.append(
        textElement("strong", entry.title ?? "Site updated"),
        textElement("p", entry.description ?? ""),
      );
      article.append(time, copy);
      fragment.append(article);
    });
    container.replaceChildren(fragment);
  }

  function setUpdateDate() {
    const element = document.getElementById("site-updated-at");
    if (element) element.textContent = data.siteUpdatedAt ?? "Pending";
  }

  function setupScrollProgress() {
    const progress = document.querySelector(".reading-progress span");
    if (!progress) return;

    let ticking = false;
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
      progress.style.transform = `scaleX(${ratio})`;
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true },
    );
    update();
  }

  function setupActiveNavigation() {
    if (!("IntersectionObserver" in window)) return;
    const links = [...document.querySelectorAll(".section-nav a")];
    const linkById = new Map(links.map((link) => [link.getAttribute("href")?.slice(1), link]));
    const sections = [...linkById.keys()]
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        links.forEach((link) => link.removeAttribute("aria-current"));
        linkById.get(visible.target.id)?.setAttribute("aria-current", "true");
      },
      { rootMargin: "-18% 0px -68% 0px", threshold: [0, 0.1, 0.4] },
    );
    sections.forEach((section) => observer.observe(section));
  }

  renderProtocol();
  renderResults();
  renderSamples();
  renderChangelog();
  setUpdateDate();
  setupScrollProgress();
  setupActiveNavigation();
})();
