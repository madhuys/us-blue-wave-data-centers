(function () {
  "use strict";

  var SOURCES = window.BLUEWAVE_SOURCES || {};
  var REGIMES = window.BLUEWAVE_REGIMES || {};
  var EQUITIES = window.BLUEWAVE_EQUITIES || [];

  var state = {
    regime: "base",
    bucketFilter: "all",
    sourceQuery: "",
    lastTrigger: null
  };

  if (window.ScrollCraft && typeof window.ScrollCraft.mount === "function") {
    window.ScrollCraft.mount(document.body);
  }

  var trackContainer = document.getElementById("queue-tracks");
  var kpiDefer = document.getElementById("rkpi-defer");
  var kpiGreenfield = document.getElementById("rkpi-greenfield");
  var kpiTariff = document.getElementById("rkpi-tariff");
  var regimeFoot = document.getElementById("regime-summary");
  var bannerTag = document.getElementById("synced-regime-tag");
  var t1Conv = document.getElementById("t1-conviction");
  var t1Note = document.getElementById("t1-regime-note");
  var t2Conv = document.getElementById("t2-conviction");
  var t2Note = document.getElementById("t2-regime-note");

  function enrichCitationsHtml(str) {
    return String(str).replace(/\[((?:s|c)\d+)\]/g, function (_, id) {
      if (!SOURCES[id]) return "[" + id + "]";
      return '<button type="button" class="cite-btn" data-cite="' + id + '" aria-label="View source ' + id + '">[' + id + "]</button>";
    });
  }

  function applyRegime(key) {
    var reg = REGIMES[key] || REGIMES.base;
    state.regime = reg.key;

    document.querySelectorAll("[data-regime-pick]").forEach(function (btn) {
      var active = btn.getAttribute("data-regime-pick") === reg.key;
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    if (kpiDefer) kpiDefer.textContent = reg.txGasDeferral;
    if (kpiGreenfield) kpiGreenfield.textContent = reg.greenfieldWait;
    if (kpiTariff) kpiTariff.textContent = reg.transmissionCost;
    if (regimeFoot) regimeFoot.innerHTML = enrichCitationsHtml(reg.summary);
    if (bannerTag) bannerTag.textContent = reg.shortTag;
    if (t1Conv) t1Conv.textContent = reg.trade1Conviction;
    if (t1Note) t1Note.textContent = reg.trade1Note;
    if (t2Conv) t2Conv.textContent = reg.trade2Conviction;
    if (t2Note) t2Note.textContent = reg.trade2Note;

    if (trackContainer) {
      trackContainer.innerHTML = reg.tracks.map(function (t) {
        var scale = Math.max(0.08, Math.min(1, t.months / t.max)).toFixed(3);
        return (
          '<div class="qtrack qtrack--' + t.kind + '" data-months="' + t.months + '">' +
            '<div class="qtrack__meta">' +
              '<span class="qtrack__name">' + t.name + " · " + t.months + " mos</span>" +
              '<span class="qtrack__tag">' + enrichCitationsHtml(t.tag) + "</span>" +
            "</div>" +
            '<div class="qtrack__rail">' +
              '<div class="qtrack__fill" style="--bar-scale:' + scale + '"></div>' +
              '<span class="qtrack__playhead" aria-hidden="true"></span>' +
            "</div>" +
          "</div>"
        );
      }).join("");
    }
    syncPeakScrub();
  }

  document.addEventListener("click", function (e) {
    var rBtn = e.target.closest("[data-regime-pick]");
    if (rBtn) {
      applyRegime(rBtn.getAttribute("data-regime-pick"));
      return;
    }
    var citeBtn = e.target.closest("[data-cite]");
    if (citeBtn) {
      openCitation(citeBtn.getAttribute("data-cite"), citeBtn);
      return;
    }
    var fBtn = e.target.closest("[data-bucket-filter]");
    if (fBtn) {
      state.bucketFilter = fBtn.getAttribute("data-bucket-filter");
      document.querySelectorAll("[data-bucket-filter]").forEach(function (b) {
        b.setAttribute("aria-pressed", b === fBtn ? "true" : "false");
      });
      renderEquities();
    }
  });

  var tbody = document.getElementById("equity-tbody");
  function renderEquities() {
    if (!tbody) return;
    var rows = EQUITIES.filter(function (item) {
      if (state.bucketFilter === "all") return true;
      if (state.bucketFilter === "reit") return item.bucket.indexOf("REIT") !== -1;
      if (state.bucketFilter === "grid") return item.bucket.indexOf("Grid") !== -1 || item.bucket.indexOf("Gear") !== -1 || item.bucket.indexOf("EPC") !== -1 || item.bucket.indexOf("Substation") !== -1;
      if (state.bucketFilter === "power") return item.bucket.indexOf("Utility") !== -1 || item.bucket.indexOf("Nuclear") !== -1 || item.bucket.indexOf("IPP") !== -1;
      return true;
    });
    tbody.innerHTML = rows.map(function (r) {
      return (
        "<tr>" +
          '<td class="td-ticker">' + r.ticker + "</td>" +
          "<td><strong>" + r.name + '</strong><br><small style="color:var(--sc-ink-soft)">' + r.bucket + "</small></td>" +
          '<td class="sc-nums">' + r.nov3 + "</td>" +
          '<td class="sc-nums"><strong>' + r.nov17 + "</strong></td>" +
          '<td class="sc-nums ' + (r.pos ? "td-pos" : "td-neg") + '">' + r.move + "</td>" +
          '<td class="sc-nums">' + r.cap + "</td>" +
          '<td class="sc-nums">' + r.mult + "</td>" +
          '<td class="td-proof">' + r.proof + ' <button type="button" class="cite-btn" data-cite="' + r.cite + '">[' + r.cite + "]</button></td>" +
        "</tr>"
      );
    }).join("");
  }

  var sourcesListEl = document.getElementById("sources-list");
  var sourceSearchInput = document.getElementById("source-search");
  var sourceCountLabels = document.querySelectorAll("[data-source-count]");
  var allSourceKeys = Object.keys(SOURCES);
  sourceCountLabels.forEach(function (el) {
    el.textContent = String(allSourceKeys.length);
  });

  function renderSources() {
    if (!sourcesListEl) return;
    var q = state.sourceQuery.trim().toLowerCase();
    var filtered = allSourceKeys.filter(function (k) {
      if (!q) return true;
      var s = SOURCES[k];
      return (
        s.id.toLowerCase().indexOf(q) !== -1 ||
        s.title.toLowerCase().indexOf(q) !== -1 ||
        s.publisher.toLowerCase().indexOf(q) !== -1 ||
        s.passage.toLowerCase().indexOf(q) !== -1
      );
    });
    sourcesListEl.innerHTML = filtered.map(function (k) {
      var s = SOURCES[k];
      return (
        '<article class="source-item" id="src-' + s.id + '">' +
          '<div class="source-item__top">' +
            "<span>[" + s.id + "] · " + s.domain + "</span>" +
            "<span>" + s.date + "</span>" +
          "</div>" +
          '<h3 class="source-item__title">' + s.title + "</h3>" +
          '<p class="source-item__pub">' + s.publisher + "</p>" +
          '<blockquote class="source-item__quote">"' + s.passage + '"</blockquote>' +
          '<a class="source-item__link" href="' + s.url + '" target="_blank" rel="noopener noreferrer">Go to source (' + s.domain + ")</a>" +
        "</article>"
      );
    }).join("");
  }

  if (sourceSearchInput) {
    sourceSearchInput.addEventListener("input", function () {
      state.sourceQuery = sourceSearchInput.value || "";
      renderSources();
    });
  }

  var popBackdrop = document.getElementById("cite-backdrop");
  var popHandle = document.getElementById("pop-handle");
  var popTitle = document.getElementById("pop-title");
  var popMeta = document.getElementById("pop-meta");
  var popPassage = document.getElementById("pop-passage");
  var popLink = document.getElementById("pop-link");
  var popClose = document.getElementById("pop-close");

  function openCitation(id, triggerEl) {
    var s = SOURCES[id];
    if (!s || !popBackdrop) return;
    state.lastTrigger = triggerEl || document.activeElement;
    popHandle.textContent = "[" + s.id + "] · VERBATIM SOURCE PASSAGE";
    popTitle.textContent = s.title;
    popMeta.textContent = s.publisher + " · " + s.domain + " · Published " + s.date;
    popPassage.textContent = '"' + s.passage + '"';
    popLink.href = s.url;
    popLink.textContent = "Go to source (" + s.domain + ")";
    popBackdrop.hidden = false;
    popClose.focus();
  }

  function closeCitation() {
    if (!popBackdrop || popBackdrop.hidden) return;
    popBackdrop.hidden = true;
    if (state.lastTrigger && typeof state.lastTrigger.focus === "function") {
      state.lastTrigger.focus();
    }
  }

  if (popClose) popClose.addEventListener("click", closeCitation);
  if (popBackdrop) {
    popBackdrop.addEventListener("click", function (e) {
      if (e.target === popBackdrop) closeCitation();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && popBackdrop && !popBackdrop.hidden) {
      closeCitation();
    }
  });

  var peakSection = document.getElementById("act-queue");
  var peakStage = document.getElementById("peak-stage");
  var clockReadout = document.getElementById("queue-clock-readout");
  var freqValue = document.getElementById("freq-readout");
  var railNodes = Array.prototype.slice.call(document.querySelectorAll(".rail-node[data-sec]"));
  var sectionEls = railNodes.map(function (n) {
    return document.getElementById(n.getAttribute("data-sec"));
  });

  function syncPeakScrub() {
    if (!peakSection) return;
    var rawP = parseFloat(getComputedStyle(peakSection).getPropertyValue("--sc-p")) || 0;
    var clampedP = Math.max(0, Math.min(1, rawP));
    var month = Math.round(clampedP * 84);
    var year = 2026 + Math.floor((10 + month) / 12);
    if (clockReadout) {
      clockReadout.textContent = "Scrub Clock: +" + month + " mos (" + year + ")";
    }
    if (trackContainer) {
      var rails = trackContainer.querySelectorAll(".qtrack__rail");
      rails.forEach(function (r) {
        var w = r.clientWidth || 320;
        var px = Math.round(clampedP * (w - 2));
        r.style.setProperty("--playhead-px", px + "px");
      });
    }
    if (peakStage) {
      peakStage.setAttribute("data-sc-verify-state", state.regime + ":m" + month);
    }
    if (freqValue) {
      var sag = (clampedP > 0.05 && clampedP < 0.95) ? (60.0 - Math.sin(clampedP * Math.PI) * 0.06) : 60.0;
      freqValue.textContent = sag.toFixed(2) + " Hz";
    }
  }

  function syncBottomRail() {
    var mid = window.innerHeight * 0.48;
    var activeIdx = 0;
    sectionEls.forEach(function (sec, idx) {
      if (!sec) return;
      var rect = sec.getBoundingClientRect();
      if (rect.top <= mid) activeIdx = idx;
    });
    railNodes.forEach(function (node, idx) {
      node.classList.toggle("is-passed", idx < activeIdx);
      node.classList.toggle("is-active", idx === activeIdx);
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      syncPeakScrub();
      syncBottomRail();
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  var heroSection = document.getElementById("act-hero");
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (heroSection && finePointer && !reducedMotion) {
    var heroVisible = true;
    var targetX = 0, currX = 0, ptrRaf = 0;
    var io = new IntersectionObserver(function (entries) {
      heroVisible = entries[0] ? entries[0].isIntersecting : false;
    });
    io.observe(heroSection);

    function stepPtr() {
      currX += (targetX - currX) * 0.12;
      heroSection.style.setProperty("--ptr-x", currX.toFixed(4));
      if (Math.abs(targetX - currX) > 0.002 && heroVisible) {
        ptrRaf = requestAnimationFrame(stepPtr);
      } else {
        ptrRaf = 0;
      }
    }
    heroSection.addEventListener("pointermove", function (e) {
      if (!heroVisible) return;
      targetX = (e.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      if (!ptrRaf) ptrRaf = requestAnimationFrame(stepPtr);
    }, { passive: true });
  }

  document.addEventListener("focusin", function (e) {
    var cueEl = e.target.closest("[data-sc-cue]");
    var actEl = e.target.closest("[data-sc-act='pin']");
    if (cueEl && actEl) {
      var parts = (cueEl.getAttribute("data-sc-cue") || "0 1").trim().split(/\s+/).map(Number);
      var from = parts[0] || 0;
      var to = parts.length > 1 && !isNaN(parts[1]) ? parts[1] : 1;
      var targetP = (from + to) * 0.5;
      var rect = actEl.getBoundingClientRect();
      var actTop = window.scrollY + rect.top;
      var travel = Math.max(actEl.offsetHeight - window.innerHeight, 1);
      var currentP = (window.scrollY - actTop) / travel;
      if (currentP < from + 0.04 || currentP > to - 0.04) {
        window.scrollTo({ top: Math.round(actTop + travel * targetP), behavior: "instant" });
      }
    }
  });

  function buildMemoMarkdown() {
    var reg = REGIMES[state.regime] || REGIMES.base;
    return [
      "# US Blue Wave & Data Center Rollout: Institutional Trade Blotter",
      "Generated: 2026-11-18 | Active Policy Scenario: " + reg.label,
      "",
      "## 1. Scenario Parameters",
      "- 2028 TX Data Center Gas Demand Deferral: " + reg.txGasDeferral + " (East Daley Nov 17, 2026)",
      "- Unpermitted Greenfield Queue Horizon: " + reg.greenfieldWait + " (WoodMac / LBNL Queued Up 2026)",
      "- Transmission & Cost Firewall: " + reg.transmissionCost,
      "",
      "## 2. Trade Idea 01: Dollar-Neutral Pair (Long EQIX / Short GEV)",
      "- Long Leg: Equinix, Inc. (EQIX) @ $1,044.63 (Nov 17 close, +2.98% post-election, $102.44B cap, 23.79x FY26E P/AFFO midpoint)",
      "- Short Leg: GE Vernova Inc. (GEV) @ $779.91 (Nov 17 close, -15.06% post-election, $206.42B cap, ~38.0x Fwd P/E; Hard Stop > $929.77)",
      "- Post-Election Spread (Nov 3 to Nov 17, 2026): +18.04 percentage points",
      "- Active Scenario Readout (" + reg.trade1Conviction + "): " + reg.trade1Note,
      "",
      "## 3. Trade Idea 02: Directional Compounder (Long NEE; Optional Short VST Hedge)",
      "- Long Leg: NextEra Energy, Inc. (NEE) @ $84.42 (Nov 17 close, 21.26x FY26E P/E at $3.97 midpoint, 2.45% dividend yield)",
      "- Optional Merchant Hedge: Short Vistra Corp. (VST) @ $127.97 (-8.32% post-election, $45.14B cap, ~25 GW gas fleet)",
      "- Ratepayer & Backlog Proof: FPL residential bills 37% below US average (+2%/yr through 2030); NEER 36.7 GW backlog (+3.7 GW in Q3, 2.4 GW battery storage)",
      "- Active Scenario Readout (" + reg.trade2Conviction + "): " + reg.trade2Note,
      "",
      "## 4. Key Catalysts & Primary Links",
      "- Dec 10, 2026: ERCOT / PUCT Texas Data Center Audit release (" + SOURCES.s78000.url + ")",
      "- Nov to Dec 2026: Lame-Duck Senate/House floor action on S. 5653 BAAJA (" + SOURCES.s79290.url + ")",
      "- Jan 19, 2027: Texas Gov.-elect Gina Hinojosa inauguration & executive moratorium decision (" + SOURCES.s78001.url + ")",
      "- Ballotpedia 40-of-41 Local Ballot Report: " + SOURCES.s78156.url
    ].join("\n");
  }

  var downloadBtn = document.getElementById("btn-download-memo");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      var md = buildMemoMarkdown();
      var blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "blue-wave-datacenter-trades-" + state.regime + ".md";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
      downloadBtn.textContent = "Downloaded Memo (" + state.regime.toUpperCase() + ")";
      setTimeout(function () { downloadBtn.textContent = "Download Scenario Memo (.md)"; }, 2600);
    });
  }

  var copyBtn = document.getElementById("btn-copy-blotter");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var text = buildMemoMarkdown();
      function markCopied() {
        copyBtn.textContent = "Copied Blotter Ticket";
        setTimeout(function () { copyBtn.textContent = "Copy Blotter Ticket"; }, 2400);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(markCopied).catch(function () {
          fallbackCopy(text);
          markCopied();
        });
      } else {
        fallbackCopy(text);
        markCopied();
      }
    });
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (_) {}
    document.body.removeChild(ta);
  }

  applyRegime("base");
  renderEquities();
  renderSources();
  syncPeakScrub();
  syncBottomRail();
})();
