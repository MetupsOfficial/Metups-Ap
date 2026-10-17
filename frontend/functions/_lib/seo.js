const SITE = 'https://metups.com';
const BUCKET = 'product_images';

export function slugify(value = '') {
  return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/g, '');
}
export function siteUrl(env = {}) { return String(env.SITE_URL || SITE).replace(/\/+$/, ''); }

export function html(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

async function config(env, origin) {
  let url = env.SUPABASE_URL;
  let key = env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase public configuration is unavailable');
  return { url: url.replace(/\/$/, ''), key };
}

export async function db(env, origin, table, params = {}, range = null) {
  const { url, key } = await config(env, origin);
  const target = new URL(`${url}/rest/v1/${table}`);
  for (const [name, value] of Object.entries(params)) target.searchParams.set(name, value);
  const headers = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
  if (range) { headers.Range = `${range[0]}-${range[1]}`; headers['Range-Unit'] = 'items'; }
  const response = await fetch(target, { headers, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Supabase ${table} query failed (${response.status})`);
  return response.json();
}

export async function rpc(env, origin, functionName, args = {}) {
  const { url, key }=await config(env,origin);
  const response=await fetch(`${url}/rest/v1/rpc/${encodeURIComponent(functionName)}`,{
    method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify(args),signal:AbortSignal.timeout(10000)
  });
  if(!response.ok) return null;
  return response.json();
}

export async function allListings(env, origin, start = 0, count = 10000) {
  const rows=[];
  while(rows.length<count){
    const size=Math.min(1000,count-rows.length);
    const batch=await listings(env,origin,{limit:size,offset:start+rows.length});
    rows.push(...batch);
    if(batch.length<size) break;
  }
  return rows;
}

export async function facets(env, origin) {
  const facetRows=await rpc(env,origin,'metups_seo_public_facets');
  if(facetRows!==null)return facetRows.map(row=>({kind:row.kind,name:row.name,count:Number(row.listing_count),lastmod:row.lastmod||null}));
  const groups=new Map();
  for(let start=0;start<100000;start+=1000){
    const batch=await db(env,origin,'products',{select:'category,location',is_active:'eq.true',sold:'eq.false',limit:'1000'},[start,start+999]);
    for(const row of batch){
      for(const [kind,value] of [['category',row.category],['city',row.location]]){
        if(!value) continue;
        const key=`${kind}:${value}`;groups.set(key,(groups.get(key)||0)+1);
      }
    }
    if(batch.length<1000) break;
  }
  return [...groups].map(([key,count])=>{const [kind,...rest]=key.split(':');return {kind,name:rest.join(':'),count};}).filter(item=>item.count>=3);
}

export async function categoryCityFacets(env,origin){
  const rows=await rpc(env,origin,'metups_seo_category_city_facets');
  return rows===null?null:rows.map(row=>({...row,listing_count:Number(row.listing_count),lastmod:row.lastmod||null}));
}

export async function listings(env, origin, { id, category, city, offset = 0, limit = 24, includeSold = false } = {}) {
  if(!id){
    const publicRows=await rpc(env,origin,'metups_seo_public_listings',{
      p_offset:offset,p_limit:Math.min(limit,1000),p_category:category||null,p_city:city||null
    });
    if(publicRows!==null){
      const {url}=await config(env,origin);
      return publicRows.map(row=>({...row,image_url:row.image_url?(/^https:\/\//i.test(row.image_url)?row.image_url:`${url}/storage/v1/object/public/${BUCKET}/${row.image_url.split('/').map(encodeURIComponent).join('/')}`):''}));
    }
  }
  const filters = { select: 'id,title,description,price,condition,location,category,sold,is_active,created_at,updated_at,sold_at', order: 'updated_at.desc.nullslast,created_at.desc', limit: String(limit) };
  if (!id) { filters.is_active = 'eq.true'; if (!includeSold) filters.sold = 'eq.false'; }
  if (id) filters.id = `eq.${id}`;
  if (category) filters.category = `eq.${category}`;
  if (city) filters.location = `eq.${city}`;
  const rows = await db(env, origin, 'products', filters, [offset, offset + limit - 1]);
  if (!rows.length) return [];
  const { url, key } = await config(env, origin);
  const ids = rows.map(r => r.id);
  const imageRows=[];
  for(let start=0;start<ids.length*10;start+=1000){
    const batch=await db(env,origin,'product_images',{
      select:'product_id,image_url,image_order,created_at',product_id:`in.(${ids.join(',')})`,
      order:'image_order.asc,created_at.asc',limit:'1000'
    },[start,Math.min(start+999,ids.length*10-1)]);
    imageRows.push(...batch);
    if(batch.length<1000) break;
  }
  const first = new Map();
  for (const row of imageRows) if (!first.has(String(row.product_id))) {
    first.set(String(row.product_id), /^https:\/\//i.test(row.image_url) ? row.image_url : `${url}/storage/v1/object/public/${BUCKET}/${row.image_url.split('/').map(encodeURIComponent).join('/')}`);
  }
  return rows.map(row => ({ ...row, image_url: first.get(String(row.id)) || '' }));
}

export function productPath(item) { return `/product/${encodeURIComponent(item.id)}-${slugify(item.title)}`; }
export function card(item, index = 1) {
  const title = html(item.title || 'Listing');
  const location = html(item.location || 'Zimbabwe');
  const image = item.image_url
    ? `<img src="${html(item.image_url)}" alt="${title} in ${location}" width="640" height="480" loading="${index===0?'eager':'lazy'}"${index===0?' fetchpriority="high"':''}>`
    : '';
  return `<a class="seo-listing-card" href="${productPath(item)}">${image}<span><strong>${title}</strong><br>$${html(item.price)} · ${html(item.condition || '')}<br>📍 ${location}</span></a>`;
}

export function metadata({ title, description, canonical, image = `${SITE}/assets/icons/og-image.jpg`, type = 'website', supabaseUrl = '' }) {
  const fields = [
    ['name','description',description], ['name','robots','index,follow,max-image-preview:large'],
    ['property','og:type',type], ['property','og:site_name','Metups'], ['property','og:title',title],
    ['property','og:description',description], ['property','og:url',canonical], ['property','og:image',image],
    ['property','og:image:alt',title], ['property','og:locale','en_ZW'], ['name','twitter:card','summary_large_image'],
    ['name','twitter:title',title], ['name','twitter:description',description], ['name','twitter:image',image]
  ];
  const tags = fields.map(([kind,name,content]) => `<meta ${kind}="${name}" content="${html(content)}">`).join('\n');
  const preconnect=supabaseUrl?`<link rel="preconnect" href="${html(new URL(supabaseUrl).origin)}" crossorigin>`:'';
  return `<title>${html(title)}</title><link rel="canonical" href="${html(canonical)}">${tags}${preconnect}`;
}

export function inject(shell, meta, body, json = null) {
  let htmlDoc = shell.replace(/<title>[\s\S]*?<\/title>/i, '').replace(/<link\s+rel=["']canonical["'][^>]*>/ig, '')
    .replace(/<meta\s+(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/ig, '');
  htmlDoc = htmlDoc.replace('</head>', `${meta}${json ? `<script type="application/ld+json">${jsonLd(json)}</script>` : ''}\n</head>`);
  if (body) htmlDoc = htmlDoc.replace('<!--SEO_CONTENT-->', body);
  return htmlDoc;
}

export function response(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600', ...headers } });
}
