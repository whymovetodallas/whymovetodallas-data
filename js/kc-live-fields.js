/* Why Move to Dallas: kc-blog-live field registry — SINGLE SOURCE OF TRUTH.
 *
 * Every `<span class="kc-blog-live" data-suburb="..." data-field="...">` on the
 * site is resolved and formatted here, by exactly one code path, used by two
 * callers:
 *
 *   1. the browser  — this file loads as /js/kc-live-fields.js and repaints
 *                     every span from the live suburb-profiles.json at load.
 *   2. the baker    — tools/refresh-live-fallbacks.cjs require()s this file and
 *                     bakes the SAME strings into the HTML as static fallbacks,
 *                     so a non-JS crawler sees what a visitor sees.
 *
 * Because both sides call value(), baked and live output cannot disagree.
 * build.js enforces that with a drift gate on every build.
 *
 * History: the loader named `kcUnifiedMarketCards` in the page comments was
 * referenced but never written, and public/js/suburb-data.js paints market
 * numbers by element id (#kc-mkt-price etc.) which no suburb page carries any
 * more. Result: the spans were never repainted by anything and every visitor
 * saw hand-baked numbers. This file is that missing loader.
 *
 * ── Per-span format overrides ────────────────────────────────────────────────
 * Default formatting is the suburb-page convention (units included, sentence
 * case). Prose on blog posts often needs a bare number or a lowercase word, so
 * a span may carry `data-fmt`, a comma-separated list:
 *
 *   data-fmt="bare"   drop the unit suffix   ("55 days" -> "55")
 *   data-fmt="lower"  lowercase the word     ("Balanced" -> "balanced")
 *
 * ES5 only, no dependencies — this runs in the browser and in Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KCLive = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DATA_URL = 'https://raw.githubusercontent.com/whymovetodallas/whymovetodallas-data/main/suburb-profiles.json';

  // ── formatting primitives (mirror public/js/suburb-data.js) ────────────────
  function fmtPrice(v) {
    if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
    return '$' + Math.round(v / 1000) + 'K';
  }
  function commas(v) { return Math.round(v).toLocaleString('en-US'); }
  function titleCase(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function dig(obj, dotted) {
    var cur = obj, parts = dotted.split('.');
    for (var i = 0; i < parts.length; i++) {
      if (cur === null || typeof cur !== 'object') return null;
      cur = cur[parts[i]];
    }
    return cur === undefined ? null : cur;
  }

  // ── the registry ───────────────────────────────────────────────────────────
  // `path` reads from the suburb object. `tier` reads from
  // market.tiers[data-tier][<tier>] and requires a data-tier attribute.
  var FIELDS = {
    // ── Market (NTREIS, 12-month rolling) ────────────────────────────────────
    sfr_median_price:          { path: 'market.sfr_median_price',          fmt: function (v, o) { return o.bare ? commas(v) : fmtPrice(v); } },
    sfr_median_price_full:     { path: 'market.sfr_median_price',          fmt: function (v) { return '$' + commas(v); } },
    sfr_avg_price:             { path: 'market.sfr_avg_price',             fmt: function (v, o) { return o.bare ? commas(v) : fmtPrice(v); } },
    sfr_median_price_per_sqft: { path: 'market.sfr_median_price_per_sqft', fmt: function (v) { return '$' + Math.round(v); } },
    sfr_price_per_sqft:        { path: 'market.sfr_median_price_per_sqft', fmt: function (v) { return '$' + Math.round(v) + '/sq ft'; } },
    sfr_pct_of_original_price: { path: 'market.sfr_pct_of_original_price', fmt: function (v, o) { return o.bare ? v.toFixed(1) : v.toFixed(1) + '%'; } },
    sfr_pct_of_original:       { path: 'market.sfr_pct_of_original_price', fmt: function (v, o) { return o.bare ? v.toFixed(1) : v.toFixed(1) + '%'; } },
    sfr_days_on_market:        { path: 'market.sfr_days_on_market',        fmt: function (v, o) { return o.bare ? String(Math.round(v)) : Math.round(v) + ' days'; } },
    sfr_months_supply:         { path: 'market.sfr_months_supply',         fmt: function (v, o) { return o.bare ? v.toFixed(1) : v.toFixed(1) + ' mo.'; } },
    sfr_inventory:             { path: 'market.sfr_inventory',             fmt: function (v) { return commas(v); } },
    sfr_closed_sales_12mo:     { path: 'market.sfr_closed_sales_12mo',     fmt: function (v) { return commas(v); } },
    /* Every suburb page renders this span immediately before the word "market",
     * so the default is the possessive form suburb-data.js uses in msiLabel()
     * ("Seller's market", "Balanced market"). Blog prose supplies its own "'s"
     * outside the span, so data-fmt="lower" returns the bare lowercase word. */
    market_condition:          { path: 'market.market_condition',          fmt: function (v, o) { var w = String(v); return o.lower ? w.toLowerCase() : titleCase(w) + (/^(seller|buyer)$/i.test(w) ? "'s" : ''); } },

    // ── Price-band tiers (require data-tier) ─────────────────────────────────
    tier_label:                { tier: 'label',                            fmt: function (v) { return String(v); } },
    tier_price:                { tier: 'median_sale_price',                fmt: function (v, o) { return o.bare ? commas(v) : fmtPrice(v); } },
    tier_price_full:           { tier: 'median_sale_price',                fmt: function (v) { return '$' + commas(v); } },
    tier_sqft:                 { tier: 'sqft',                             fmt: function (v, o) { return o.bare ? commas(v) : commas(v) + ' sq ft'; } },
    tier_ppsf:                 { tier: 'price_per_sqft',                   fmt: function (v) { return '$' + Math.round(v) + '/sq ft'; } },

    // ── Scores ───────────────────────────────────────────────────────────────
    family_score:              { path: 'scores.family_score',              fmt: function (v) { return String(Math.round(v)); } },
    value_score:               { path: 'scores.value_score',               fmt: function (v) { return String(Math.round(v)); } },
    education_score:           { path: 'scores.sub_scores.education',      fmt: function (v) { return String(Math.round(v)); } },
    commute_score:             { path: 'scores.sub_scores.commute',        fmt: function (v) { return String(Math.round(v)); } },
    family_community_score:    { path: 'scores.sub_scores.family_community', fmt: function (v) { return String(Math.round(v)); } },
    market_stability_score:    { path: 'scores.sub_scores.market_stability', fmt: function (v) { return String(Math.round(v)); } },

    // ── Schools ──────────────────────────────────────────────────────────────
    isd_grade:                 { path: 'schools.overall_grade',            fmt: function (v) { return String(v); } },
    academics_grade:           { path: 'schools.academics_grade',          fmt: function (v) { return String(v); } },
    college_prep_grade:        { path: 'schools.college_prep_grade',       fmt: function (v) { return String(v); } },
    good_for_families_grade:   { path: 'schools.good_for_families',        fmt: function (v) { return String(v); } },

    // ── Walkability ──────────────────────────────────────────────────────────
    walk_score:                { path: 'walkability.walk_score',           fmt: function (v) { return String(Math.round(v)); } },
    bike_score:                { path: 'walkability.bike_score',           fmt: function (v) { return String(Math.round(v)); } },

    // ── Demographics (ACS 2023 5-yr) ─────────────────────────────────────────
    population:                { path: 'demographics.population',          fmt: function (v, o) { return o.bare ? String(Math.round(v)) : commas(v); } },
    median_age:                { path: 'demographics.median_age',          fmt: function (v, o) { return o.bare ? String(Math.round(v)) : v.toFixed(1); } },
    pct_with_children:         { path: 'demographics.pct_households_with_children', fmt: function (v, o) { return o.bare ? v.toFixed(1) : v.toFixed(1) + '%'; } },
    median_income:             { path: 'demographics.median_household_income', fmt: function (v, o) { return o.bare ? fmtPrice(v) : '$' + commas(v); } },
    owner_occupied_pct:        { path: 'demographics.owner_occupied_pct',  fmt: function (v, o) { return o.bare ? v.toFixed(1) : v.toFixed(1) + '%'; } },
    bachelors_plus_pct:        { path: 'demographics.bachelors_plus_pct',  fmt: function (v, o) { return o.bare ? v.toFixed(1) : v.toFixed(1) + '%'; } },
    wfh_pct:                   { path: 'demographics.wfh_pct',             fmt: function (v, o) { return o.bare ? v.toFixed(1) : v.toFixed(1) + '%'; } },
    median_commute_min:        { path: 'demographics.median_commute_min',  fmt: function (v, o) { return o.bare ? v.toFixed(1) : v.toFixed(1) + ' min'; } },

    // ── Amenities (OpenStreetMap counts) ─────────────────────────────────────
    parks_count:               { path: 'amenities.parks',                  fmt: function (v) { return commas(v); } },
    restaurants_count:         { path: 'amenities.restaurants',            fmt: function (v) { return commas(v); } },
    shopping_count:            { path: 'amenities.shopping',               fmt: function (v) { return commas(v); } }

    /* COMPLIANCE, HARD LINE: this registry deliberately exposes no crime.*,
     * niche_city.crime, or scores.sub_scores.safety field, and none may be
     * added. Suburbs must never be ranked, compared, or characterized by
     * safety or crime (Fair Housing / TREC steering). family_score is roughly
     * 30% safety, so it is fine as a single displayed stat but must never
     * order a comparison — use value_score, education_score, or ISD grades. */
  };

  function knownField(field) { return Object.prototype.hasOwnProperty.call(FIELDS, field); }

  /* Resolve + format one span's text. Returns null when the value is missing,
   * non-finite, or the field/tier is unknown — callers then leave the baked
   * text alone rather than painting an empty or bogus string. */
  function value(field, suburb, opts) {
    var def = FIELDS[field];
    if (!def || !suburb) return null;
    opts = opts || {};
    var raw = def.tier
      ? (opts.tier ? dig(suburb, 'market.tiers.' + opts.tier + '.' + def.tier) : null)
      : dig(suburb, def.path);
    if (raw === null || raw === '') return null;
    if (typeof raw === 'number' && !isFinite(raw)) return null;
    try {
      var out = def.fmt(raw, opts);
      return (out === null || out === undefined || out === '') ? null : String(out);
    } catch (e) { return null; }
  }

  function parseFmt(attr) {
    var list = String(attr || '').split(',');
    return { bare: list.indexOf('bare') > -1, lower: list.indexOf('lower') > -1 };
  }

  // ── browser side ───────────────────────────────────────────────────────────
  function optsFromEl(el) {
    var o = parseFmt(el.getAttribute('data-fmt'));
    o.tier = el.getAttribute('data-tier') || null;
    return o;
  }

  var _pending = null;
  /* Memoised fetch of the live profiles. Shared so suburb-data.js and this
   * loader make ONE conditional request per page, not one each. */
  function load() {
    if (_pending) return _pending;
    if (typeof fetch !== 'function') return Promise.reject(new Error('no fetch'));
    _pending = fetch(DATA_URL, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
    return _pending;
  }

  function paint(data, root) {
    var scope = root || document;
    var spans = scope.querySelectorAll('.kc-blog-live');
    var n = 0;
    for (var i = 0; i < spans.length; i++) {
      var el = spans[i];
      var sub = data && data.suburbs && data.suburbs[el.getAttribute('data-suburb')];
      if (!sub) continue;
      var v = value(el.getAttribute('data-field'), sub, optsFromEl(el));
      if (v !== null && el.textContent !== v) { el.textContent = v; n++; }
    }
    return n;
  }

  function run() {
    if (!document.querySelector('.kc-blog-live')) return;
    load().then(function (d) { paint(d); }).catch(function () { /* keep baked values */ });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  }

  return {
    DATA_URL: DATA_URL,
    FIELDS: FIELDS,
    knownField: knownField,
    value: value,
    parseFmt: parseFmt,
    load: load,
    paint: paint
  };
}));
