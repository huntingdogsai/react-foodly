# React Foodly (standalone, no SDK)

A real React + Vite commerce demo — sign in, products, favourites, cart, checkout — mirroring
`examples/flutter-foodly`'s flow and sharing its backend contract. **It contains no Operator SDK**: it is
the "customer app that never integrated" case, so the watchdog build adds the SDK automatically (CDP reads
the web DOM, so a web run needs nothing injected; the clean app is what proves auto-inject on the other
platforms).

## Run it

```bash
# 1. the shared backend (same contract as every Foodly demo)
node ../foodly-backend/server.mjs --port=8787

# 2. the app
npm install
npm run dev          # http://localhost:4173
# or: npm run build  → dist/   (what the hosted runner builds)
```

Point the app at a different backend with `VITE_FOODLY_API`.

## The flow

Sign in (any email with `@` + a 4+ char password) → Home (search, Favourites kept **on the device** in
`localStorage`, the menu with a heart + Add per product) → Cart → Checkout (name, phone, address, promo
`SAVE10`) → Order confirmed.

Favourites persist client-side on purpose: a QA run can show the UI marking a favourite while storage is
empty if the save was dropped — the kind of defect pixels alone miss.
