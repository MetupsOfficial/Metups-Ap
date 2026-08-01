/**
 * ================================================================
 * METUPS MARKETPLACE — PRODUCT FILTER ENGINE  v2
 * src/assets/js/productFilter.js
 *
 * What changed from v1:
 *   • Smart query parser — detects location queries, category
 *     queries, and price hints automatically
 *   • Search now calls the search_products RPC (full-text +
 *     trigram) instead of a raw .textSearch() call — partial
 *     words like "iPho" and "Samng" now return results
 *   • When a search term is present, all 4 tiers are replaced
 *     by a single ranked search pass (then proximity re-sort)
 *   • Sort modes: 'relevance' | 'newest' | 'price_asc' |
 *     'price_desc' | 'nearest'
 *   • buildTierDivider and smartSort remain backward-compatible
 * ================================================================
 */

// ── Known categories (must match DB values exactly) ──────────────
const KNOWN_CATEGORIES = [
  'Electronics', 'Fashion', 'Furniture',
  'Appliances', 'Vehicles', 'Books', 'Other',
];

// lowercase → canonical, for query detection
const CATEGORY_ALIASES = {
  electronics:  'Electronics',
  electronic:   'Electronics',
  phones:       'Electronics',
  phone:        'Electronics',
  laptop:       'Electronics',
  laptops:      'Electronics',
  computer:     'Electronics',
  computers:    'Electronics',
  gadget:       'Electronics',
  gadgets:      'Electronics',
  fashion:      'Fashion',
  clothes:      'Fashion',
  clothing:     'Fashion',
  shoes:        'Fashion',
  shirt:        'Fashion',
  dress:        'Fashion',
  furniture:    'Furniture',
  couch:        'Furniture',
  sofa:         'Furniture',
  table:        'Furniture',
  chair:        'Furniture',
  bed:          'Furniture',
  appliances:   'Appliances',
  appliance:    'Appliances',
  fridge:       'Appliances',
  microwave:    'Appliances',
  washing:      'Appliances',
  washer:       'Appliances',
  stove:        'Appliances',
  oven:         'Appliances',
  vehicles:     'Vehicles',
  vehicle:      'Vehicles',
  car:          'Vehicles',
  cars:         'Vehicles',
  truck:        'Vehicles',
  motorbike:    'Vehicles',
  bike:         'Vehicles',
  books:        'Books',
  book:         'Books',
  textbook:     'Books',
  textbooks:    'Books',
};

// ── Continent → country-code lookup ──────────────────────────────
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
         'GB','VA','TR'],
    NA: ['AI','AG','AW','BS','BB','BZ','BM','VG','CA','KY','CR','CU','DM','DO','SV','GL',
         'GD','GP','GT','HT','HN','JM','MQ','MX','MS','NI','PA','PR','KN','LC','VC','TT',
         'TC','US','VI'],
    SA: ['AR','BO','BR','CL','CO','EC','FK','GF','GY','PY','PE','SR','UY','VE'],
    OC: ['AS','AU','CK','FJ','PF','GU','KI','MH','FM','NR','NC','NZ','NU','NF','MP','PW',
         'PG','PN','WS','SB','TK','TO','TV','VU','WF'],
  };
  for (const [continent, codes] of Object.entries(MAP)) {
    for (const code of codes) COUNTRY_TO_CONTINENT[code] = continent;
  }
}

// ── Condition → quality score ─────────────────────────────────────
const CONDITION_SCORE = {
  'New':          1.0,
  'Like-New':     0.8,
  'Fair':         0.5,
  'Needs Repair': 0.2,
};

// ── Configuration ─────────────────────────────────────────────────
const FETCH_MULTIPLIER  = 3;    // over-fetch ratio for scoring
const MAX_SEEN_IDS      = 800;  // dedup cap
const RECENCY_HALF_LIFE = 14;   // days
const NEARBY_KM         = 10;
const NEARBY_LAT_DELTA  = NEARBY_KM / 111;

