/**
 * ================================================================
 * METUPS MARKETPLACE — PRODUCT FILTER ENGINE
 * shared/productFilter.js  (import from /shared/productFilter.js)
 *
 * A stateful, tiered, proximity-aware product discovery engine.
 *
 * ── TIER ARCHITECTURE ─────────────────────────────────────────
 *
 *   Tier 0 — Nearby       ≤ 10 km  (Haversine, requires lat/lng)
 *   Tier 1 — Same city            (city_id, fallback: city_name)
 *   Tier 2 — Same country         (country_code, fallback: text)
 *   Tier 3 — Global               (no filter)
 *
 *   ┌─ Migration-safe ───────────────────────────────────────────┐
 *   │  Tiers use structured fields (city_id, country_code, lat/  │
 *   │  lng) when available, and fall back to text matching for    │
 *   │  products not yet migrated.  No breaking changes.          │
 *   └────────────────────────────────────────────────────────────┘
 *
 * ── SCORING (within each tier) ────────────────────────────────
 *
 *   Tier 0  —  Distance (primary, km) then score (secondary)
 *   Tier 1-3 — score only
 *
 *   Score weights:
 *     Recency      45%  — exponential decay (half-life 14 days)
 *     Has image    20%  — cover photo present
 *     Condition    15%  — New > Like-New > Fair > Needs Repair
 *     Popularity   10%  — log-normalised views_count
 *     Price band   10%  — peaks around $50–$500 range
 *
 *   Sold items always score −1 (sink to bottom).
 *
 * ── OVER-FETCH + BUFFER ───────────────────────────────────────
 *
 *   Fetches FETCH_MULTIPLIER × pageSize rows, scores & buffers
 *   surplus.  Most scroll events drain the buffer (no network).
 *
 * ── USAGE ─────────────────────────────────────────────────────
 *
 *   import { FilterEngine, buildTierDivider } from '/shared/productFilter.js';
 *
 *   const engine = new FilterEngine(supabaseClient, userLocation);
 *   engine.setFilters({ category: 'Electronics', maxPrice: 200 });
 *
 *   const result = await engine.nextPage(20);
 *   // { products, tier, tierLabel, isNewTier, hasMore }
 *
 * ── SQL PREREQUISITES ─────────────────────────────────────────
 *
 *   products table must have:
 *     city_id      uuid  references cities(id)
 *     city_name    text
 *     country_code char(2)
 *     lat          double precision
 *     lng          double precision
 *
 *   cities table:
 *     id, name, country_code, lat, lng, region
 *
 *   Indexes (run in Supabase SQL Editor):
 *     create index idx_products_city    on products(city_id);
 *     create index idx_products_country on products(country_code);
 *     create index idx_products_lat_lng on products(lat, lng);
 *
 * ================================================================
 */

// ── Continent → country-code lookup (kept for getProductTier helper) ──
const COUNTRY_TO_CONTINENT = {};
{
  const MAP = {
    AF: ['DZ','AO','BJ','BW','BF','BI','CM','CV','CF','TD','KM','CG','CD','CI','DJ','EG',
         'GQ','ER','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR',
         'MU','YT','MA','MZ','NA','NE','NG','RE','RW','SH','ST','SN','SC','SL','SO','ZA',
         'SS','SD','SZ','TZ','TG','TN','UG','EH','ZM','ZW'],
    AS: ['AF','AM','AZ','BH','BD','BT','IO','BN','KH','CN','CX','CC','CY','GE','IN','ID',
         'IR','IQ','IL','JP','JO','KZ','KW','KG','LA','LB','MY','MV','MN','MM','NP','KP',
         'OM','PK','PS','PH','QA','SA','SG','LK','SY','TW','TJ','TH','TL','TM','AE','UZ',
         'VN','YE','HK','MO'],
    EU: ['AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GI',
         'GR','GG','HU','IS','IE','IM','IT','JE','XK','LV','LI','LT','LU','MK','MT','MD',
         'MC','ME','NL','NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','UA',
         'GB','VA','TR','AZ','GE','AM','KZ'],
    NA: ['AI','AG','AW','BS','BB','BZ','BM','VG','CA','KY','CR','CU','DM','DO','SV','GL',
         'GD','GP','GT','HT','HN','JM','MQ','MX','MS','AN','NI','PA','PR','BL','KN','LC',
         'MF','PM','VC','TT','TC','US','VI'],
    SA: ['AR','BO','BR','CL','CO','EC','FK','GF','GY','PY','PE','SR','UY','VE'],
    OC: ['AS','AU','CK','FJ','PF','GU','KI','MH','FM','NR','NC','NZ','NU','NF','MP','PW',
         'PG','PN','WS','SB','TK','TO','TV','UM','VU','WF'],
  };
  for (const [continent, codes] of Object.entries(MAP)) {
    for (const code of codes) COUNTRY_TO_CONTINENT[code] = continent;
  }
}

