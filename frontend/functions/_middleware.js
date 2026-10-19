import { allListings, card, categoryCityFacets, db, facets, html, inject, listings, metadata, productPath, response, rpc, siteUrl, slugify } from './_lib/seo.js';

const SITE = 'https://metups.com';
const CATEGORIES = ['Electronics', 'Fashion', 'Furniture', 'Appliances', 'Vehicles', 'Books', 'Other'];

function xmlEscape(value = '') { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])); }
function truncateWords(value, max) {
  const text=String(value || '').replace(/\s+/g,' ').trim();
  if(text.length<=max) return text;
  const cut=text.slice(0,max+1);const boundary=cut.lastIndexOf(' ');
  return cut.slice(0,boundary>0?boundary:max).trim();
}
function errorPage(status, title, message, site = SITE) {
  const categoryLinks=CATEGORIES.map(category=>`<a href="/category/${slugify(category)}">${html(category)}</a>`).join(' · ');
  return response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${html(title)} | Metups</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="${site}/404.html"><link rel="stylesheet" href="/assets/css/styles.css"></head><body><main class="legal-page"><h1>${html(title)}</h1><p>${html(message)}</p><p><a href="/">Return to Metups</a></p><h2>Browse categories</h2><p>${categoryLinks}</p></main></body></html>`, status, { 'Cache-Control': 'public, max-age=60', 'X-Robots-Tag':'noindex, nofollow, noarchive' });
}
function listingId(slug) {
  const uuid = slug.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})-/i);
  return uuid?.[1] || slug.split('-')[0];
}
async function asset(context, path) {
  return context.env.ASSETS.fetch(new Request(new URL(path, context.request.url)));
}
function absoluteImage(row, site = SITE) { return row.image_url || `${site}/assets/icons/og-image.jpg`; }
function breadcrumb(items, site = SITE) {
  return { '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement:items.map((name,i) => ({ '@type':'ListItem', position:i+1, name:name.label, item:`${site}${name.path}` })) };
}
function productSchema(item, canonical) {
  return { '@context':'https://schema.org', '@type':'Product', name:item.title, image:item.image_url ? [item.image_url] : [], description:item.description || `${item.condition || 'Used'} ${item.title} for $${item.price} in ${item.location || 'Zimbabwe'}, Zimbabwe. Contact the seller on Metups.`, category:item.category, itemCondition:item.condition?.toLowerCase() === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition', offers:{ '@type':'Offer', url:canonical, price:String(item.price), priceCurrency:'USD', availability:item.sold ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' } };
}
async function renderProduct(context, slug, oldQueryId = '') {
  const site=siteUrl(context.env);
  const id = oldQueryId || listingId(slug);
  const rows = await listings(context.env, new URL(context.request.url).origin, { id, limit:1, includeSold:true });
  const item = rows[0];
  if (!item) {
    const statusRows=await rpc(context.env,new URL(context.request.url).origin,'metups_seo_product_status',{listing_id:id});
    const state=Array.isArray(statusRows)?statusRows[0]:null;
    const statusSoldAt=state?.sold_at?new Date(state.sold_at).getTime():0;
    if(state && (state.is_active===false || (state.sold && statusSoldAt && Date.now()-statusSoldAt>30*86400000))) return errorPage(410,'Listing no longer available','This listing has been removed.',site);
    return errorPage(404, 'Listing not found', 'This listing may have been removed or is no longer public.',site);
  }
  const soldAt = item.sold_at ? new Date(item.sold_at).getTime() : (item.updated_at ? new Date(item.updated_at).getTime() : 0);
  if (item.is_active === false || (item.sold && soldAt && Date.now() - soldAt > 30 * 86400000)) return errorPage(410, 'Listing no longer available', 'This listing has been removed.',site);
  const canonical = `${site}${productPath(item)}`;
  if (new URL(context.request.url).pathname !== new URL(canonical).pathname || oldQueryId) return Response.redirect(canonical, 301);
  const image = absoluteImage(item,site);
  const titleSuffix=' | Metups';
  const title = `${truncateWords(`${item.title} - $${item.price} in ${item.location || 'Zimbabwe'}`,60-titleSuffix.length)}${titleSuffix}`;
  const description = truncateWords(item.description || `${item.condition || 'Used'} ${item.title} for $${item.price} in ${item.location || 'Zimbabwe'}, Zimbabwe. Contact the seller on Metups.`,155);
  const more = await listings(context.env, new URL(context.request.url).origin, { category:item.category, limit:4 });
  const shellResponse = await asset(context, '/features/products/product.html');
  const shell = await shellResponse.text();
  const seoBody = `<section class="seo-server-content" id="seo-server-content"><nav aria-label="Breadcrumb"><a href="/">Home</a> &gt; <a href="/category/${slugify(item.category)}">${html(item.category)}</a> &gt; ${html(item.title)}</nav><h1>${html(item.title)}</h1><p>$${html(item.price)} · ${html(item.condition || '')} · ${html(item.location || 'Zimbabwe')}</p>${item.image_url ? `<img src="${html(image)}" alt="${html(item.title)} in ${html(item.location || 'Zimbabwe')}" width="800" height="600" fetchpriority="high">` : ''}<p>${html(item.description || '')}</p>${item.sold ? '<p><strong>This item has been sold.</strong></p>' : ''}<h2>Similar listings</h2><ul>${more.filter(x=>String(x.id)!==String(item.id)).map(x=>`<li><a href="${productPath(x)}">${html(x.title)} — $${html(x.price)}</a></li>`).join('')}</ul></section>`;
  const productData=productSchema(item,canonical);delete productData['@context'];
  const crumbData=breadcrumb([{label:'Home',path:'/'},{label:item.category,path:`/category/${slugify(item.category)}`},{label:item.title,path:productPath(item)}],site);delete crumbData['@context'];
  const graph={'@context':'https://schema.org','@graph':[productData,crumbData]};
  const doc = inject(shell.replace('<!--SEO_CONTENT-->', seoBody), metadata({ title, description, canonical, image, type:'product',supabaseUrl:context.env.SUPABASE_URL }), '', graph);
  return response(doc, 200, { 'Content-Type':'text/html; charset=utf-8' });
}
async function renderLanding(context, path, url) {
  const site=siteUrl(context.env);
  const parts = path.split('/').filter(Boolean).slice(1);
  const available=await facets(context.env,url.origin);
  const category = path.startsWith('/category/') ? available.find(x=>x.kind==='category'&&slugify(x.name)===parts[0])?.name : null;
  const citySlug = path.startsWith('/city/') ? parts[0] : (path.startsWith('/category/') ? parts[1] : null);
  if (path.startsWith('/category/') && !category) return errorPage(404,'Category not found','Choose a category from Metups.',site);
  let city = null;
  if (citySlug) {
    city = available.find(x=>x.kind==='city'&&slugify(x.name)===citySlug)?.name || null;
    if (!city) return errorPage(404,'City not found','Browse current listings across Zimbabwe.',site);
  }
  const page = Math.max(1,Math.min(100,Number(url.searchParams.get('page') || 1)));
  const matches = await listings(context.env,url.origin,{category,city,limit:24,offset:(page-1)*24});
  if (matches.length < 3) return errorPage(404,'Page not found','There are not enough current listings for this page yet.',site);
  const canonicalPath = path.replace(/\/$/,'') || '/';
  const canonical = `${site}${canonicalPath}${page > 1 ? `?page=${page}` : ''}`;
  const labelRaw = category && city ? `Used ${category} for Sale in ${city}` : category ? `Second-Hand ${category} for Sale in Zimbabwe` : `Buy & Sell Second-Hand Goods in ${city}`;
  const label = `${truncateWords(labelRaw,60-' | Metups'.length)} | Metups`;
  const desc = truncateWords(`Browse second-hand ${category || 'goods'}${city ? ` in ${city}` : ' in Zimbabwe'}. Compare current listings, conditions and prices, then contact sellers on Metups.`,155);
  const cards = matches.map((item,index)=>card(item,index)).join('');
  const categories=available.filter(x=>x.kind==='category');
  const cities=available.filter(x=>x.kind==='city').sort((a,b)=>b.count-a.count).slice(0,10);
  const links = `<p>Browse: ${categories.map(c=>`<a href="/category/${slugify(c.name)}">${html(c.name)}</a>`).join(' · ')}</p><p>Popular cities: ${cities.map(c=>`<a href="/city/${slugify(c.name)}">${html(c.name)}</a>`).join(' · ')}</p>`;
  const visibleCrumbs=`<nav aria-label="Breadcrumb"><a href="/">Home</a>${category?` &gt; <a href="/category/${slugify(category)}">${html(category)}</a>`:''}${city?` &gt; ${html(city)}`:''}</nav>`;
  const content = `<section class="seo-server-content">${visibleCrumbs}<h1>${html(category || 'Second-hand goods')}${city ? ` in ${html(city)}` : ' for sale in Zimbabwe'}</h1><p>${html(desc)}</p>${links}<div class="seo-server-listings">${cards}</div><nav aria-label="Pagination"><a href="${html(canonicalPath)}?page=${page+1}">Next page</a></nav></section>`;
  const shell = await (await asset(context,'/index.html')).text();
  const canonicalPage = `${site}${canonicalPath}${page > 1 ? `?page=${page}` : ''}`;
    const crumb=breadcrumb([{label:'Home',path:'/'},...(category ? [{label:category,path:`/category/${slugify(category)}`}]:[]),...(city ? [{label:city,path:`${category?`/category/${slugify(category)}`:'/city/'+slugify(city)}`}]:[])],site);
  delete crumb['@context'];
  const itemList={'@type':'ItemList',itemListElement:matches.map((item,index)=>({'@type':'ListItem',position:(page-1)*24+index+1,url:`${site}${productPath(item)}`}))};
  const json={'@context':'https://schema.org','@graph':[crumb,itemList]};
  const doc = inject(shell.replace('<!--SEO_CONTENT-->',content),metadata({title:label,description:desc,canonical:canonicalPage,image:`${site}/assets/icons/og-image.jpg`,supabaseUrl:context.env.SUPABASE_URL}),'',json);
  return response(doc);
}
async function xmlResponse(context, path, url) {
  const site=siteUrl(context.env);
  if (path === '/robots.txt') return new Response(`User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=3600'}});
  if (path === '/sitemap-static.xml') {
    const urls=['/','/how-it-works.html','/about.html','/buyer-safety.html','/seller-onboarding.html','/support.html','/legal/contact.html','/legal/terms-of-service.html','/legal/privacy-policy.html','/legal/cookie-policy.html','/legal/acceptable-use-policy.html','/euginebhebhe/index.html','/euginebhebhe/case-studies.html'];
    return xml(urls.map(p=>({loc:site+p})));
  }
  if (path === '/sitemap-categories.xml') {
    const out=[];const available=await facets(context.env,url.origin);
    const categories=available.filter(x=>x.kind==='category');
    const cities=available.filter(x=>x.kind==='city');
    for(const category of categories)out.push({loc:`${site}/category/${slugify(category.name)}`,lastmod:category.lastmod});
    for(const city of cities)out.push({loc:`${site}/city/${slugify(city.name)}`,lastmod:city.lastmod});
    const combinations=await categoryCityFacets(context.env,url.origin);
    if(combinations){for(const pair of combinations)out.push({loc:`${site}/category/${slugify(pair.category)}/${slugify(pair.city)}`,lastmod:pair.lastmod});}
    else for(const category of categories)for(const city of cities){const matches=await listings(context.env,url.origin,{category:category.name,city:city.name,limit:3});if(matches.length===3)out.push({loc:`${site}/category/${slugify(category.name)}/${slugify(city.name)}`,lastmod:matches[0].updated_at||matches[0].created_at});}
    return xml(out);
  }
  if (path === '/sitemap.xml') {
    const available=await facets(context.env,url.origin);
    let count=available.find(x=>x.kind==='total')?.count;
    if(count===undefined){count=0;let offset=0;while(true){const rows=await db(context.env,url.origin,'products',{select:'id',is_active:'eq.true',sold:'eq.false',limit:'1000'},[offset,offset+999]);count+=rows.length;if(rows.length<1000)break;offset+=1000;}}
    const children=['sitemap-static.xml','sitemap-categories.xml'];
    for(let i=1;i<=Math.max(1,Math.ceil(count/10000));i++)children.push(`sitemap-products-${i}.xml`);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${children.map(x=>`<sitemap><loc>${site}/${x}</loc></sitemap>`).join('')}</sitemapindex>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=3600'}});
  }
  const productMatch=path.match(/^\/sitemap-products-(\d+)\.xml$/);
  if(productMatch){const page=Number(productMatch[1]);if(page<1||page>50000)return xml([]);const rows=await allListings(context.env,url.origin,(page-1)*10000,10000);const urls=rows.map(r=>({loc:`${site}${productPath(r)}`,lastmod:r.updated_at||r.created_at,image:r.image_url}));return xml(urls,true);}
  return errorPage(404,'Not found','',site);
}
function xml(rows, images=false) {
  const body=rows.map(r=>`<url><loc>${xmlEscape(r.loc)}</loc>${r.lastmod?`<lastmod>${xmlEscape(new Date(r.lastmod).toISOString().slice(0,10))}</lastmod>`:''}${images&&r.image?`<image:image><image:loc>${xmlEscape(r.image)}</image:loc></image:image>`:''}</url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${images?' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"':''}>${body}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=3600'}});
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const site=siteUrl(context.env);
  const path = url.pathname;
  const host = url.hostname.toLowerCase();
  let forwardedScheme=url.protocol;
  try { forwardedScheme=JSON.parse(context.request.headers.get('cf-visitor') || '{}').scheme === 'http' ? 'http:' : forwardedScheme; } catch {}
  if (host === 'www.metups.com' || (forwardedScheme === 'http:' && host === 'metups.com')) return Response.redirect(`${site}${path}${url.search}`,301);
  if (path === '/index.html') return Response.redirect(`${site}/${url.search}`,301);
  if (path !== '/' && path.endsWith('/')) return Response.redirect(`${site}${path.replace(/\/+$/,'')}${url.search}`,301);
  try {
    if (path === '/robots.txt' || /^\/sitemap(?:-[^/]+)?\.xml$/.test(path)) return await xmlResponse(context,path,url);
    if (path === '/features/products/product.html') {
      const id=url.searchParams.get('id');
      if(id) return await renderProduct(context,'',id);
    }
    if (path.startsWith('/product/')) return await renderProduct(context,path.slice('/product/'.length));
    if (path.startsWith('/category/') || path.startsWith('/city/')) return await renderLanding(context,path,url);
    if (path === '/') {
      const shell=await (await asset(context,'/index.html')).text();
      const homeSchema=[{'@type':'Organization',name:'Metups',url:site,logo:`${site}/assets/icons/Metups_logo-512.png`,address:{'@type':'PostalAddress',addressLocality:'Harare',addressCountry:'ZW'},contactPoint:{'@type':'ContactPoint',email:'connect@metups.com',contactType:'customer support'},sameAs:['https://www.instagram.com/metupscommunity','https://x.com/EugineB96737']},{'@type':'WebSite',name:'Metups',alternateName:['Metups Zimbabwe'],url:site}];
      // Keep the homepage as the client application's normal marketplace UI.
      // SEO metadata and structured data remain in the document head; descriptive
      // server-rendered content belongs on dedicated category and product pages.
      const doc=inject(shell,metadata({title:'Metups | Buy & Sell Second-Hand Goods in Zimbabwe',description:'Free marketplace to buy and sell used phones, laptops, furniture, clothes and more in Harare and across Zimbabwe. List in 2 minutes. No fees.',canonical:site+'/',image:site+'/assets/icons/og-image.jpg',supabaseUrl:context.env.SUPABASE_URL}),'',{'@context':'https://schema.org','@graph':homeSchema});
      return response(doc);
    }
    if(path==='/features/profile/settings_experiment.html') return errorPage(404,'Page not found','');
    if(path.endsWith('.html')) {
      const staticResponse=await context.next();
      if(staticResponse.status===404) return errorPage(404,'Page not found','The page may have moved. Browse current Metups listings.');
      const headers=new Headers(staticResponse.headers);
      headers.set('Cache-Control','public, max-age=0, s-maxage=3600, stale-while-revalidate=3600');
      const privatePath=/^\/(?:admin(?:\/|$)|features\/(?:auth|chat|notifications|products\/(?:add_product|dashboard|product\.html)|profile|wishlist)(?:\/|$))/.test(path);
      if(privatePath) headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
      return new Response(staticResponse.body,{status:staticResponse.status,statusText:staticResponse.statusText,headers});
    }
    const result=await context.next();
    if(result.status===404 && !/\.(?:css|js|png|jpe?g|webp|svg|ico|woff2?)$/i.test(path)) return errorPage(404,'Page not found','The page may have moved. Browse current Metups listings.');
    return result;
  } catch (error) {
    console.error('SEO render failed', { path, message:error?.message });
    return new Response('Search data is temporarily unavailable. Please retry shortly.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Retry-After':'120','Cache-Control':'no-store'}});
  }
}