// ── Haversine distance ────────────────────────────────────────────
function distanceKm(lat1, lng1, lat2, lng2) {
  if (lat2 == null || lng2 == null) return Infinity;
  const R   = 6371;
  const toR = d => d * Math.PI / 180;
  const dLat = toR(lat2 - lat1);
  const dLng = toR(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Scoring ───────────────────────────────────────────────────────
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
 * scoreProduct() — quality score [0, 1].
 * When a DB rank is present (search mode), it is blended in at 40%.
 * Weights: recency 40 | db_rank 40 | image 10 | condition 6 | popularity 4
 *          (browse mode without rank: recency 45 | image 20 | condition 15 | pop 10 | price 10)
 */
function scoreProduct(product, hasDbRank = false) {
  if (product.sold) return -1;

  if (hasDbRank) {
    const dbRank = Math.min(product.rank || 0, 1);  // already 0-1 from RPC
    const r  = recencyScore(product.created_at)           * 0.40;
    const rk = dbRank                                      * 0.40;
    const i  = (product.cover_url ? 1 : 0)                * 0.10;
    const c  = (CONDITION_SCORE[product.condition] ?? 0.3) * 0.06;
    const p  = popularityScore(product.views_count ?? 0)   * 0.04;
    return r + rk + i + c + p;
  }

  const r  = recencyScore(product.created_at)             * 0.45;
  const i  = (product.cover_url ? 1 : 0)                  * 0.20;
  const c  = (CONDITION_SCORE[product.condition] ?? 0.3)  * 0.15;
  const p  = popularityScore(product.views_count ?? 0)    * 0.10;

  let priceScore = 0.5;
  if (product.price != null && product.price > 0) {
    const logP = Math.log10(Math.max(product.price, 1));
    const peak = 2.2;
    priceScore = Math.max(0, 1 - Math.abs(logP - peak) * 0.4);
  }
  const pr = priceScore * 0.10;
  return r + i + c + p + pr;
}


// ================================================================
// QueryParser — classifies a raw search string
// ================================================================

/**
 * parseQuery(rawQuery)
 *
 * Tokenises the search string and classifies each token:
 *
 *   locationTokens  — words that match known city/country fragments
 *   categoryToken   — single canonical category if detected
 *   priceHint       — { max } if "under $X" / "below $X" pattern
 *   productTerms    — the remaining product-search terms
 *   isLocationOnly  — true if ALL tokens resolved to a location
 *
 * Examples:
 *   "iphone harare"          → productTerms:"iphone", location:"Harare"
 *   "electronics"            → category:"Electronics", productTerms:""
 *   "Samsung under 200"      → productTerms:"Samsung", priceHint:{max:200}
 *   "furniture bulawayo"     → category:"Furniture", location:"Bulawayo"
 *   "harare"                 → locationTokens:["harare"], isLocationOnly:true
 */
export function parseQuery(rawQuery) {
  const result = {
    raw:            rawQuery || '',
    locationTokens: [],
    categoryToken:  null,
    priceHint:      null,
    productTerms:   '',
    isLocationOnly: false,
  };

  if (!rawQuery || !rawQuery.trim()) return result;

  const tokens   = rawQuery.trim().toLowerCase().split(/\s+/);
  const leftover = [];

  // Detect "under $X" / "below $X" / "max $X" price hints
  const priceMatch = rawQuery.match(/(?:under|below|max|less than)\s*\$?\s*(\d+(?:\.\d+)?)/i);
  if (priceMatch) {
    result.priceHint = { max: parseFloat(priceMatch[1]) };
  }

  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];

    // Skip price-hint words
    if (/^(under|below|max|less)$/i.test(tok) || /^\$?\d+(\.\d+)?$/.test(tok)) {
      i++;
      continue;
    }

    // Category detection
    if (!result.categoryToken && CATEGORY_ALIASES[tok]) {
      result.categoryToken = CATEGORY_ALIASES[tok];
      i++;
      continue;
    }

    // Everything else goes to product terms
    leftover.push(tok);
    i++;
  }

  result.productTerms  = leftover.join(' ').trim();
  result.isLocationOnly = result.productTerms === '' && !result.categoryToken;

  return result;
}


