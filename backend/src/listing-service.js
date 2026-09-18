import { LISTING_CATEGORIES, LISTING_CONDITIONS } from './seller-flow.js';

const IMAGE_BUCKET = 'product_images';
const MAX_IMAGES = 4;
const DEFAULT_DUPLICATE_WINDOW_HOURS = 24;

export class RecentDuplicateListingError extends Error {
  constructor(product) {
    super('A similar recent listing already exists');
    this.name = 'RecentDuplicateListingError';
    this.code = 'recent_duplicate_listing';
    this.product = product;
  }
}

export function resolveDuplicateWindowHours(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_DUPLICATE_WINDOW_HOURS;
}

/** Finds an active same-seller title/price match inside the configured window. */
export async function findRecentDuplicate(supabase, draft, profileId, options = {}) {
  const hours = resolveDuplicateWindowHours(options.windowHours);
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from('products')
    .select('id,title,price,created_at')
    .eq('seller_id', profileId)
    .eq('price', Number(draft.price))
    .eq('is_active', true)
    .ilike('title', escapeLike(draft.title.trim()))
    .gte('created_at', since)
    .limit(1);
  if (error) throw new Error(`Unable to check recent listings: ${error.message}`);
  return data?.[0] ?? null;
}

/**
 * Validate the draft at the persistence boundary. The conversational flow also
 * validates answers, but this prevents a stale or tampered session from
 * creating a product that the website could not have created.
 */
export function validateListingDraft(draft) {
  if (!draft || typeof draft !== 'object') return 'Listing draft is missing';
  if (!String(draft.title ?? '').trim()) return 'Listing title is required';
  if (!LISTING_CATEGORIES.includes(draft.category)) return 'Listing category is invalid';
  if (!Array.isArray(draft.mediaIds) || draft.mediaIds.length < 1 || draft.mediaIds.length > MAX_IMAGES) {
    return `A listing needs between 1 and ${MAX_IMAGES} images`;
  }
  if (!LISTING_CONDITIONS.includes(draft.condition)) return 'Listing condition is invalid';
  if (!Number.isFinite(Number(draft.price)) || Number(draft.price) < 0) return 'Listing price is invalid';
  if (!String(draft.location ?? '').trim()) return 'Listing location is required';
  return null;
}

/**
 * Publish one verified seller draft into the same product and storage records
 * the website uses. WhatsApp media IDs are short-lived, so the media is copied
 * into Metups storage before the draft session is cleared.
 */
export async function publishWhatsappListing(supabase, draft, profileId, env = {}, dependencies = {}) {
  const validationError = validateListingDraft(draft);
  if (validationError) throw new Error(validationError);
  if (!profileId) throw new Error('A linked seller profile is required');
  if (!env.WHATSAPP_TOKEN) throw new Error('WhatsApp media configuration is missing');
  if (!dependencies.allowRecentDuplicate) {
    const duplicate = await findRecentDuplicate(supabase, draft, profileId, {
      windowHours: env.DUPLICATE_LISTING_WINDOW_HOURS,
    });
    if (duplicate) throw new RecentDuplicateListingError(duplicate);
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      seller_id: profileId,
      title: draft.title.trim(),
      description: String(draft.description ?? '').trim() || 'No description provided.',
      price: Number(draft.price),
      condition: draft.condition,
      category: draft.category,
      location: draft.location.trim(),
      shipping_available: false,
      is_active: true,
      sold: false,
      source: 'whatsapp',
    })
    .select('id')
    .single();
  if (productError || !product) throw new Error(`Unable to create listing: ${productError?.message ?? 'unknown error'}`);

  const uploadedPaths = [];
  try {
    for (const [index, mediaId] of draft.mediaIds.entries()) {
      const media = await downloadWhatsAppMedia(String(mediaId), env, dependencies.fetch ?? fetch);
      const path = `users/${profileId}/${product.id}/whatsapp-${index + 1}.${extensionForMime(media.mimeType)}`;
      const { error: uploadError } = await supabase.storage.from(IMAGE_BUCKET).upload(path, media.blob, {
        contentType: media.mimeType,
        upsert: false,
      });
      if (uploadError) throw new Error(`Unable to upload listing image: ${uploadError.message}`);
      uploadedPaths.push(path);

      const { error: imageError } = await supabase.from('product_images').insert({
        product_id: product.id,
        image_url: path,
        image_order: index,
      });
      if (imageError) throw new Error(`Unable to save listing image: ${imageError.message}`);
    }
    return { productId: product.id, imagePaths: uploadedPaths };
  } catch (error) {
    // Never expose a partly uploaded listing to buyers. Storage cleanup is best
    // effort; inactive products remain available to an administrator for audit.
    await supabase.from('products').update({ is_active: false }).eq('id', product.id);
    if (uploadedPaths.length) await supabase.storage.from(IMAGE_BUCKET).remove(uploadedPaths);
    throw error;
  }
}

async function downloadWhatsAppMedia(mediaId, env, fetchImpl) {
  const version = env.WHATSAPP_GRAPH_API_VERSION || 'v22.0';
  const headers = { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` };
  const metadataResponse = await fetchImpl(`https://graph.facebook.com/${version}/${encodeURIComponent(mediaId)}`, { headers });
  if (!metadataResponse.ok) throw new Error(`Unable to retrieve WhatsApp image metadata: ${metadataResponse.status}`);
  const metadata = await metadataResponse.json();
  if (!metadata?.url) throw new Error('WhatsApp image metadata did not include a download URL');

  const imageResponse = await fetchImpl(metadata.url, { headers });
  if (!imageResponse.ok) throw new Error(`Unable to download WhatsApp image: ${imageResponse.status}`);
  return {
    blob: await imageResponse.blob(),
    mimeType: metadata.mime_type || imageResponse.headers.get('content-type') || 'image/jpeg',
  };
}

function extensionForMime(mimeType) {
  return ({ 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' })[String(mimeType).toLowerCase()] || 'jpg';
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, '\\$&');
}
