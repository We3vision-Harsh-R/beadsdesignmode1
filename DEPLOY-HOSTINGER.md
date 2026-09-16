# Deploy on Hostinger (Node.js Web App)

The whole store (website + API) runs as **one Node.js app**. Data, logins and files live in Supabase, so nothing is stored on the Hostinger disk.

## 1. Create the app

hPanel → **Websites → Add website → Node.js Apps** (Business / Cloud plans)
→ choose **Upload your website files** and upload `deploy/beads-design-hostinger.zip`
(or connect the GitHub repository if you push the code there).

## 2. Build settings

| Setting | Value |
| --- | --- |
| Framework | Express / Other |
| Node.js version | 22.x (or newer) |
| Root directory | `/` (project root, where the main `package.json` is) |
| Install | `npm install` (also installs `server/` and `client/` packages) |
| Build command | `npm run build` |
| Start / entry file | `npm start` → `server/src/index.js` |

## 3. Environment variables

Add these in the app's **Environment variables** section. Copy the values from your local `server/.env`, but change the ones marked ✱.

| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | `https://nlsyxkpsrbmllzggpesu.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | from Supabase → API Keys |
| `SUPABASE_SECRET_KEY` ✱ | a **new** secret key (rotate the one that was shared in chat) |
| `SUPABASE_JWKS_URL` | `https://nlsyxkpsrbmllzggpesu.supabase.co/auth/v1/.well-known/jwks.json` |
| `CLIENT_URL` ✱ | `https://your-domain.com` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` ✱ | Razorpay **Live** keys |
| `RAZORPAY_WEBHOOK_SECRET` ✱ | secret you set in Razorpay → Webhooks |
| `UPI_ID`, `UPI_NAME` | optional, for manual UPI payments |
| `SUPPORT_EMAIL`, `SUPPORT_PHONE`, `WHATSAPP_NUMBER` | shown on the website |

Do **not** set `PORT`; Hostinger provides it. Never upload `server/.env`.

Deploy, then open `https://your-domain.com/api/health`. It should show `{"ok":true}`.

## 4. After the first deploy

1. **Supabase → Authentication → URL Configuration**
   - Site URL: `https://your-domain.com`
   - Redirect URLs: add `https://your-domain.com/**`
2. **Supabase → Authentication → SMTP**: connect your own email so sign-up and password-reset emails are delivered.
3. **Razorpay → Webhooks**: URL `https://your-domain.com/api/payments/razorpay/webhook`, events `payment.captured` and `order.paid`.
4. **Admin login**: run `npm run create-admin` on your computer with your real `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/.env` (it writes to the same Supabase project).
5. Log in at `https://your-domain.com/admin`, add packages and designs, and place one small real payment to test.

## Updating the site later

Make the changes, create a new zip (`npm run package`), and redeploy it from the app in hPanel.
