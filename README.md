# Beads Design - Embroidery Design Download Store

A website for selling computer / machine embroidery design files (EMB, DST, PES, JEF, …) with an admin panel.
Built with React (Vite), Express and **Supabase** (Postgres database, Auth and Storage). Works on phones, tablets and laptops.

## How it fits together

```
Browser (React)  ──login / sign up──▶  Supabase Auth
      │
      └──API calls with the Supabase login token──▶  Express server  ──secret key──▶  Supabase Postgres + Storage
```

- **Supabase Auth** handles sign up (with email confirmation), login and password reset.
- **Express** checks the login token, applies all business rules (prices, payments, download access) and talks to Supabase with the secret key.
- **Database tables** have Row Level Security on and no public policies, so the public key in the browser cannot read store data directly.
- **Storage:** design files are in the private bucket `design-files` and are only given out as 60-second signed links after an access check. Preview photos are in the public bucket `design-images`.

## What customers get

- Search by design ID, filters (category, machine, stitches, colours, format, free/paid)
- Design page with file types, price and a details table (stitches, area, height, width, colours)
- Free designs (after login), cart and checkout for paid designs
- **Download packages**: daily limit or total limit, with validity
- Payment: **Razorpay** (instant) and/or **manual UPI** (QR code + UTR, admin approves)
- **My downloads** with every owned design and the package quota left
- App-style bottom menu on phones

## What the admin gets (`/admin`)

- Dashboard: revenue, 30-day chart, UPI payments to review, downloads, top designs
- Designs: upload files and photos, details table, price/free, live/hidden, featured. IDs are automatic (1001, 1002, …)
- Orders: approve UPI payments, mark failed, refund (removes access), notes
- Packages, categories, customers

## Database (Supabase project `nlsyxkpsrbmllzggpesu`)

| Table | Holds |
| --- | --- |
| `profiles` | One row per login: name, email, phone, role (`user` / `admin`). Created automatically on sign up |
| `categories` | Design categories |
| `designs` | Designs, their files (JSON) and details table (JSON) |
| `packages` | Download packages for sale |
| `orders` | Orders and payment status |
| `subscriptions` | Packages a customer bought |
| `unlocks` | Which customer can download which design, and how |

You can browse and edit the data in the Supabase dashboard → **Table Editor**.

## Setup

Requirements: Node.js 20 or newer.

```bash
npm run install-all
```

**`server/.env`** (copy from `server/.env.example`):

| Setting | What to put |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL` | From Supabase → Project Settings → API Keys. **Never** put the secret key in the client |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Your admin login (password at least 8 characters) |
| `UPI_ID`, `UPI_NAME` | Your UPI ID for manual payments |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay keys for instant online payment (optional) |
| `SUPPORT_EMAIL`, `SUPPORT_PHONE`, `WHATSAPP_NUMBER` | Shown on the website |
| `CLIENT_URL` | Website address(es) allowed to call the API |

**`client/.env`** (copy from `client/.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and optionally `VITE_STORE_NAME`.

```bash
npm run create-admin   # creates the admin login in Supabase Auth (or resets its password)
npm run seed           # starter design categories
npm run dev            # API on :5000 + website on http://localhost:5173
```

### Supabase dashboard settings

1. **Authentication → URL Configuration**: set **Site URL** to your website (`http://localhost:5173` while testing) and add
   `http://localhost:5173/**` and `https://yourdomain.com/**` to **Redirect URLs**. Confirmation and password-reset emails use these.
2. **Authentication → Emails → SMTP**: the built-in email service only sends a few emails per hour. Add your own SMTP (e.g. Gmail/Zoho/Resend) before going live.
3. **Authentication → Providers → Email**: keep "Confirm email" on.

## Put it online

Step-by-step Hostinger guide: [DEPLOY-HOSTINGER.md](DEPLOY-HOSTINGER.md)

The Express server also serves the built website, so you deploy one Node.js app. Files and data live in Supabase, so no persistent disk is needed.

```bash
npm run install-all
npm run build
NODE_ENV=production npm start
```

Checklist:
- All `server/.env` values set on the host, `NODE_ENV=production`, `CLIENT_URL=https://yourdomain.com`
- `client/.env` values present at build time
- Supabase URL settings updated with your domain (see above)
- Review the Policies page text (`client/src/pages/Policies.jsx`)
- Supabase free projects pause after a week without activity; upgrade to Pro for a live store (it also adds daily backups)

## Scripts (from the project root)

| Command | What it does |
| --- | --- |
| `npm run dev` | Start API and website together for development |
| `npm run build` | Build the website into `client/dist` |
| `npm start` | Start the production server |
| `npm run create-admin` | Create the admin login, or reset its password from `.env` |
| `npm run seed` | Add the starter design categories |
| `npm run package` | Create the zip for Hostinger (see DEPLOY-HOSTINGER.md) |

## Ideas for later
- Razorpay webhook, so payments are confirmed even if the customer closes the browser
- Watermarked preview images
- Email or WhatsApp message when an order is approved
- Bulk upload of many designs at once
