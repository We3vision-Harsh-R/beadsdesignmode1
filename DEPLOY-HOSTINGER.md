# Deploy on Hostinger (Node.js Web App)

The whole store (website + API) runs as **one Node.js app**. Data, logins and files live in Supabase, so nothing is stored on the Hostinger disk.

## How the project is laid out

```
/                      the one Node app (root package.json has all server packages)
├─ server/src/         Express API + serves the website  → entry file: server/src/index.js
├─ client/             React website source (Vite)
├─ public/             the BUILT website, committed to git (made by `npm run build`)
└─ scripts/            helper scripts (zip packaging)
```

`npm run build` builds `client/` straight into `public/`. The server serves `public/` for every page and `/api/*` for the data, so one Hostinger app gives you website + backend. Because `public/` is committed, the site works even if the host skips the build step.

## 1. Create the app

hPanel → **Websites → Add website → Node.js Apps** → **Import Git repository** (branch `main`),
or **Upload your website files** with `deploy/beads-design-hostinger.zip` (`npm run package`).

## 2. Build settings

| Setting | Value |
| --- | --- |
| Framework preset | **Express** (not Create React App / Vite / static) |
| Node.js version | 22.x |
| Root directory | `./` |
| Build command | `npm run build` |
| Package manager | npm |
| Entry file | `server/src/index.js` |
| Output directory | `public` (if the field is required; leave empty if it is not shown) |

## 3. Environment variables

Add these in the app's **Environment variables** section (or use **Import .env**). Copy the values from your local `server/.env`, but change the ones marked ✱.

| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | `https://nlsyxkpsrbmllzggpesu.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | from Supabase → API Keys |
| `SUPABASE_SECRET_KEY` ✱ | a **new** secret key (rotate the one that was shared in chat) |
| `SUPABASE_JWKS_URL` | `https://nlsyxkpsrbmllzggpesu.supabase.co/auth/v1/.well-known/jwks.json` |
| `CLIENT_URL` ✱ | `https://your-domain.com` (add `,https://www.your-domain.com` for www) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_STORE_NAME` | same values as the client `.env`; used when the website is built |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` ✱ | Razorpay **Live** keys |
| `RAZORPAY_WEBHOOK_SECRET` ✱ | secret you set in Razorpay → Webhooks |
| `UPI_ID`, `UPI_NAME` | optional, for manual UPI payments |
| `SUPPORT_EMAIL`, `SUPPORT_PHONE`, `WHATSAPP_NUMBER` | shown on the website |

Do **not** set `PORT` or `ADMIN_*`. Never upload `server/.env`.

Deploy, then open `https://your-domain.com/api/health`. It should show `{"ok":true}`, and `https://your-domain.com/` should show the website.

## 4. After the first deploy

1. **Supabase → Authentication → URL Configuration**
   - Site URL: `https://your-domain.com`
   - Redirect URLs: add `https://your-domain.com/**` and `https://www.your-domain.com/**`
2. **Supabase → Authentication → SMTP**: connect your own email so sign-up and password-reset emails are delivered.
3. **Razorpay → Webhooks**: URL `https://your-domain.com/api/payments/razorpay/webhook`, events `payment.captured` and `order.paid`.
4. **Admin login**: run `npm run create-admin` on your computer with your real `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/.env` (it writes to the same Supabase project).
5. Log in at `https://your-domain.com/admin`, add packages and designs, and place one small real payment to test.

## Updating the site later

1. Change the code, then run `npm run build` (this refreshes `public/`).
2. Commit **including `public/`** and push to GitHub. Redeploy in hPanel.
   (For the zip method: `npm run package`, then upload and redeploy.)