// ================================================================
// FilterEngine — main export
// ================================================================

export class FilterEngine {

  /**
   * @param {SupabaseClient} supabase
   * @param {{ city?, city_id?, country?, country_code?, lat?, lng? }|null} userLocation
   */
  constructor(supabase, userLocation = null) {
    this._db  = supabase;
    this._loc = userLocation;
    this._filters  = {};
    this._sortMode = 'relevance';   // 'relevance'|'newest'|'price_asc'|'price_desc'|'nearest'

    this._tierOffset        = [0, 0, 0, 0];
    this._tierDone          = [false, false, false, false];
    this._currentTier       = 0;
    this._seenIds           = new Set();
    this._buffer            = [];
    this._lastDeliveredTier = -1;

    // Search-mode state — set when a text query is active
    this._searchMode        = false;
    this._searchOffset      = 0;
    this._searchDone        = false;
    this._parsedQuery       = null;  // result of parseQuery()

    this._applyLocationSkips();
  }

  // ── Public API ─────────────────────────────────────────────────

  setFilters(filters) {
    this._filters = { ...filters };
    this.reset();
  }

  setLocation(userLocation) {
    this._loc = userLocation;
    this.reset();
  }

  setSortMode(mode) {
    this._sortMode = mode || 'relevance';
    this.reset();
  }

  reset() {
    this._tierOffset        = [0, 0, 0, 0];
    this._tierDone          = [false, false, false, false];
    this._currentTier       = 0;
    this._seenIds           = new Set();
    this._buffer            = [];
    this._lastDeliveredTier = -1;
    this._searchMode        = false;
    this._searchOffset      = 0;
    this._searchDone        = false;
    this._parsedQuery       = null;
    this._applyLocationSkips();
  }

  _applyLocationSkips() {
    const loc = this._loc;
    if (!loc?.lat || !loc?.lng)               this._tierDone[0] = true;
    if (!loc?.city && !loc?.city_id)          this._tierDone[1] = true;
    if (!loc?.country_code && !loc?.country)  this._tierDone[2] = true;

    while (this._currentTier < 4 && this._tierDone[this._currentTier]) {
      this._currentTier++;
    }
  }

  // ── nextPage ───────────────────────────────────────────────────

