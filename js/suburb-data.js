/* Why Move to Dallas: shared suburb DATA STRIP renderer (single source of truth).
 *
 * Paints the #kc-data-strip region on every suburb page from the live
 * suburb-profiles.json: Family Score + Affordability Score (with meter fills),
 * the five sub-score bars (Education / Safety / Family & Community / Commute /
 * Market Stability), the Niche.com city-grade chips, and the grades date.
 *
 * Why this exists: each suburb page used to carry its own inline copy of this
 * logic, and ~33 of them drifted to an older version that read an obsolete JSON
 * shape and failed to paint the chips + sub-scores. This file is now the ONE
 * authority for the data strip. It identifies the suburb from the page URL
 * (/[slug]-texas -> data key) and re-asserts its values via a MutationObserver,
 * so it deterministically wins over any leftover inline renderer regardless of
 * fetch timing. It touches ONLY #kc-data-strip, nothing else on the page.
 *
 * Injected on every page containing #kc-data-strip by build.js. On fetch
 * failure it silently leaves whatever the page already shows.
 */
(function () {
  var DATA_URL = 'https://raw.githubusercontent.com/whymovetodallas/whymovetodallas-data/main/suburb-profiles.json';

  function suburbKey() {
    var seg = (location.pathname || '').replace(/^\/+|\/+$/g, '').split('/').pop() || '';
    return seg.replace(/-texas$/, '');
  }

  var GRADE_ORDER = ['overall', 'families', 'public_schools', 'crime', 'housing', 'jobs', 'diversity', 'cost_of_living', 'health_fitness', 'outdoor_activities', 'nightlife', 'weather', 'commute'];
  var GRADE_NAMES = { overall: 'Overall', families: 'Families', public_schools: 'Schools', crime: 'Crime & Safety', housing: 'Housing', jobs: 'Jobs', diversity: 'Diversity', cost_of_living: 'Cost of Living', health_fitness: 'Health', outdoor_activities: 'Outdoors', nightlife: 'Nightlife', weather: 'Weather', commute: 'Commute' };
  var SS_ORDER = ['education', 'safety', 'family_community', 'commute', 'market_stability'];
  var SS_NAMES = { education: 'Education', safety: 'Safety', family_community: 'Family & Community', commute: 'Commute', market_stability: 'Market Stability' };

  function chipsHtml(ncity) {
    var html = '';
    GRADE_ORDER.forEach(function (k) {
      var g = ncity[k];
      if (!g) return;
      var c = g.charAt(0) === 'A' ? 'gA' : g.charAt(0) === 'B' ? 'gB' : g.charAt(0) === 'C' ? 'gC' : 'gD';
      html += '<span class="kc-grade-chip"><span class="kc-grade-chip-label">' + GRADE_NAMES[k] + '</span><span class="kc-grade-chip-val ' + c + '">' + g + '</span></span>';
    });
    return html;
  }

  function subscoresHtml(sub) {
    var html = '';
    SS_ORDER.forEach(function (k) {
      var v = sub[k];
      var disp = (v != null) ? v : '-';
      var pct = (v != null) ? v : 0;
      html += '<div class="kc-subscore-item">';
      html += '<div class="kc-subscore-item-label">' + SS_NAMES[k] + '</div>';
      html += '<div class="kc-subscore-item-track"><div class="kc-subscore-item-fill" style="width:' + pct + '%"></div></div>';
      html += '<span class="kc-subscore-item-val">' + disp + '</span>';
      html += '</div>';
    });
    return html;
  }

  function gradesDate(ncity) {
    return ncity.scraped_date ? ncity.scraped_date.slice(0, 7).replace('-', '/') : null;
  }

  function render(suburb) {
    var strip = document.getElementById('kc-data-strip');
    if (!strip) return;
    var sc = suburb.scores || {};
    var sub = sc.sub_scores || {};
    var ncity = suburb.niche_city || {};

    // ── Family / Affordability scores + meter fills ──────────────────────────
    var fsEl = document.getElementById('kc-family-score');
    if (fsEl && sc.family_score != null) {
      if (fsEl.textContent != sc.family_score) fsEl.textContent = sc.family_score;
      var fsFill = document.getElementById('kc-family-score-fill');
      if (fsFill) { var w = sc.family_score + '%'; if (fsFill.style.width !== w) fsFill.style.width = w; }
    }
    var vsEl = document.getElementById('kc-value-score');
    if (vsEl && sc.value_score != null) {
      if (vsEl.textContent != sc.value_score) vsEl.textContent = sc.value_score;
      var vsFill = document.getElementById('kc-value-score-fill');
      if (vsFill) { var w2 = sc.value_score + '%'; if (vsFill.style.width !== w2) vsFill.style.width = w2; }
    }

    // ── Sub-score bars ───────────────────────────────────────────────────────
    var ssEl = document.getElementById('kc-data-subscores');
    if (ssEl && sc.sub_scores) {
      var ssWant = subscoresHtml(sub);
      if (ssEl.innerHTML !== ssWant) ssEl.innerHTML = ssWant;
    }

    // ── Niche grade chips + date ─────────────────────────────────────────────
    var chipsEl = document.getElementById('kc-grade-chips');
    if (chipsEl) {
      var chWant = chipsHtml(ncity);
      if (chWant && chipsEl.innerHTML !== chWant) chipsEl.innerHTML = chWant;
    }
    var dt = gradesDate(ncity);
    var dEl = document.getElementById('kc-grades-date');
    if (dEl && dt && dEl.textContent !== dt) dEl.textContent = dt;
  }

  function start(suburb) {
    render(suburb);
    // Re-assert ownership: if a leftover inline renderer overwrites the strip
    // after us (fetch-timing race), put the correct values back. The idempotent
    // guards above mean no mutation loop. Stop watching after a few seconds.
    var strip = document.getElementById('kc-data-strip');
    if (!strip || typeof MutationObserver === 'undefined') return;
    var obs = new MutationObserver(function () { render(suburb); });
    obs.observe(strip, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style'] });
    setTimeout(function () { obs.disconnect(); }, 8000);
  }

  function run() {
    if (!window.fetch || !document.getElementById('kc-data-strip')) return;
    var key = suburbKey();
    if (!key) return;
    fetch(DATA_URL, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        var suburb = data && data.suburbs && data.suburbs[key];
        if (suburb) start(suburb);
      })
      .catch(function () { /* keep existing values */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
