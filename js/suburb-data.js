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


/* ---------------------------------------------------------------------------
 * PART 2: the rest of the live-data layer (stats bar, census, walkability,
 * market + condo cards, comparison table, amenity narratives, city footprint).
 * Ported from the Flower Mound gold page. Identifies the suburb from the URL and
 * the comparison list from window.KC_SUBURB.compare (injected by build.js). The
 * data strip is owned by PART 1 above; this part omits it. Every write is
 * element-id-guarded (missing sections are skipped) and the handler re-applies a
 * few times so the canonical gold output wins over each page's legacy inline
 * renderer regardless of fetch timing.
 * --------------------------------------------------------------------------- */
(function kcRenderSuburbSections() {
  // ── CONFIG ─────────────────────────────────────────────────────────────────
  var DATA_URL    = 'https://raw.githubusercontent.com/whymovetodallas/whymovetodallas-data/main/suburb-profiles.json';
  var SUBURB_KEY=((location.pathname||'').replace(/^\/+|\/+$/g,'').split('/').pop()||'').replace(/-texas$/,'');
  var _CFG=window.KC_SUBURB||{};
  var SUBURB_NAME=_CFG.name||null;
  var COMPARE_SUBURBS=Array.isArray(_CFG.compare)?_CFG.compare:[];

  // ── Helpers ────────────────────────────────────────────────────────────────
  function fmtPrice(val) {
    if (!val) return null;
    if (val >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M';
    return '$' + Math.round(val / 1000) + 'K';
  }
  function fmtPop(val) {
    if (!val) return null;
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return Math.round(val / 1000) + 'K';
    return val.toLocaleString();
  }
  function fmtCurrency(val) {
    if (!val) return null;
    return '$' + Math.round(val / 1000) + 'K';
  }
  function msiLabel(msi) {
    if (msi == null) return 'Balanced market';
    if (msi < 3)   return "Seller's market";
    if (msi <= 6)  return 'Balanced market';
    return "Buyer's market";
  }
  function setText(id, val) {
    var el = document.getElementById(id);
    if (el && val != null && el.textContent != val) el.textContent = val;
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  if (!window.fetch) return;

  fetch(DATA_URL, { cache: 'no-cache' })
    .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(data) {
      function _apply() {
      var suburb = data && data.suburbs && data.suburbs[SUBURB_KEY];
      if (!suburb) return;
        if(!SUBURB_NAME) SUBURB_NAME=suburb.display_name||'This suburb';

      var mkt   = suburb.market      || {};
      var walk  = suburb.walkability || {};
      var demo  = suburb.demographics || {};
      var meta  = data._meta          || {};

      var updated = meta.last_updated
        ? new Date(meta.last_updated).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : '';
      var dataDate = updated || 'Recent';

      // ── Stats bar ─────────────────────────────────────────────────────────
      // Population
      if (demo.population) {
        setText('kc-stat-pop', fmtPop(demo.population));
        setText('kc-stat-pop-note', 'ACS 2023 5-yr est. · current ~80K+');
      }
      // Median SFR price
      if (mkt.sfr_median_price) {
        setText('kc-stat-price', fmtPrice(mkt.sfr_median_price));
        setText('kc-stat-price-note', 'See live listings ↗ · NTREIS' + (updated ? ' · ' + updated : ''));
      }

      // ── Census community snapshot ─────────────────────────────────────────
      if (demo.median_household_income) setText('kc-census-income', fmtCurrency(demo.median_household_income));
      if (demo.pct_households_with_children != null) setText('kc-census-kids', Math.round(demo.pct_households_with_children) + '%');
      if (demo.median_age != null)                    setText('kc-census-age',  demo.median_age.toFixed(0) + ' yrs');
      if (demo.owner_occupied_pct != null)           setText('kc-census-own',  Math.round(demo.owner_occupied_pct) + '%');
      if (demo.bachelors_plus_pct != null)            setText('kc-census-edu',  Math.round(demo.bachelors_plus_pct) + '%');
      if (demo.wfh_pct != null)                       setText('kc-census-wfh',  Math.round(demo.wfh_pct) + '%');
      if (demo.median_commute_min != null)             setText('kc-census-commute', Math.round(demo.median_commute_min) + ' min');

      // ── Walkability scores ────────────────────────────────────────────────
      if (walk.walk_score != null) setText('kc-ws-walk', walk.walk_score);
      if (walk.bike_score != null) setText('kc-ws-bike', walk.bike_score);
      // Transit: show N/A if null (Frisco has no transit data)
      setText('kc-ws-transit', walk.transit_score != null ? walk.transit_score : 'N/A');
      // Walk Score attribution link with UTM params from data
      if (walk.ws_link) {
        var wsLinkEl = document.getElementById('kc-ws-link');
        if (wsLinkEl) wsLinkEl.href = walk.ws_link;
      }

      // ── Real estate market cards ──────────────────────────────────────────
      if (mkt.sfr_median_price) {
        setText('kc-mkt-price', '$' + Math.round(mkt.sfr_median_price).toLocaleString());
        setText('kc-mkt-price-sub', '12-month rolling avg · single-family · ' + dataDate);
      }
      if (mkt.sfr_days_on_market != null) {
        setText('kc-mkt-dom', Math.round(mkt.sfr_days_on_market) + ' days');
        setText('kc-mkt-dom-sub', '12-month rolling avg · median · ' + dataDate);
      }
      if (mkt.sfr_months_supply != null) {
        setText('kc-mkt-msi', mkt.sfr_months_supply.toFixed(1) + ' mo.');
        var condition = mkt.market_condition
          ? mkt.market_condition.charAt(0).toUpperCase() + mkt.market_condition.slice(0) + " market"
          : msiLabel(mkt.sfr_months_supply);
        setText('kc-mkt-msi-sub', msiLabel(mkt.sfr_months_supply) + ' · 12-month calculation · ' + dataDate);
      }
      if (mkt.sfr_closed_sales_12mo != null) {
        setText('kc-mkt-cs', mkt.sfr_closed_sales_12mo.toLocaleString());
        setText('kc-mkt-cs-sub', '12-month total · single-family · ' + dataDate);
      }
      setText('kc-mkt-updated', dataDate);

      // ── Condo / Townhome market section ──────────────────────────────────
      var condoSales = mkt.condo_closed_sales_12mo;
      var condoPrice = mkt.condo_median_price;
      var condoDom   = mkt.condo_days_on_market;
      var condoMsi   = mkt.condo_months_supply;
      var condoEl    = document.getElementById('kc-condo-market');
      if (condoEl) {
        condoEl.style.display = '';
        if (condoSales != null && condoSales > 0) {
          var condoCards = document.getElementById('kc-condo-cards');
          if (condoCards) condoCards.style.display = '';
        if (condoPrice)  setText('kc-condo-price', '$' + Math.round(condoPrice).toLocaleString());
        if (condoDom != null) setText('kc-condo-dom', Math.round(condoDom) + ' days');
        if (condoMsi != null) {
          setText('kc-condo-msi', condoMsi.toFixed(1) + ' mo.');
          setText('kc-condo-msi-sub', msiLabel(condoMsi) + ' · 12-month');
        }
        setText('kc-condo-cs', condoSales.toLocaleString());
        setText('kc-condo-updated', dataDate);
        if (condoPrice && mkt.sfr_median_price) {
          var condoDiff = Math.round((1 - condoPrice / mkt.sfr_median_price) * 100);
          setText('kc-condo-price-sub', 'Condo / Townhome · ' + (condoDiff > 0 ? condoDiff + '% below SFR median' : Math.abs(condoDiff) + '% above SFR median'));
        }
        if (condoSales < 5) { var tw = document.getElementById('kc-condo-thin-warning'); if (tw) tw.style.display = ''; }
        var cc = document.getElementById('kc-condo-callout');
        if (cc && condoPrice && mkt.sfr_median_price) {
          var cdiff = Math.round((1 - condoPrice / mkt.sfr_median_price) * 100);
          var sfrF = '$' + Math.round(mkt.sfr_median_price / 1000) + 'K', condoF = '$' + Math.round(condoPrice / 1000) + 'K';
          cc.innerHTML = condoSales < 5
            ? '<strong>A note on condo data here:</strong> With only ' + condoSales + ' sale' + (condoSales === 1 ? '' : 's') + ' recorded in the past 12 months, the condo/townhome market here is extremely thin. The median figure (' + condoF + ') is not statistically reliable, a single high-end or atypical sale can move it dramatically. If a condo or townhome is what you\'re looking for, a neighboring suburb with a more active market will give you a much better picture of what to expect.'
            : cdiff > 0
              ? '<strong>Condos as an entry point:</strong> If single-family homes at ' + sfrF + ' are outside your current budget, the condo and townhome market here offers a real alternative at a median of ' + condoF + ', roughly ' + cdiff + '% less. That said, condo ownership in DFW typically comes with HOA fees ranging from $200 to $600+/month, which can offset a meaningful portion of the mortgage payment difference. Always run the full monthly payment comparison (PITI + HOA) before assuming a condo is the cheaper option. For some buyers the math works in their favor, for others, the monthly difference is smaller than the sticker prices suggest.'
              : '<strong>Condo pricing note:</strong> The condo and townhome data for this suburb shows a median of ' + condoF + ', which is actually above the single-family median of ' + sfrF + '. This is most likely driven by a small number of high-end or atypical sales rather than a true market trend. Single-family homes remain the dominant and better-priced product type here.';
        }
        } else {
          var noSalesEl = document.getElementById('kc-condo-no-sales');
          if (noSalesEl) noSalesEl.style.display = '';
        }
      }

      // ═══ INJECTED: scores, grade chips, sub-scores, comparison ════════════

      // ── Crime grade badge ────────────────────────────────────────────────
      var crimeData = suburb.crime || {};
      if (crimeData.niche_crime_grade) setText('kc-crime-grade', crimeData.niche_crime_grade);

      // ── Comparison table ─────────────────────────────────────────────────
      var cmpEl = document.getElementById('kc-compare-table');
      if (cmpEl && data.suburbs) {
        var cmpKeys = [SUBURB_KEY];
        COMPARE_SUBURBS.forEach(function(k) { if (k !== SUBURB_KEY) cmpKeys.push(k); });
        var tbl = '<table class="kc-compare-tbl"><thead><tr>';
        tbl += '<th>Suburb</th><th>Family Score</th><th>Affordability Score</th><th>Schools</th><th>Crime</th><th>Families</th><th>Median Price</th>';
        tbl += '</tr></thead><tbody>';
        cmpKeys.forEach(function(k) {
          var s = data.suburbs[k]; if (!s) return;
          var isCur = k === SUBURB_KEY;
          tbl += '<tr' + (isCur ? ' class=\"kc-compare-current\"' : '') + '>';
          tbl += '<td>' + (s.display_name || k) + '</td>';
          tbl += '<td>' + (s.scores && s.scores.family_score != null ? s.scores.family_score : '-') + '</td>';
          tbl += '<td>' + (s.scores && s.scores.value_score  != null ? s.scores.value_score  : '-') + '</td>';
          tbl += '<td>' + (s.schools  && (s.schools.overall_grade  || s.schools.niche_city_schools_grade) || '-') + '</td>';
          tbl += '<td>' + (s.crime    && s.crime.niche_crime_grade  || '-') + '</td>';
          tbl += '<td>' + (s.niche_city && s.niche_city.families   || '-') + '</td>';
          tbl += '<td>' + (s.market   && s.market.sfr_median_price ? fmtPrice(s.market.sfr_median_price) : '-') + '</td>';
          tbl += '</tr>';
        });
        tbl += '</tbody></table>';
        if (cmpEl.innerHTML !== tbl) cmpEl.innerHTML = tbl;
      }
      if (updated) setText('kc-compare-date', updated);

      // ── Amenity rank narratives ────────────────────────────────────────────
      var ranks = (suburb.scores && suburb.scores.amenity_ranks) || null;
      if (ranks) {
        var _n = SUBURB_NAME || 'This suburb';
        function _vi(rank, mod) { return (rank && mod) ? Math.abs(rank) % mod : 0; }
        function kcParksNarr(rank, pct, count, total) {
          if (!rank || !total) return null;
          var rStr  = '<strong>#' + rank + ' of ' + total + '</strong> DFW suburbs';
          var cNote = count ? ', ' + count + ' parks and green spaces mapped within city limits' : '';
          var v = _vi(rank, 4);
          if (rank === 1) return 'No suburb in DFW packs in more park space per resident. ' + _n + ' ranks ' + rStr + ' for parks per capita' + cNote + '. Trails, playgrounds, and open fields are woven into nearly every neighborhood, for families, that\'s a meaningful day-to-day quality-of-life win.';
          if (pct >= 90) { var o = ['Park access is one of ' + _n + '\'s real strengths, ' + rStr + ' for green space per resident (top ' + pct + '%)' + cNote + '. Trails, playgrounds, and sports fields are never far from home.', _n + ' ranks ' + rStr + ' for parks per resident, landing in the top ' + pct + '% of DFW suburbs' + cNote + '. Outdoor options are a short walk or bike ride away rather than a planned outing.', 'With ' + rStr + ' for parks per capita (top ' + pct + '%)' + cNote + ', ' + _n + ' punches well above its weight on outdoor access. Kids sports, trail runs, and weekend picnics rarely require leaving the city.']; return o[v % 3]; }
          if (pct >= 75) { var o = [_n + ' ranks ' + rStr + ' for parks per resident, top ' + pct + '% in DFW' + cNote + '. Green space is well-distributed across the city, which matters when you\'re picking a neighborhood and want a park within reach of home.', 'For a suburb its size, ' + _n + ' offers strong park coverage: ' + rStr + ' per capita (top ' + pct + '%)' + cNote + '. Most neighborhoods have trail access or a community park nearby.', 'Green space is a genuine asset here, ' + rStr + ' for parks per resident, top ' + pct + '% of DFW' + cNote + '. Weekend outdoor activities and youth sports don\'t require driving to another city.', 'Ranking ' + rStr + ' for parks per capita (top ' + pct + '%)' + cNote + ', ' + _n + ' gives families solid access to trails, playgrounds, and recreation areas without having to plan around it.']; return o[v % 4]; }
          if (pct >= 50) { var o = [_n + ' lands ' + rStr + ' for parks per resident (top ' + pct + '%)' + cNote + '. The major parks and trail systems cover most of the city, weekend outdoor options are available, though a short drive is usually part of the trip.', 'Park access is mid-range for DFW: ' + rStr + ' per capita (top ' + pct + '%)' + cNote + '. The larger parks and trail corridors are well-used; not every neighborhood has green space within walking distance.', 'Ranking ' + rStr + ' for parks per resident (top ' + pct + '%)' + cNote + ', ' + _n + ' has the essentials covered, community parks, youth sports fields, trail access, though distribution across neighborhoods varies.']; return o[v % 3]; }
          var o = [_n + ' ranks ' + rStr + ' for parks per resident' + cNote + '. Green space exists but is less evenly distributed than higher-ranked suburbs, most park visits involve a short drive rather than a walk from home.', 'Park density is on the lower end for DFW: ' + rStr + ' per capita' + cNote + '. The parks that exist are well-maintained, but families looking for walkable trail access will find the options thinner than in neighboring suburbs.', 'Ranking ' + rStr + ' for parks per resident' + cNote + ', ' + _n + ' is still building out its recreation infrastructure. Worth checking specific neighborhood proximity to parks before picking a street.']; return o[v % 3];
        }
        function kcDiningShopNarr(rRank, rPct, rTotal, sRank, sPct, sTotal, rCount, sCount, pop, density, sqmi) {
          var hasR = rRank && rTotal; var hasS = sRank && sTotal;
          if (!hasR && !hasS) return null;
          var rStr = hasR ? '<strong>#' + rRank + ' of ' + rTotal + '</strong>' : null;
          var sStr = hasS ? '<strong>#' + sRank + ' of ' + sTotal + '</strong>' : null;
          var v = _vi(rRank || sRank, 5);
          // ── Large city: geographic spread, not limited options ─────────────
          if (pop > 150000) {
            var popK = Math.round(pop / 1000); var sqmiTxt = sqmi ? sqmi + ' sq miles' : ''; var densDesc = density ? density.toLocaleString() + ' residents per sq mile' : ''; var scaleCtx = sqmiTxt && densDesc ? sqmiTxt + ' at ' + densDesc : (sqmiTxt || densDesc); var rCStr = rCount ? rCount.toLocaleString() + ' restaurants' : 'hundreds of dining options'; var sCStr = sCount ? sCount.toLocaleString() + ' retail locations' : 'extensive retail';
            var o = ['Per-capita rankings reflect geographic spread, not limited options. ' + _n + ' ranks ' + rStr + ' for restaurants and ' + sStr + ' for retail per resident, mid-range numbers for a city of ' + popK + 'K' + (sqmiTxt ? ' covering ' + sqmiTxt : '') + '. In practice that means ' + rCStr + ' and ' + sCStr + ' distributed across neighborhoods, with concentrations near major corridors.', 'With ' + popK + 'K residents' + (scaleCtx ? ' across ' + scaleCtx : '') + ', ' + _n + "'s per-capita rankings (" + rStr + ' for dining, ' + sStr + ' for retail) reflect how spread out commercial areas are, not a shortage. Families typically have solid options within a 5-10 minute drive of wherever they live.', _n + ' covers ' + (sqmiTxt || 'a large area') + ', so dining and retail are distributed by neighborhood rather than concentrated downtown. The city ranks ' + rStr + ' for restaurants and ' + sStr + ' for shopping per resident, solid numbers given the scale.'];
            return o[v % 3];
          }
          var isSpread = density && density < 1500;
          if (hasR && hasS) {
            if (rPct >= 75 && sPct >= 75) { var o = ['Day-to-day errands and dining out are well-covered: ' + _n + ' ranks ' + rStr + ' for restaurants and ' + sStr + ' for retail per resident. Most families handle groceries, weeknight dinners, and everyday shopping without leaving the city.', 'Dining and retail are two of ' + _n + '\'s practical strengths, ' + rStr + ' for restaurants and ' + sStr + ' for shopping per capita. Residents rarely need to drive to a neighboring city for everyday needs.', _n + ' ranks ' + rStr + ' for dining and ' + sStr + ' for retail per resident. Weeknight dinner variety is real, and the shopping infrastructure handles the full range of family errands.']; return o[v % 3]; }
            if (rPct >= 50 && sPct >= 50) { var o = ['On the practical side, ' + _n + ' ranks ' + rStr + ' for restaurants and ' + sStr + ' for retail per resident. The everyday staples are well-covered; specialty dining and stores are a short drive away.', 'Dining and shopping cover daily family life comfortably, ' + rStr + ' for restaurants and ' + sStr + ' for retail per resident. Most weeknight needs stay local; a larger mall or specialty grocer may mean a quick trip out.', _n + ' lands ' + rStr + ' for dining and ' + sStr + ' for retail per capita, solidly mid-range for DFW, with the usual suburban mix of chain restaurants and major retailers within easy reach.']; return o[v % 3]; }

            if (rPct < 50 && sPct < 50) { if (isSpread) { var densDesc = density ? Math.round(density).toLocaleString() + ' residents per sq mile' : 'lower density'; var sqmiDesc = sqmi ? sqmi + ' sq miles' : 'a larger footprint'; var o = [_n + ' is a lower-density suburb (' + densDesc + '), and its commercial footprint reflects that, ' + rStr + ' for restaurants and ' + sStr + ' for retail per resident. The essentials are covered locally; families typically drive 10 to 15 minutes for more variety.', 'At ' + sqmiDesc + ' with a ' + densDesc + ' character, ' + _n + ' spreads development across a larger area than the per-capita numbers suggest. It ranks ' + rStr + ' for dining and ' + sStr + " for retail, expect the basics locally, with neighboring cities filling the gaps.", "Lower residential density means commercial development follows a more spread-out pattern in " + _n + ", " + rStr + " for restaurants and " + sStr + " for retail per resident. What's here covers daily needs; specialty dining and larger retailers are a short drive away."]; return o[v % 3]; } var o = [_n + ' ranks ' + rStr + ' for restaurants and ' + sStr + ' for retail per resident, both on the lower end for DFW. Families here regularly drive to neighboring cities for dining variety and bigger shopping options.', 'Dining and retail are still catching up to population growth: ' + rStr + ' for restaurants and ' + sStr + ' for shopping per capita. Essentials are covered locally; expect to drive for variety, a common tradeoff in newer suburbs where commercial development trails residential.', 'As a fast-growing suburb, ' + _n + ' is still building out its commercial base, ' + rStr + ' for dining and ' + sStr + ' for retail per resident. Families get the basics locally; a neighboring city covers the rest.']; return o[v % 3]; }
            if (rPct >= sPct) { var o = [_n + ' ranks ' + rStr + ' for restaurants per resident, decent weeknight dining variety without leaving the city, but comes in at ' + sStr + ' for retail, so bigger shopping trips mean heading elsewhere.', 'The dining scene holds up well at ' + rStr + ' per resident, but retail is thinner at ' + sStr + ' per capita. Families eat local more than they shop local.']; return o[v % 2]; }
            var o = ['Retail is the stronger suit: ' + _n + ' ranks ' + sStr + ' for shopping per resident, though the restaurant scene comes in at ' + rStr + ' per capita. Grocery runs and errands stay local; weekend dinner variety usually means a drive.', _n + ' is better positioned for errands than eating out, ' + sStr + ' for retail vs. ' + rStr + ' for restaurants per resident. Shopping infrastructure covers family needs well; the dining selection is more limited.']; return o[v % 2];
          }
          if (hasR) return _n + ' ranks ' + rStr + ' for restaurants per resident (top ' + rPct + '% of DFW suburbs). ' + (rPct >= 50 ? 'Weeknight dining variety is solid for a suburb its size.' : 'Options cover the basics, more variety is a short drive away.');
          return _n + ' ranks ' + sStr + ' for retail per resident (top ' + sPct + '% of DFW suburbs). ' + (sPct >= 50 ? 'Day-to-day shopping and errands are well-covered locally.' : 'Essential retail is in place; specialty stores usually mean a quick trip out.');
        }
        var parksNarr = kcParksNarr(ranks.parks_rank, ranks.parks_percentile, ranks.parks_count, ranks.parks_total_suburbs);
        var dsNarr    = kcDiningShopNarr(ranks.restaurants_rank, ranks.restaurants_percentile, ranks.restaurants_total_suburbs, ranks.shopping_rank, ranks.shopping_percentile, ranks.shopping_total_suburbs, ranks.restaurants_count, ranks.shopping_count, demo.population || 0, demo.pop_density || null, demo.land_area_sqmi || null);
        var pBanner = document.getElementById('kc-amenity-parks-rank');
        if (pBanner && parksNarr) { pBanner.innerHTML = parksNarr; pBanner.style.display = 'block'; }
        var dsBanner = document.getElementById('kc-amenity-dining-shop-rank');
        if (dsBanner && dsNarr) { dsBanner.innerHTML = dsNarr; dsBanner.style.display = 'block'; }

        // ── City footprint context (recreation section) ───────────────────────
        var fpEl = document.getElementById('kc-city-footprint');
        if (fpEl && (demo.land_area_sqmi || demo.pop_density)) {
          var sqmiTxt  = demo.land_area_sqmi ? demo.land_area_sqmi + ' sq miles' : '';
          var densText = demo.pop_density ? demo.pop_density.toLocaleString() + ' residents per sq mile' : '';
          var fpText   = '';
          if (sqmiTxt && densText) {
            fpText = _n + ' covers ' + sqmiTxt + ' at an average density of ' + densText + '.';
          } else if (sqmiTxt) {
            fpText = _n + ' covers ' + sqmiTxt + '.';
          } else if (densText) {
            fpText = _n + ' averages ' + densText + '.';
          }
          if (fpText) {
            var densVal = demo.pop_density || 0;
            var densCtx = densVal > 3000 ? ' That\'s a denser suburban footprint than most of DFW, more options tend to be closer together.'
                        : densVal > 1500 ? ' That\'s a typical North DFW suburban density, walkability is limited, but most errands stay within a 10-minute drive.'
                        : densVal > 0    ? ' That\'s a spread-out, lower-density footprint, trail mileage and parks substitute for walkable commercial density.'
                        : '';
            fpEl.textContent = fpText + densCtx;
            fpEl.style.display = 'block';
          }
        }
      }

      }
      _apply();
      setTimeout(_apply, 1200);
      setTimeout(_apply, 3500);
      setTimeout(_apply, 6000);
    })
    .catch(function() {
      // Silently keep hardcoded fallbacks ,  no visible error to visitor
    });
}());
