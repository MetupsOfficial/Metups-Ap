# API Documentation

| Field | Value |
|-------|-------|
| **Document ID** | TECH-003 |
| **Version** | 1.0.0 |
| **Owner** | Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |

---

## Overview

Metups does not expose a custom REST or GraphQL API. All API calls go directly to **Supabase** using the Supabase JavaScript client. This document describes the API patterns used within the Metups codebase.

**Supabase API Docs:** supabase.com/docs/reference/javascript  
**Base URL:** `https://[PROJECT-REF].supabase.co`  
**Authentication:** All requests include a Bearer JWT token via the Supabase client (handled automatically)

---

## Authentication Patterns

### Sign Up
```javascript
const { data, error } = await supabaseClient.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: { data: { username: 'displayname' } }
});
```

### Sign In (Email)
```javascript
const { data, error } = await supabaseClient.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword'
});
```

### Sign In (Google OAuth)
```javascript
const { data, error } = await supabaseClient.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${window.location.origin}/features/auth/confirm.html` }
});
```

### Get Current User (Server-verified)
```javascript
const { data: { user }, error } = await supabaseClient.auth.getUser();
```

### Sign Out
```javascript
await supabaseClient.auth.signOut();
```

---

## Products API

### Fetch All Active Listings
```javascript
const { data, error } = await supabaseClient
  .from('products')
  .select(`
    id, title, description, price, category,
    condition, location, images, created_at,
    profiles!seller_id(username, avatar_url, rating_avg)
  `)
  .eq('is_active', true)
  .eq('sold', false)
  .order('created_at', { ascending: false });
```

### Full-Text Search
```javascript
const { data, error } = await supabaseClient
  .from('products')
  .select('*')
  .textSearch('search_vector', searchTerm, { type: 'websearch' })
  .eq('is_active', true);
```

### Create Listing
```javascript
const { data, error } = await supabaseClient
  .from('products')
  .insert({
    seller_id: user.id,
    title, description, price,
    category, condition, location,
    images: imageUrlArray
  })
  .select()
  .single();
```

### Upload Listing Image
```javascript
const { data, error } = await supabaseClient.storage
  .from('product-images')
  .upload(`${user.id}/${Date.now()}-${file.name}`, file, {
    cacheControl: '3600',
    upsert: false
  });
const url = supabaseClient.storage.from('product-images').getPublicUrl(data.path).data.publicUrl;
```

### Mark as Sold
```javascript
const { error } = await supabaseClient
  .from('products')
  .update({ sold: true, sold_at: new Date().toISOString() })
  .eq('id', productId)
  .eq('seller_id', user.id); // RLS double-check
```

---

## Messaging API

### Get or Create Conversation
```javascript
// Check if conversation exists
const { data: existing } = await supabaseClient
  .from('conversations')
  .select('id')
  .eq('product_id', productId)
  .eq('buyer_id', user.id)
  .single();

// Create if not exists
const { data, error } = await supabaseClient
  .from('conversations')
  .insert({ product_id, seller_id, buyer_id: user.id })
  .select()
  .single();
```

### Send Message
```javascript
const { data, error } = await supabaseClient
  .from('messages')
  .insert({ conversation_id, sender_id: user.id, content: messageText });
```

### Subscribe to New Messages (Realtime)
```javascript
const subscription = supabaseClient
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    appendMessage(payload.new);
  })
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

---

## Profile API

### Get Profile
```javascript
const { data, error } = await supabaseClient
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

### Update Profile
```javascript
const { error } = await supabaseClient
  .from('profiles')
  .update({ username, city, avatar_url })
  .eq('id', user.id);
```

---

## Error Handling Pattern

```javascript
const { data, error } = await supabaseClient.from('products').select('*');

if (error) {
  if (error.code === 'PGRST116') {
    // No rows returned — handle empty state
  } else if (error.message.includes('JWT')) {
    // Session expired — redirect to login
    window.location.href = '/features/auth/login.html';
  } else {
    console.error('[API Error]', error.message);
    showUserFriendlyError('Something went wrong. Please try again.');
  }
  return;
}
```

---

## Common Supabase Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `PGRST116` | No rows found | Handle empty state |
| `23505` | Unique constraint violation | Show "already exists" message |
| `42501` | RLS policy violation | User not authorised for this action |
| `PGRST301` | JWT expired | Redirect to login |
| `AuthSessionMissingError` | No active session | Redirect to login |
