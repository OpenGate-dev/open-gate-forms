# Open Gate Forms

Backend for the Open Gate store forms, running on Vercel.

- `POST /api/brief`: the pre-checkout project brief. It checks the answers, blocks spam and emails the team.
- `POST /api/withdrawal`: Right of Withdrawal notice. The client gets a confirmation with a reference number (WD-XXXXXX), and the team gets the full details with a 14-day deadline.
- `GET /api/health`: shows whether the backend is live and which notifications are set up.
- `shopify/`: both forms as theme sections (`og-*-form.liquid`) and as Custom Liquid versions (`*-custom-liquid.liquid`).

**Client confirmations need the open-gate.us domain verified in Resend.** Without it, Resend only delivers to your own account address. If a client confirmation fails, the team email says so, and the client is told to save their reference number.

## How a submission flows

1. The client fills in the form on open-gate.us and presses **Submit**.
2. The form saves the brand name, design style, full name, email and consent time to the cart, so they appear on the order in Shopify admin.
3. The form sends the brief to `/api/brief`. The backend emails **info@open-gate.us**, with reply-to set to the client, and can also ping Telegram.
4. The client sees the thank-you popup, then goes to `/checkout` automatically after 3 seconds.

If the backend is unreachable, the client still goes to checkout, so a sale is never blocked, and the brief is still saved on the order.

## Setup (one time)

### 1. Vercel
1. In Vercel: **Add New → Project → Import** `OpenGate-dev/open-gate-forms`.
2. Leave the framework preset on **Other** and press **Deploy**.
3. Open `https://<your-project>.vercel.app/api/health`. You should see `"ok": true`.

### 2. Email (Resend)
1. Create a free account at resend.com.
2. **Domains → Add domain →** `open-gate.us`, then add the DNS records it shows wherever the domain's DNS is managed.
3. **API Keys → Create API key** (sending access).

### 3. Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Example | Required |
|---|---|---|
| `RESEND_API_KEY` | `re_...` | yes |
| `NOTIFY_TO` | `info@open-gate.us` (comma-separate for more) | no, defaults to info@open-gate.us |
| `NOTIFY_FROM` | `Open Gate Forms <forms@open-gate.us>` | yes, once the domain is verified |
| `TELEGRAM_BOT_TOKEN` | from @BotFather | optional |
| `TELEGRAM_CHAT_ID` | your chat id | optional |
| `ALLOWED_ORIGINS` | extra sites allowed to submit, comma-separated | optional |

After changing variables, use **Deployments → Redeploy**.

Until the domain is verified, Resend can only send from `onboarding@resend.dev` to the email address you signed up with. That's fine for a first test.

### 4. Shopify
1. **Online Store → Themes → … → Edit code → Sections → Add a new section**, name it `og-brief-form`, and paste in the contents of `shopify/og-brief-form.liquid`.
2. **Customize**, open the page where clients fill in the brief, and **Add section → OG Project brief form**.
3. Set **Backend URL** to `https://<your-project>.vercel.app/api/brief`, then save.

## Develop

```bash
npm test   # runs the API handler with a mocked email service
```
