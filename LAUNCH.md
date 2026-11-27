# RappGym launch checklist

## Pricing proposal, not an activated price

Price: **€4/month or €40/year** (approved), charged in EUR. Private locations with actual equipment are the paid benefit; core logging, history and exports remain free. The supporter default is 30 successful training-AI answers per UTC month, not unlimited. Free remains 10. This is not a hard limit on spending: parallel requests and admin calls still need a separate cost/concurrency budget before broad promotion.

Validate willingness to pay with the first 10–20 active users, then reconsider 39 vs 49 SEK. Do not create or activate the Stripe price before the owner confirms the price and VAT treatment. No profitability claim: model usage, hosting, support, payment fees and taxes determine actual margin.

## Stripe: existing Rapp Solutions account, separate RappGym product

Stripe integration is connected using the existing-account option; the merchant/account identity still needs confirmation before live activation. Checkout code, customer mapping, subscription storage and a signature-verified webhook are implemented but **charging is disabled**.

1. Confirm VAT collection, product tax classification, price, renewal/cancellation wording and any withdrawal-right requirements for the markets served.
2. Create a separate product named **RappGym Supporter**, with a recurring monthly SEK price. Do not reuse the other tools' donation product or price. Use `app=rappgym` metadata for reports.
3. Configure `RAPPGYM_STRIPE_PRODUCT_ID` and `RAPPGYM_STRIPE_PRICE_ID`. Product/price IDs are configuration, not private credentials.
4. Publish the code, then register `https://gym.rappsol.com/api/public/stripe-webhook` for `customer.subscription.created`, `.updated`, `.deleted`. Store its provider-issued signing secret as `RAPPGYM_STRIPE_WEBHOOK_SECRET` using the secure secret form.
5. Configure Stripe Customer Portal to permit cancellation and show the agreed terms. Separate RappGym customer objects prevent this portal from exposing subscriptions to other tools.
6. Test with Stripe test keys/price first: different receipt email, subscription renewal, duplicate/out-of-order events, failed payment, cancellation and account deletion. Use matching live/test configuration.
7. Only after those checks set `RAPPGYM_BILLING_ENABLED=true`. No value is currently set by this implementation.

Identity is the authenticated app UUID. Checkout assigns the Stripe customer server-side and stores a unique mapping; receipt email never grants access. Webhooks retrieve the current subscription from Stripe, require RappGym metadata and the configured price, then upsert by subscription ID. Manual access records are separate from automated subscriptions. In Settings → Users, verify the real Stripe payment first, then record reference and paid date range. Manual access does not automatically update on refunds: the admin must change the end date.

## Privacy and legal readiness: owner actions still required

The app has a medical disclaimer, detailed `/privacy`, explicit account-deletion confirmation and private-data erasure. This does **not** certify GDPR/legal compliance.

- Confirm controller details including postal address/company registration details, exact legal bases per purpose, sensitive/health-data consent requirements, processor agreements, database/storage region, model-provider retention and international-transfer safeguards.
- Agree and document retention schedules for dormant accounts, backups, support mail and financial records. The app erases live private training data; mailbox copies, financial records and backups are not immediately erased by that button.
- Have the policy and subscription terms reviewed for the actual launch markets. Keep the existing consent version 1 as previously requested; if new obligations require renewed explicit consent, the owner must authorise a version bump.
- Lovable visitor analytics and click tracking are enabled. The policy describes them and Google Fonts. No advertising pixel was found in the shared shell. There is no custom analytics-consent banner. Do not infer compliance from cookie-free counting.
- Confirm image publication rights before sharing the public exercise bank. Pictures referenced by active exercises can now be read anonymously; private training data is not exposed.

## Security and operations before promotion

- Authentication, role checks, RLS and CSRF middleware protect app functions; payment webhooks verify raw-body signatures. These are not a guarantee against all attacks.
- Implement/test an atomic AI reservation or spending budget to prevent concurrent requests bypassing monthly quotas. Add abuse monitoring and edge rate limits/WAF rules for login, public catalogue and billing endpoints. Do not describe hosting as DDoS-proof.
- Test account deletion on a disposable real account with populated tables, verify login is no longer possible, and verify other accounts remain intact. Private application erasure is transactional; external Stripe cancellation and Auth deletion are separate retryable steps.
- Verify two OAuth providers on the same email against actual account IDs before advising a user to pay. One UUID means one account; two UUIDs remain separate. Do not merge training histories by email.
- Check backups/restoration, incident handling, access logs and ownership of domain/Stripe/hosting accounts. Owner remains responsible for legal and business decisions.

## Distribution

1. Post a personal launch story on **jonasr.app**. Explain the training problem, show real screenshots, link to `/about` and `/exercises`, and ask for specific feedback.
2. Post on LinkedIn under Jonas's name, aimed at people who actually train, not only developer-tool users. One real workout screenshot beats an architecture diagram.
3. Invite a small pilot group first: home-gym users, hotel-gym travellers and circuit trainees. Ask whether logging is fast enough between sets, not whether they like the idea.
4. Publish a follow-up with what changed based on feedback. Ask permission before quoting users or sharing their screenshots. Avoid bulk unsolicited mail.

### Draft LinkedIn post (English)

I built another tool. This one does not write queries. It records squats.

RappGym started because I wanted to remember what I actually did at the gym without spending half the workout typing. It now handles circuits, quick set logging, workout summaries and optional AI plans. The Done button occasionally questions my life choices.

Browse the exercises without an account: https://gym.rappsol.com/exercises
Meet the app: https://gym.rappsol.com/about

I am looking for a few people willing to try it during a real workout and tell me exactly what gets in the way. Home gym, hotel gym, ordinary gym — all useful. Feedback: gym@rappsol.com

— Jonas Rapp
