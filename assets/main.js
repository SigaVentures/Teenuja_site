/* TEENOOJA — site behaviour: nav, reveal-on-scroll, gallery, lightbox */
(function () {
  "use strict";

  /* mobile nav */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* reveal on scroll — only hide things once we know we can show them again */
  document.documentElement.classList.add("js");

  function revealAll() {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-in"); });
  }

  if (!("IntersectionObserver" in window)) {
    revealAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
    // safety net: anything already on screen must never stay invisible,
    // even if the observer is throttled (background tab, no scroll yet)
    setTimeout(function () {
      document.querySelectorAll(".reveal:not(.is-in)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-in");
      });
    }, 1200);
  }

  /* ---------------- WhatsApp enquiry form ---------------- */
  var waForm = document.querySelector("[data-whatsapp]");
  if (waForm) {
    waForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = waForm.elements;
      var lines = [
        "Hi Teenooja, I'd like to enquire about a shoot.",
        "",
        "Name: " + f.name.value.trim(),
        f.company.value.trim() ? "Brand / company: " + f.company.value.trim() : "",
        "Type of work: " + f.type.value,
        f.date.value.trim() ? "Date & location: " + f.date.value.trim() : "",
        "",
        f.message.value.trim()
      ].filter(function (l, i) { return l !== "" || i === 1 || i === 6; });

      window.open(
        "https://wa.me/" + waForm.dataset.whatsapp + "?text=" + encodeURIComponent(lines.join("\n")),
        "_blank",
        "noopener"
      );
    });
  }

  /* ---------------- category cards ---------------- */
  var cardHost = document.querySelector("[data-cards]");
  if (cardHost && typeof GALLERY !== "undefined") {
    cardHost.innerHTML = GALLERY.map(function (c) {
      return (
        '<a class="card" href="portfolio.html#' + c.slug + '">' +
        '<div class="card-img"><img loading="lazy" src="img/thumb/' + c.cover +
        '" alt="Teenooja — ' + c.title + '"></div>' +
        '<div class="card-body"><h3>' + c.title + "</h3><p>" + c.desc + "</p>" +
        '<span class="card-count">' + c.images.length + " photographs</span></div></a>"
      );
    }).join("");
  }

  /* ---------------- gallery ---------------- */
  var grid = document.querySelector("[data-gallery]");
  if (!grid || typeof GALLERY === "undefined") return;

  var filterHost = document.querySelector("[data-filters]");
  var current = [];   // flat list currently rendered

  function flatten(slug) {
    var out = [];
    GALLERY.forEach(function (c) {
      if (slug !== "all" && c.slug !== slug) return;
      c.images.forEach(function (im) {
        out.push({ file: im.f, cat: c.title, ratio: im.h / im.w });
      });
    });
    return out;
  }

  function metrics() {
    var w = window.innerWidth;
    if (w <= 560) return { gap: 12, target: 260, pairs: true };
    if (w <= 1024) return { gap: 18, target: 280 };
    return { gap: 18, target: 340 };
  }

  function figure(item, n, w, h) {
    return (
      '<figure data-i="' + n + '" style="width:' + w + "px;height:" + h + 'px">' +
      '<img loading="lazy" src="img/thumb/' + item.file +
      '" width="' + w + '" height="' + h +
      '" alt="Teenooja — ' + item.cat + '">' +
      "<figcaption>" + item.cat + "</figcaption></figure>"
    );
  }

  /* Split the photographs into `count` consecutive rows whose summed aspect
     ratios sit as close to `ideal` as possible, so every row ends up a similar
     height. Exact, by dynamic programming — a greedy split pushes its error
     into the final row and leaves it with a crowd of tiny photographs. */
  function partition(cells, count, ideal) {
    var n = cells.length;
    var prefix = [0];
    var i, r, j;
    for (i = 0; i < n; i++) prefix.push(prefix[i] + cells[i].aspect);

    var INF = Infinity;
    var cost = [];
    var from = [];
    for (r = 0; r <= count; r++) {
      cost.push(new Array(n + 1).fill(INF));
      from.push(new Array(n + 1).fill(0));
    }
    cost[0][0] = 0;

    for (r = 1; r <= count; r++) {
      for (i = r; i <= n - (count - r); i++) {
        for (j = r - 1; j < i; j++) {
          if (cost[r - 1][j] === INF) continue;
          var d = prefix[i] - prefix[j] - ideal;
          var c = cost[r - 1][j] + d * d;
          if (c < cost[r][i]) { cost[r][i] = c; from[r][i] = j; }
        }
      }
    }

    var rows = [];
    var end = n;
    for (r = count; r >= 1; r--) {
      var start = from[r][end];
      rows.unshift({
        items: cells.slice(start, end),
        sum: prefix[end] - prefix[start]
      });
      end = start;
    }
    return rows;
  }

  /* Justified rows: every photo keeps its own aspect ratio, and each row is
     scaled so it fills the container edge to edge. No ragged right-hand gaps,
     and nothing is cropped. The final row keeps the target height. */
  function layout() {
    var m = metrics();
    var avail = grid.clientWidth;
    if (!avail) return;

    var cells = current.map(function (item, n) {
      return { item: item, n: n, aspect: 1 / item.ratio };
    });
    var total = cells.reduce(function (a, c) { return a + c.aspect; }, 0);

    // Decide how many rows to use up front, rather than filling each row until
    // it overflows. Every row — the last one included — then gets justified to
    // the full width, so the grid has no ragged edge anywhere.
    var count = Math.max(1, Math.round((total * m.target) / avail));
    count = Math.min(count, cells.length);
    while (count < cells.length && avail * count / total > m.target * 1.45) count++;
    while (count > 1 && avail * count / total < m.target * 0.7) count--;
    // On a phone, keep at least two photographs per row so none is left alone
    // and stretched to fill the screen on its own.
    if (m.pairs && cells.length > 1) count = Math.min(count, Math.ceil(cells.length / 2));

    var rows = partition(cells, count, total / count);

    grid.innerHTML = rows.map(function (r) {
      var inner = avail - (r.items.length - 1) * m.gap;
      var h = Math.round(inner / r.sum);
      var justify = true;
      // A lone portrait photo would justify to an absurd height on a wide
      // screen; on a phone, full width is exactly what it should be.
      var cap = m.target * (m.pairs ? 2.2 : 1.5);
      if (r.items.length === 1 && h > cap) {
        h = Math.round(cap);
        justify = false;
      }
      var used = 0;

      var tiles = r.items.map(function (c, i) {
        var w = i === r.items.length - 1 && justify
          ? inner - used                       // last tile absorbs rounding
          : Math.round(c.aspect * h);
        used += w;
        return figure(c.item, c.n, w, h);
      }).join("");

      return '<div class="masonry-row" style="height:' + h + 'px">' + tiles + "</div>";
    }).join("");
  }

  function render(slug) {
    current = flatten(slug);
    layout();
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 160);
  });

  if (filterHost) {
    var buttons = [{ slug: "all", title: "All work" }].concat(GALLERY);
    filterHost.innerHTML = buttons.map(function (b) {
      return '<button class="filter" type="button" data-slug="' + b.slug + '">' + b.title + "</button>";
    }).join("");

    filterHost.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter");
      if (!btn) return;
      select(btn.dataset.slug);
      history.replaceState(null, "", btn.dataset.slug === "all" ? "#" : "#" + btn.dataset.slug);
    });
  }

  function select(slug) {
    if (filterHost) {
      filterHost.querySelectorAll(".filter").forEach(function (b) {
        b.classList.toggle("is-active", b.dataset.slug === slug);
      });
    }
    render(slug);
  }

  function isSlug(s) {
    return GALLERY.some(function (c) { return c.slug === s; });
  }

  /* Arriving from another page's category link, the grid filters itself but the
     page would otherwise open at the hero, with the filtered photographs out of
     sight — there is no element with the slug's id to scroll to. */
  function fromHash() {
    var h = location.hash.replace("#", "");
    var known = isSlug(h);
    select(known ? h : "all");
    if (known) scrollToGrid();
  }

  fromHash();

  /* Every category link on this page — the cards and the footer list — points at
     portfolio.html#slug, which is this same document. The browser would only
     change the hash and leave the page sitting where it is, so handle them here:
     filter the grid and scroll to it. Links on the other pages navigate as usual
     and are picked up by fromHash() once this page loads. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href*='#']");
    if (!a) return;
    var parts = a.getAttribute("href").split("#");
    if (!isSlug(parts[1])) return;
    // same document? (an empty path means a bare "#slug" link)
    if (parts[0] && parts[0] !== location.pathname.split("/").pop()) return;
    e.preventDefault();
    select(parts[1]);
    history.replaceState(null, "", "#" + parts[1]);
    scrollToGrid();
  });

  /* The grid changes height the moment it is filtered, and a smooth scroll that
     starts while the page is still settling gets cancelled part-way — leaving
     the visitor where they clicked, as though the link had done nothing. So land
     on the grid outright, and re-assert it once the new rows have settled. */
  function scrollToGrid() {
    var target = document.getElementById("all") || grid;
    var html = document.documentElement;

    function jump() {
      var prev = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, target.getBoundingClientRect().top + window.pageYOffset);
      html.style.scrollBehavior = prev;
    }

    jump();
    setTimeout(function () {
      if (Math.abs(target.getBoundingClientRect().top) > 4) jump();
    }, 250);
  }

  window.addEventListener("hashchange", fromHash);

  /* ---------------- lightbox ---------------- */
  var box = document.querySelector(".lightbox");
  if (!box) return;
  var bigImg = box.querySelector("img");
  var counter = box.querySelector(".lb-count");
  var index = 0;

  function show(i) {
    if (!current.length) return;
    index = (i + current.length) % current.length;
    bigImg.src = "img/full/" + current[index].file;
    bigImg.alt = "Teenooja — " + current[index].cat;
    counter.textContent = index + 1 + " / " + current.length;
  }

  function open(i) {
    show(i);
    box.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function close() {
    box.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  grid.addEventListener("click", function (e) {
    var fig = e.target.closest("figure");
    if (fig) open(Number(fig.dataset.i));
  });

  box.querySelector(".lb-close").addEventListener("click", close);
  box.querySelector(".lb-prev").addEventListener("click", function () { show(index - 1); });
  box.querySelector(".lb-next").addEventListener("click", function () { show(index + 1); });
  box.addEventListener("click", function (e) { if (e.target === box) close(); });

  document.addEventListener("keydown", function (e) {
    if (!box.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(index - 1);
    if (e.key === "ArrowRight") show(index + 1);
  });
})();
