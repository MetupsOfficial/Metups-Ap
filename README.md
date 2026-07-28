# Metups WhatsApp Backend

This is the first vertical slice for the WhatsApp marketplace flow.

## What it does

- Accepts WhatsApp webhook calls at `/webhook`
- Extracts the sender phone and message body
- Parses basic buyer intent for search requests
- Queries the existing Metups Supabase products table
- Formats a concise response for WhatsApp

## Local run

```bash
npm install
cp .env.example .env
npm start
```

## Health check

```bash
curl http://localhost:3000/health
```
