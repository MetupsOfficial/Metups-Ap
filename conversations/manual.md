# Metups WhatsApp conversation manual

## Stage 6 — seller listing

This flow creates one draft in `whatsapp_sessions.context.draftListing`. It must
not create a `products` row before the seller gives final confirmation and has
a linked `profiles.id`.

```text
Seller: I want to sell something
Bot:    What are you selling? (for example, "iPhone 13")

Seller: iPhone 13
Bot:    Which category best fits it?
        1. Electronics  2. Fashion  3. Furniture  4. Appliances
        5. Vehicles     6. Books    7. Other

Seller: 1
Bot:    Send 1–4 photos of the item.

Seller: [photos]
Bot:    What condition is it in?
        1. New  2. Like-New  3. Fair  4. Needs Repair

Seller: 2
Bot:    What is your asking price in USD?

Seller: 350
Bot:    Which city or area is the item in?

Seller: Harare
Bot:    Add a short description, or type SKIP.

Seller: Barely used, with charger
Bot:    Here is your listing:
        iPhone 13 — $350 — Like-New — Harare
        "Barely used, with charger"
        Reply YES to publish, CHANGE to edit, or CANCEL to discard.
```

At `YES`, a linked `profile_id` is required. A known website account is linked
by phone to its existing profile UUID. A new number transitions to Stage 8
account linking before a product or image row is inserted.

## Shared commands

- `CANCEL`: discard the active draft or search refinement and reset to idle.
- `CHANGE`: return a listing draft to the field-selection prompt.
- `SKIP`: accepted only for optional listing description.
