# Email setup — Hops & Glory

All addresses are on `hopsandglory.au`. Each address has one job.

| Address     | Job                                                           | Where it is set                                 |
| ----------- | ------------------------------------------------------------- | ----------------------------------------------- |
| `hello@`    | Only public contact address; reply-to on every outgoing email | site_config `email_hello_to`                    |
| `orders@`   | Sender of site email; ShipEngine label contact                | site_config `email_from`, `shipping_from_email` |
| `payments@` | PayID alias only                                              | site_config `payid_alias`                       |
| `alerts@`   | Internal new-order / PayID-awaiting alerts                    | site_config `email_alerts_to`                   |

Receiving uses Cloudflare Email Routing to forward everything to one business-only Gmail inbox. Sending is Resend: the site sends through the API, and you send from Gmail through Resend SMTP. Never use a personal address anywhere.

## 1. Business inbox

1. Create a new Gmail account used only for the business (for example `hopsandglory.mail@gmail.com`). Turn on 2-step verification.

## 2. Receiving — Cloudflare Email Routing

1. Cloudflare dashboard → `hopsandglory.au` → Email → Email Routing → Enable. Accept the MX and TXT records it adds.
   - Do NOT enable Resend "Receiving" — it would replace the root MX.
   - Resend's existing `send.` / `resend._domainkey` records are unaffected.
2. Destination addresses → add the business Gmail and click the verification link sent to it.
3. Routing rules → create custom addresses `hello`, `orders`, `payments`, `alerts`, each forwarding to the business Gmail.
4. Catch-all → Drop (or forward, if you want to catch typos).
5. Test: from another account, email `hello@hopsandglory.au` and confirm it arrives.

## 3. Sending as hello@ from Gmail — Resend SMTP

1. Resend → API Keys → create key `gmail-send-as`, permission **Sending access**, domain `hopsandglory.au`. Keep it separate from the site's key so it can be revoked independently.
2. Gmail → Settings → Accounts and Import → Send mail as → Add another email address:
   - Name `Hops & Glory`, address `hello@hopsandglory.au`, untick "Treat as an alias".
   - SMTP server `smtp.resend.com`, port `465`, SSL, username `resend`, password = the API key.
3. Gmail emails a confirmation code to `hello@`, which forwards back to the inbox — enter it.
4. Set "When replying to a message: reply from the same address the message was sent to", and make `hello@` the default.
5. Repeat for `orders@` only if you want to reply as orders@.
6. Test: send to an outside address and check "Show original" shows SPF, DKIM and DMARC as PASS.

Manual sends count against the Resend free plan (3,000/month, shared with the site).

## 4. Production site_config

Set in admin → Settings → Site config (or the env vars where noted):

| Key                   | Value                                   |
| --------------------- | --------------------------------------- |
| `email_from`          | `Hops & Glory <orders@hopsandglory.au>` |
| `email_hello_to`      | `hello@hopsandglory.au`                 |
| `email_orders_to`     | `orders@hopsandglory.au`                |
| `email_alerts_to`     | `alerts@hopsandglory.au`                |
| `email_payments_to`   | `payments@hopsandglory.au`              |
| `payid_alias`         | as registered with the bank             |
| `shipping_from_email` | `orders@hopsandglory.au`                |

Env (`.env.production`): `EMAIL_FROM`, `EMAIL_REPLY_TO=hello@hopsandglory.au`, `SHIPPING_FROM_EMAIL=orders@hopsandglory.au`. site_config overrides env.

Check no key still holds a personal or `example.com` address. Owner alerts are skipped while `email_alerts_to` is unset or `@example.com`.

## 5. Verify end to end

1. Storefront footer and checkout show `hello@hopsandglory.au`.
2. Place a test order → customer email arrives; replying to it goes to `hello@`.
3. `alerts@` receives "New order #N — $X — PayID — awaiting transfer".
4. Admin → Email Log shows both sends.