  async nextPage(pageSize = 20) {
    const fetchLimit = pageSize * FETCH_MULTIPLIER;

    // ── Search mode: text query present ───────────────────────────
    const rawSearch = this._filters.search?.trim() || '';
    if (rawSearch) {
      return this._nextSearchPage(pageSize, fetchLimit, rawSearch);
    }

    // ── Browse mode: no text query ─────────────────────────────────
    while (this._buffer.length < pageSize && this._currentTier <= 3) {
      if (this._currentTier === 3 && this._tierDone[3]) break;

      const fetched = await this._fetchCurrentTier(fetchLimit);

      if (fetched.length > 0) {
        const scored = fetched.map(p => ({ ...p, _score: scoreProduct(p, false) }));
        this._sortBatch(scored);
        this._buffer.push(...scored);
        if (this._buffer.length >= pageSize) break;
      } else {
        this._tierDone[this._currentTier] = true;
        this._currentTier++;
        while (this._currentTier < 4 && this._tierDone[this._currentTier]) {
          this._currentTier++;
        }
      }
    }

    const delivered = this._buffer.splice(0, pageSize);

    if (delivered.length === 0) {
      return { products: [], tier: 3, tierLabel: '', isNewTier: false, hasMore: false };
    }

    const tierCounts   = [0, 0, 0, 0];
    for (const p of delivered) tierCounts[p._tier ?? 3]++;
    const maxCount     = Math.max(...tierCounts);
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

  // ── Search-mode page ──────────────────────────────────────────

  async _nextSearchPage(pageSize, fetchLimit, rawSearch) {
    if (this._searchDone && this._buffer.length === 0) {
      return { products: [], tier: 3, tierLabel: 'Search results', isNewTier: false, hasMore: false };
    }

    // Parse the query once per search session
    if (!this._parsedQuery) {
      this._parsedQuery = parseQuery(rawSearch);
    }
    const pq = this._parsedQuery;

    // If the user typed only a location word (e.g. "Harare"), treat it
    // as a location filter change rather than a product text search
    if (pq.isLocationOnly && pq.productTerms === '' && !pq.categoryToken) {
      // Signal to the caller that this is a location redirect
      return {
        products:          [],
        tier:              1,
        tierLabel:         `Listings in ${rawSearch}`,
        isNewTier:         true,
        hasMore:           false,
        isLocationRedirect: true,
        locationQuery:     rawSearch,
      };
    }

    // Fetch from the search_products RPC
    if (this._buffer.length < pageSize && !this._searchDone) {
      const rpcParams = {
        p_query:        pq.productTerms || rawSearch,  // use parsed terms; fall back to raw
        p_limit:        fetchLimit,
        p_offset:       this._searchOffset,
      };

      // Merge filter-drawer overrides with query-parser detections
      // Filter drawer takes precedence (explicit user selection)
      const f = this._filters;
      rpcParams.p_category  = f.category  || pq.categoryToken  || null;
      rpcParams.p_condition = f.condition || null;
      rpcParams.p_min_price = f.minPrice  ? parseFloat(f.minPrice) : null;
      rpcParams.p_max_price = f.maxPrice  ? parseFloat(f.maxPrice)
                            : pq.priceHint?.max
                            ? pq.priceHint.max
                            : null;

      // Scope search to user's country for relevance
      if (this._loc?.country_code) rpcParams.p_country_code = this._loc.country_code;

      const { data = [], error } = await this._db.rpc('search_products', rpcParams);
      if (error) console.warn('[SearchRPC]', error.message);

      this._searchOffset += fetchLimit;
      if ((data?.length ?? 0) < fetchLimit) this._searchDone = true;

      const fresh = this._dedup(data || [], 3);  // tier 3 = global for search
      const scored = fresh.map(p => ({ ...p, _score: scoreProduct(p, true) }));

      // Re-sort by proximity if location is known + sort mode is 'nearest' or 'relevance'
      if (this._loc?.lat && (this._sortMode === 'nearest' || this._sortMode === 'relevance')) {
        scored.forEach(p => {
          p._distance = distanceKm(this._loc.lat, this._loc.lng, p.lat, p.lng);
        });
        if (this._sortMode === 'nearest') {
          scored.sort((a, b) => (a._distance ?? Infinity) - (b._distance ?? Infinity));
        } else {
          // relevance: blend proximity into score (closer = slight boost)
          scored.forEach(p => {
            const distBoost = p._distance < 10  ? 0.15
                            : p._distance < 50  ? 0.08
                            : p._distance < 200 ? 0.03
                            : 0;
            p._score += distBoost;
          });
          scored.sort((a, b) => b._score - a._score);
        }
      } else {
        this._sortBatch(scored);
      }

      this._buffer.push(...scored);
    }

    const delivered = this._buffer.splice(0, pageSize);
    const hasMore   = this._buffer.length > 0 || !this._searchDone;

    return {
      products:  delivered,
      tier:      3,
      tierLabel: 'Search results',
      isNewTier: this._lastDeliveredTier !== 3,
      hasMore,
    };
  }

  // ── Sort a scored batch according to _sortMode ─────────────────

  _sortBatch(batch) {
    switch (this._sortMode) {
      case 'newest':
        batch.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'price_asc':
        batch.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case 'price_desc':
        batch.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case 'nearest':
        if (this._loc?.lat) {
          batch.forEach(p => {
            if (p._distance == null)
              p._distance = distanceKm(this._loc.lat, this._loc.lng, p.lat, p.lng);
          });
          batch.sort((a, b) => (a._distance ?? Infinity) - (b._distance ?? Infinity));
        } else {
          batch.sort((a, b) => b._score - a._score);
        }
        break;
      default: // 'relevance'
        batch.sort((a, b) => b._score - a._score);
    }
  }

  // ── Tier fetchers (browse mode only) ──────────────────────────

  async _fetchCurrentTier(limit) {
    switch (this._currentTier) {
      case 0: return this._fetchTier0(limit);
      case 1: return this._fetchTier1(limit);
      case 2: return this._fetchTier2(limit);
      case 3: return this._fetchTier3(limit);
      default: return [];
    }
  }

  async _fetchTier0(limit) {
    const { lat, lng } = this._loc ?? {};
    if (!lat || !lng) return [];

    const lngDelta = NEARBY_LAT_DELTA / Math.cos(lat * Math.PI / 180);

    const { data = [], error } = await this._baseQuery()
      .gte('lat', lat - NEARBY_LAT_DELTA).lte('lat', lat + NEARBY_LAT_DELTA)
      .gte('lng', lng - lngDelta).lte('lng', lng + lngDelta)
      .range(this._tierOffset[0], this._tierOffset[0] + limit * 2 - 1);

    if (error) { console.warn('[Tier0]', error.message); return []; }

    this._tierOffset[0] += limit * 2;
    if (data.length < limit * 2) this._tierDone[0] = true;

    const nearby = data
      .map(p => ({ ...p, _distance: distanceKm(lat, lng, p.lat, p.lng) }))
      .filter(p => p._distance <= NEARBY_KM);

    return this._dedup(nearby, 0);
  }

  async _fetchTier1(limit) {
    const { city_id, city } = this._loc ?? {};
    if (!city_id && !city) return [];

    let q = this._baseQuery()
      .range(this._tierOffset[1], this._tierOffset[1] + limit - 1);

    q = city_id
      ? q.eq('city_id', city_id)
      : q.or(`city_name.ilike.%${city}%,location.ilike.%${city}%`);

    const { data = [], error } = await q;
    if (error) { console.warn('[Tier1]', error.message); return []; }

    this._tierOffset[1] += limit;
    if (data.length < limit) this._tierDone[1] = true;

    return this._dedup(data, 1);
  }

  async _fetchTier2(limit) {
    const { country_code, country } = this._loc ?? {};
    if (!country_code && !country) return [];

    let q = this._baseQuery()
      .range(this._tierOffset[2], this._tierOffset[2] + limit - 1);

    q = country_code
      ? q.eq('country_code', country_code)
      : q.ilike('location', `%${country}%`);

    const { data = [], error } = await q;
    if (error) { console.warn('[Tier2]', error.message); return []; }

    this._tierOffset[2] += limit;
    if (data.length < limit) this._tierDone[2] = true;

    return this._dedup(data, 2);
  }

  async _fetchTier3(limit) {
    const { data = [], error } = await this._baseQuery()
      .range(this._tierOffset[3], this._tierOffset[3] + limit - 1);

    if (error) { console.warn('[Tier3]', error.message); return []; }

    this._tierOffset[3] += limit;
    if (data.length < limit) this._tierDone[3] = true;

    return this._dedup(data, 3);
  }

  // ── Base query (browse mode) ───────────────────────────────────

  _baseQuery() {
    const f = this._filters;
    const sortMode = this._sortMode;

    let q = this._db
      .from('product_with_cover')
      .select([
        'id', 'title', 'price', 'condition', 'location', 'category',
        'sold', 'seller_id', 'cover_url', 'created_at', 'views_count',
        'seller_name', 'seller_avatar', 'seller_rating',
        'lat', 'lng', 'city_id', 'city_name', 'country_code', 'tags',
      ].join(', '))
      .eq('is_active', true);

    // Apply sort at DB level for non-relevance modes (faster)
    switch (sortMode) {
      case 'newest':
        q = q.order('created_at', { ascending: false });
        break;
      case 'price_asc':
        q = q.order('price', { ascending: true }).order('created_at', { ascending: false });
        break;
      case 'price_desc':
        q = q.order('price', { ascending: false }).order('created_at', { ascending: false });
        break;
      default:
        q = q.order('created_at', { ascending: false });
    }

    // Filter-drawer filters (browse mode — no search term)
    if (f.category)  q = q.eq('category', f.category);
    if (f.condition) q = q.eq('condition', f.condition);
    if (f.minPrice)  q = q.gte('price', parseFloat(f.minPrice));
    if (f.maxPrice)  q = q.lte('price', parseFloat(f.maxPrice));

    return q;
  }

  // ── Dedup ──────────────────────────────────────────────────────

  _dedup(rows, tier) {
    const fresh = rows.filter(p => !this._seenIds.has(p.id));
    for (const p of fresh) {
      if (this._seenIds.size >= MAX_SEEN_IDS) {
        const oldest = this._seenIds.values().next().value;
        this._seenIds.delete(oldest);
      }
      this._seenIds.add(p.id);
      p._tier = tier;
    }
    return fresh;
  }

  // ── Tier labels ────────────────────────────────────────────────

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
// buildTierDivider — UI separator HTML  (unchanged API)
// ================================================================

export function buildTierDivider(label, tier, noMore = false) {
  const icons  = { 0:'fa-location-arrow', 1:'fa-map-marker-alt', 2:'fa-flag', 3:'fa-globe' };
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
      grid-column:1/-1;display:flex;align-items:center;
      gap:10px;padding:10px 4px 6px;margin-top:4px;
    ">
      <div style="width:30px;height:30px;border-radius:50%;
           background:${color}18;display:flex;align-items:center;
           justify-content:center;flex-shrink:0;">
        <i class="fas ${icon}" style="font-size:.75rem;color:${color}"></i>
      </div>
      <div style="flex:1;min-width:0;">
        ${noMore ? `<div style="font-size:.7rem;color:var(--text-muted);margin-bottom:1px">
          No more listings nearby</div>` : ''}
        <div style="font-family:var(--font-head);font-weight:800;font-size:.8rem;
             color:${noMore ? 'var(--text-muted)' : color};
             white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${label}
        </div>
      </div>
      <div style="flex:1;height:1px;background:var(--border)"></div>
    </div>`;
}


// ================================================================
// smartSort — backward-compatible helper
// ================================================================

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
    .map(p => ({ ...p, _ptier: proximityTier(p), _score: scoreProduct(p, false) }))
    .sort((a, b) => a._ptier !== b._ptier ? a._ptier - b._ptier : b._score - a._score);
}


// ================================================================
// getProductTier — standalone classifier
// ================================================================

export function getProductTier(product, userLoc) {
  if (!userLoc || !product) return 'global';
  if (userLoc.lat && userLoc.lng && product.lat && product.lng) {
    if (distanceKm(userLoc.lat, userLoc.lng, product.lat, product.lng) <= NEARBY_KM)
      return 'nearby';
  }
  if (userLoc.city_id && product.city_id && userLoc.city_id === product.city_id)
    return 'city';
  if (userLoc.country_code && product.country_code
      && userLoc.country_code === product.country_code)
    return 'country';
  const cc  = (userLoc.country_code || '').toUpperCase();
  const pcc = (product.country_code || '').toUpperCase();
  if (COUNTRY_TO_CONTINENT[cc] && COUNTRY_TO_CONTINENT[cc] === COUNTRY_TO_CONTINENT[pcc])
    return 'continent';
  return 'global';
}