// ── Condition → quality score ──────────────────────────────────────
const CONDITION_SCORE = {
  'New':          1.0,
  'Like-New':     0.8,
  'Fair':         0.5,
  'Needs Repair': 0.2,
};

// ── Configuration ───────────────────────────────────────────────────
const FETCH_MULTIPLIER     = 3;    // over-fetch ratio for client-side scoring
const MAX_SEEN_IDS         = 800;  // dedup set cap
const RECENCY_HALF_LIFE    = 14;   // days at which recency score halves
const NEARBY_KM            = 10;   // radius for Tier 0 "nearby"
// 1° lat ≈ 111 km → NEARBY_KM km ≈ 0.09°
const NEARBY_LAT_DELTA     = NEARBY_KM / 111;

// ── Haversine distance (km) ──────────────────────────────────────────
function distanceKm(lat1, lng1, lat2, lng2) {
  if (lat2 == null || lng2 == null) return Infinity;
  const R    = 6371;
  const toR  = d => d * Math.PI / 180;
  const dLat = toR(lat2 - lat1);
  const dLng = toR(lng2 - lng1);
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Scoring helpers ────────────────────────────────────────────────

function recencyScore(createdAt) {
  if (!createdAt) return 0.1;
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  return Math.pow(2, -ageDays / RECENCY_HALF_LIFE);
}

function popularityScore(views, max = 200) {
  if (!views || views <= 0) return 0;
  return Math.log(views + 1) / Math.log(max + 1);
}

/**
 * Quality score [0, 1].
 * Weights: recency 45 | image 20 | condition 15 | popularity 10 | price 10
 * Sold items always return −1.
 */
function scoreProduct(product) {
  if (product.sold) return -1;

  const r  = recencyScore(product.created_at)             * 0.45;
  const i  = (product.cover_url ? 1 : 0)           * 0.20;
  const c  = (CONDITION_SCORE[product.condition] ?? 0.3)  * 0.15;
  const p  = popularityScore(product.views_count ?? 0)     * 0.10;

  let priceScore = 0.5;
  if (product.price != null && product.price > 0) {
    const logP = Math.log10(Math.max(product.price, 1));
    const peak = 2.2; // log10($158) — comfortable mid-range
    priceScore = Math.max(0, 1 - Math.abs(logP - peak) * 0.4);
  }
  const pr = priceScore * 0.10;

  return r + i + c + p + pr;
}


// ================================================================
// FilterEngine  —  the main export
// ================================================================

export class FilterEngine {

  /**
   * @param {SupabaseClient} supabase
   * @param {{
   *   city?:        string,
   *   city_id?:     string,
   *   country?:     string,
   *   country_code?: string,
   *   lat?:         number,
   *   lng?:         number,
   * } | null} userLocation
   */
  constructor(supabase, userLocation = null) {
    this._db       = supabase;
    this._loc      = userLocation;
    this._filters  = {};
    this._pageSize = 20;

    this._tierOffset        = [0, 0, 0, 0];
    this._tierDone          = [false, false, false, false];
    this._currentTier       = 0;
    this._seenIds           = new Set();
    this._buffer            = [];
    this._lastDeliveredTier = -1;

    this._applyLocationSkips();
  }

  // ── Public API ────────────────────────────────────────────────────

  setFilters(filters) {
    this._filters = { ...filters };
    this.reset();
  }

  setLocation(userLocation) {
    this._loc = userLocation;
    this.reset();
  }

  reset() {
    this._tierOffset        = [0, 0, 0, 0];
    this._tierDone          = [false, false, false, false];
    this._currentTier       = 0;
    this._seenIds           = new Set();
    this._buffer            = [];
    this._lastDeliveredTier = -1;
    this._applyLocationSkips();
  }

  /**
   * Skip tiers the engine can't service with the current location data.
   *
   *   Tier 0 (nearby)  — requires user lat + lng
   *   Tier 1 (city)    — requires city or city_id
   *   Tier 2 (country) — requires country_code or country name
   */
  _applyLocationSkips() {
    const loc = this._loc;

    if (!loc?.lat || !loc?.lng) {
      this._tierDone[0] = true;   // can't do distance without coords
    }
    if (!loc?.city && !loc?.city_id) {
      this._tierDone[1] = true;   // can't filter by city
    }
    if (!loc?.country_code && !loc?.country) {
      this._tierDone[2] = true;   // can't filter by country
    }

    // Advance _currentTier past any already-done tiers
    while (this._currentTier < 4 && this._tierDone[this._currentTier]) {
      this._currentTier++;
    }
  }

  // ── nextPage ──────────────────────────────────────────────────────

  async nextPage(pageSize = this._pageSize) {
    const fetchLimit = pageSize * FETCH_MULTIPLIER;

    while (this._buffer.length < pageSize && this._currentTier <= 3) {
      // Tier 3 is the last tier; _tierDone[3] signals total exhaustion
      if (this._currentTier === 3 && this._tierDone[3]) break;

      const fetched = await this._fetchCurrentTier(fetchLimit);

      if (fetched.length > 0) {
        const scored = fetched.map(p => ({ ...p, _score: scoreProduct(p) }));

        // Tier 0: sort by distance ASC (primary), quality score DESC (secondary)
        if (this._currentTier === 0 && this._loc?.lat) {
          scored.sort((a, b) => {
            const da = a._distance ?? Infinity;
            const db = b._distance ?? Infinity;
            if (Math.abs(da - db) > 0.1) return da - db;   // 100m resolution
            return b._score - a._score;
          });
        } else {
          scored.sort((a, b) => b._score - a._score);
        }

        this._buffer.push(...scored);
        if (this._buffer.length >= pageSize) break;
      } else {
        this._tierDone[this._currentTier] = true;
        this._currentTier++;
        // Skip tiers with no location data
        while (this._currentTier < 4 && this._tierDone[this._currentTier]) {
          this._currentTier++;
        }
      }
    }

    const delivered = this._buffer.splice(0, pageSize);

    if (delivered.length === 0) {
      return { products: [], tier: 3, tierLabel: '', isNewTier: false, hasMore: false };
    }

    const tierCounts = [0, 0, 0, 0];
    for (const p of delivered) tierCounts[p._tier ?? 3]++;
    const maxCount    = Math.max(...tierCounts);
    const dominantTier = tierCounts.findIndex(c => c === maxCount);

    const isNewTier = dominantTier !== this._lastDeliveredTier;
    this._lastDeliveredTier = dominantTier;

    const hasMore = this._buffer.length > 0
      || (this._currentTier <= 3 && !this._tierDone[3]);

    return {
      products:  delivered,
      tier:      dominantTier,
      tierLabel: this._tierLabel(dominantTier),
      isNewTier,
      hasMore,
    };
  }

  // ── Tier fetchers ─────────────────────────────────────────────────

  async _fetchCurrentTier(limit) {
    switch (this._currentTier) {
      case 0: return this._fetchTier0(limit);
      case 1: return this._fetchTier1(limit);
      case 2: return this._fetchTier2(limit);
      case 3: return this._fetchTier3(limit);
      default: return [];
    }
  }

  /**
   * Tier 0 — Nearby (≤ NEARBY_KM km)
   *
   * Strategy:
   *   1. SQL bounding box (cheap index scan) to pre-filter candidates
   *   2. Precise Haversine client-side to keep only ≤ NEARBY_KM km
   *   3. Tag each product with _distance for distance-primary sort
   *
   * Falls back to nothing (returns []) if user has no lat/lng.
   */
  async _fetchTier0(limit) {
    const { lat, lng } = this._loc ?? {};
    if (!lat || !lng) return [];

    // Longitudinal delta widens near the poles — cos(lat) correction
    const lngDelta = NEARBY_LAT_DELTA / Math.cos(lat * Math.PI / 180);

    const { data = [], error } = await this._baseQuery()
      .gte('lat', lat - NEARBY_LAT_DELTA)
      .lte('lat', lat + NEARBY_LAT_DELTA)
      .gte('lng', lng - lngDelta)
      .lte('lng', lng + lngDelta)
      // Over-fetch inside bounding box — Haversine will trim to true circle
      .range(this._tierOffset[0], this._tierOffset[0] + limit * 2 - 1);

    if (error) { console.warn('[Tier0]', error.message); return []; }

    this._tierOffset[0] += limit * 2;
    if (data.length < limit * 2) this._tierDone[0] = true;

    // Precise distance filter + tag
    const nearby = data
      .map(p => {
        const d = distanceKm(lat, lng, p.lat, p.lng);
        return { ...p, _distance: d };
      })
      .filter(p => p._distance <= NEARBY_KM);

    return this._dedup(nearby, 0);
  }

  /**
   * Tier 1 — Same city
   *
   * Priority order:
   *   a) city_id exact match      (structured, fast index)
   *   b) city_name text match     (structured column, faster than location)
   *   c) location text ilike      (legacy fallback for unmigrated products)
   */
  async _fetchTier1(limit) {
    const { city_id, city } = this._loc ?? {};
    if (!city_id && !city) return [];

    let q = this._baseQuery()
      .range(this._tierOffset[1], this._tierOffset[1] + limit - 1);

    if (city_id) {
      q = q.eq('city_id', city_id);
    } else {
      // Prefer city_name column; fall back to full location string
      q = q.or(`city_name.ilike.%${city}%,location.ilike.%${city}%`);
    }

    const { data = [], error } = await q;
    if (error) { console.warn('[Tier1]', error.message); return []; }

    this._tierOffset[1] += limit;
    if (data.length < limit) this._tierDone[1] = true;

    return this._dedup(data, 1);
  }

  /**
   * Tier 2 — Same country
   *
   * Priority order:
   *   a) country_code exact match  (structured, fast index)
   *   b) location text ilike       (legacy fallback)
   */
  async _fetchTier2(limit) {
    const { country_code, country } = this._loc ?? {};
    if (!country_code && !country) return [];

    let q = this._baseQuery()
      .range(this._tierOffset[2], this._tierOffset[2] + limit - 1);

    if (country_code) {
      q = q.eq('country_code', country_code);
    } else {
      q = q.ilike('location', `%${country}%`);
    }

    const { data = [], error } = await q;
    if (error) { console.warn('[Tier2]', error.message); return []; }

    this._tierOffset[2] += limit;
    if (data.length < limit) this._tierDone[2] = true;

    return this._dedup(data, 2);
  }

  /**
   * Tier 3 — Global (no location filter)
   */
  async _fetchTier3(limit) {
    const { data = [], error } = await this._baseQuery()
      .range(this._tierOffset[3], this._tierOffset[3] + limit - 1);

    if (error) { console.warn('[Tier3]', error.message); return []; }

    this._tierOffset[3] += limit;
    if (data.length < limit) this._tierDone[3] = true;

    return this._dedup(data, 3);
  }

  // ── Base query ────────────────────────────────────────────────────

  _baseQuery() {
    const f = this._filters;

    let q = this._db
      .from('product_with_cover')
      .select([
        // Core display fields
        'id', 'title', 'price', 'condition', 'location', 'category',
        'sold', 'seller_id', 'cover_url', 'created_at', 'views_count',
        // Seller info from view
        'seller_name', 'seller_avatar', 'seller_rating',
        // ── Structured geo fields (new) ───────────────────────────
        // Required for tier 0 (bounding box) and Haversine distance
        'lat', 'lng',
        // Required for tier 1 city matching
        'city_id', 'city_name',
        // Required for tier 2 country matching
        'country_code',
      ].join(', '))
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (f.search)    q = q.textSearch('search_vector', f.search.trim(), { type: 'websearch' });
    if (f.category)  q = q.eq('category', f.category);
    if (f.condition) q = q.eq('condition', f.condition);
    if (f.minPrice)  q = q.gte('price', parseFloat(f.minPrice));
    if (f.maxPrice)  q = q.lte('price', parseFloat(f.maxPrice));

    return q;
  }

  // ── Dedup ─────────────────────────────────────────────────────────

  _dedup(rows, tier) {
    const fresh = rows.filter(p => !this._seenIds.has(p.id));
    for (const p of fresh) {
      if (this._seenIds.size >= MAX_SEEN_IDS) {
        // Evict oldest tracked id (FIFO)
        const oldest = this._seenIds.values().next().value;
        this._seenIds.delete(oldest);
      }
      this._seenIds.add(p.id);
      p._tier = tier;
    }
    return fresh;
  }

  // ── Tier labels ───────────────────────────────────────────────────

  _tierLabel(tier) {
    const city    = this._loc?.city    || 'your city';
    const country = this._loc?.country || 'your country';

    switch (tier) {
      case 0: return `Near you (within ${NEARBY_KM} km)`;
      case 1: return `Listings in ${city}`;
      case 2: return `More from ${country}`;
      case 3: return 'Listings worldwide';
      default: return '';
    }
  }
}


// ================================================================
// buildTierDivider  —  UI separator HTML
// ================================================================

/**
 * @param {string}  label   — e.g. "More from Zimbabwe"
 * @param {number}  tier    — 0..3
 * @param {boolean} noMore  — show "no more listings nearby" sub-line
 * @returns {string} HTML injected into the product grid
 */
export function buildTierDivider(label, tier, noMore = false) {
  const icons = {
    0: 'fa-location-arrow',
    1: 'fa-map-marker-alt',
    2: 'fa-flag',
    3: 'fa-globe',
  };
  const colors = {
    0: 'var(--teal-dark)',
    1: 'var(--blue)',
    2: 'var(--orange, #F97316)',
    3: 'var(--text-muted)',
  };

  const icon  = icons[tier]  ?? 'fa-globe';
  const color = colors[tier] ?? 'var(--text-muted)';

  return `
    <div class="tier-divider" style="
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 4px 6px;
      margin-top: 4px;
    ">
      <div style="
        width: 30px; height: 30px; border-radius: 50%;
        background: ${color}18;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      ">
        <i class="fas ${icon}" style="font-size:.75rem; color:${color}"></i>
      </div>
      <div style="flex:1; min-width:0;">
        ${noMore ? `
          <div style="font-size:.7rem;color:var(--text-muted);margin-bottom:1px">
            No more listings nearby
          </div>` : ''}
        <div style="
          font-family: var(--font-head);
          font-weight: 800;
          font-size: .8rem;
          color: ${noMore ? 'var(--text-muted)' : color};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        ">${label}</div>
      </div>
      <div style="flex:1; height:1px; background:var(--border)"></div>
    </div>
  `;
}


// ================================================================
// Standalone helpers
// ================================================================

/**
 * smartSort() — score + sort a pre-fetched array.
 * Drop-in for the old sortProductsByProximity() on cached pages.
 */
export function smartSort(products, userCity, userCountry) {
  if (!products?.length) return products ?? [];

  const city    = (userCity    || '').toLowerCase().trim();
  const country = (userCountry || '').toLowerCase().trim();

  const proximityTier = (p) => {
    const loc = (p.location || '').toLowerCase();
    if (city    && loc.includes(city))    return 0;
    if (country && loc.includes(country)) return 1;
    return 2;
  };

  return [...products]
    .map(p => ({ ...p, _ptier: proximityTier(p), _score: scoreProduct(p) }))
    .sort((a, b) =>
      a._ptier !== b._ptier ? a._ptier - b._ptier : b._score - a._score
    );
}

/**
 * getProductTier() — classify a product relative to the user.
 * Returns: 'nearby' | 'city' | 'country' | 'continent' | 'global'
 */
export function getProductTier(product, userLoc) {
  if (!userLoc || !product) return 'global';

  // Distance-based
  if (userLoc.lat && userLoc.lng && product.lat && product.lng) {
    if (distanceKm(userLoc.lat, userLoc.lng, product.lat, product.lng) <= NEARBY_KM) {
      return 'nearby';
    }
  }

  // Structured city
  if (userLoc.city_id && product.city_id && userLoc.city_id === product.city_id) {
    return 'city';
  }

  // Structured country
  if (userLoc.country_code && product.country_code
      && userLoc.country_code === product.country_code) {
    return 'country';
  }

  // Continent (legacy helper — using text location as fallback)
  const cc = (userLoc.country_code || '').toUpperCase();
  const userContinent = COUNTRY_TO_CONTINENT[cc];
  const prodCC = (product.country_code || '').toUpperCase();
  const prodContinent = COUNTRY_TO_CONTINENT[prodCC];
  if (userContinent && userContinent === prodContinent) {
    return 'continent';
  }

  return 'global';
}