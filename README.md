# Sigma Tex Engineering — Vercel version

Static website (Home, About Us, Services, Contact Us) plus one serverless function that emails contact-form enquiries.

```
index.html, about.html, services.html, contact.html   ← the pages (clean URLs: /about, /services, /contact)
assets/                                                ← CSS, JS, images
api/enquiry.js                                         ← contact form → email (Nodemailer + Gmail)
api/_services.json, api/_company.json                  ← data used by the function
vercel.json, package.json
```

## Environment variables (required)
Set in Vercel → Project → Settings → Environment Variables, then redeploy:

| Name | Value |
|---|---|
| `SMTP_USER` | `sigmatex2018@gmail.com` |
| `SMTP_PASS` | 16-character Gmail App Password (Google Account → Security → 2-Step Verification → App passwords) |
| `MAIL_TO` | `sigmatex2018@gmail.com` (comma-separate for more recipients) |

Optional: `SMTP_HOST` (default `smtp.gmail.com`), `SMTP_PORT` (default `465`), `SEND_AUTOREPLY=false` to stop the confirmation email to customers.

## Important: project root
`index.html`, `vercel.json` and the `api/` folder must be at the **top level** of what Vercel deploys.
If your GitHub repository contains a `sigmatex-vercel/` folder instead, open Vercel → Project → Settings → General →
**Root Directory**, set it to `sigmatex-vercel`, and redeploy. (The pages now use relative paths, so the design loads
either way — but the contact-form function only runs when the root is set correctly.)

## Deploy — option A: Vercel CLI
```
cd sigmatex-vercel
npx vercel            # first time: log in, accept defaults → preview URL
npx vercel env add SMTP_USER production
npx vercel env add SMTP_PASS production
npx vercel env add MAIL_TO production
npx vercel --prod     # live URL
```

## Deploy — option B: GitHub + Vercel dashboard
1. Create a GitHub repository and upload the contents of this folder (not `node_modules`).
2. Vercel → Add New → Project → Import the repository. Framework preset: **Other**. No build command.
3. Add the environment variables above, then Deploy. Every push to GitHub redeploys automatically.

## Custom domain
Vercel → Project → Settings → Domains → add e.g. `sigmatexengineering.com` and follow the DNS instructions shown.

## Editing content
The pages are generated from the PHP version of the site. Small text changes can be made directly in the `.html` files.
Enquiries are delivered by email only (Vercel has no permanent disk, so there is no CSV log in this version).
