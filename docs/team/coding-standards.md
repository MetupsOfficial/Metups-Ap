# Coding Standards

| Field | Value |
|-------|-------|
| **Document ID** | TEAM-006 |
| **Version** | 1.0.0 |
| **Owner** | CTO / Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Engineering] | Initial standards |

---

## Guiding Principles

1. **Clarity over cleverness** — readable code beats smart code
2. **Consistency** — follow existing patterns, don't introduce new ones without discussion
3. **Security first** — never compromise security for speed or convenience
4. **Mobile first** — every UI decision considers 320px screens and 3G connections
5. **No magic** — explicit is better than implicit

---

## JavaScript Standards

### Modules
```javascript
// Use ES Modules — always import from the singleton
import { supabaseClient } from '/shared/supabase.js';
import { checkAuth, formatPrice } from '/shared/utils.js';

// Export clearly named functions
export async function loadListings() { ... }
```

### Variable Declarations
```javascript
// Use const by default; let when reassignment is needed
const user = await checkAuth();
let page = 0;

// Never use var
```

### Async/Await
```javascript
// Always use async/await over .then().catch() chains
// Always destructure Supabase responses
const { data, error } = await supabaseClient
  .from('products')
  .select('*');

if (error) {
  handleError(error);
  return;
}
```

### Error Handling
```javascript
// Every Supabase call must check for errors
// Show user-friendly messages — never raw error objects to UI
if (error) {
  console.error('[functionName]', error.message); // dev logs only
  showToast('Something went wrong. Please try again.'); // user message
  return;
}
```

### Functions
```javascript
// Named functions over anonymous where reusable
async function handleListingSubmit(event) { ... }

// Arrow functions for callbacks and short operations
const prices = listings.map(l => l.price);
const filtered = listings.filter(l => l.city === selectedCity);
```

### Comments
- No comments for self-evident code
- One short line for non-obvious logic only
- Never explain what the code does — name functions and variables to do that

```javascript
// Bad: Fetch the user's profile
const profile = await getProfile(user.id);

// Good: (no comment needed — function name is clear)
const profile = await getProfile(user.id);

// Good comment (explains non-obvious WHY):
// Supabase anon key enforces RLS — no server-side secret needed here
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

## HTML Standards

```html
<!-- Use semantic HTML5 -->
<main>
  <article class="listing-card">
    <header>
      <h2 class="listing-title">Item Name</h2>
    </header>
    ...
  </article>
</main>

<!-- All images must have meaningful alt text -->
<img src="photo.jpg" alt="Blue Samsung Galaxy S21 front view">

<!-- Forms: always include labels -->
<label for="price">Price (USD)</label>
<input id="price" type="number" name="price" required min="0">
```

---

## CSS Standards

```css
/* Variables in :root for brand colours */
:root {
  --color-primary: #4DD9C0;
  --color-text: #1a1a1a;
  --spacing-sm: 8px;
  --spacing-md: 16px;
}

/* Mobile first — base styles are mobile */
.listing-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

/* Enhance for larger screens */
@media (min-width: 768px) {
  .listing-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* No inline styles — use classes */
/* No !important — fix specificity properly */
```

---

## Security Standards

**NEVER do:**
```javascript
// Never inject user input directly into HTML (XSS)
element.innerHTML = userInput; // DANGEROUS

// Never commit credentials
const SERVICE_ROLE_KEY = 'eyJhbGci...'; // NEVER IN CODE

// Never bypass RLS with service key in client
const adminClient = createClient(url, SERVICE_ROLE_KEY); // NEVER CLIENT-SIDE
```

**Always do:**
```javascript
// Use textContent for user content (XSS-safe)
element.textContent = userInput; // SAFE

// Sanitise before innerHTML if HTML structure is needed
element.innerHTML = sanitize(userInput); // with a trusted sanitiser

// Let Supabase RLS enforce access — don't duplicate in JS
// RLS policy handles it; no need for JS auth re-check
```

---

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| HTML pages | kebab-case | `add-product.html` |
| JS modules | kebab-case | `product-filter.js` |
| CSS files | kebab-case | `styles.css` |
| Images | kebab-case | `listing-photo.jpg` |
| SQL files | kebab-case | `metups-migration.sql` |

---

## Performance Guidelines

- Images: WebP preferred; max 1MB per listing photo
- Lazy-load images below the fold
- Avoid blocking scripts in `<head>` — use `defer` or `async`
- Minimise DOM updates — batch changes where possible
- Use `requestAnimationFrame` for animations, never `setInterval`
- Cache Supabase query results where data doesn't change often
