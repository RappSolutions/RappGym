import { createFileRoute } from "@tanstack/react-router";
import { PublicFrame } from "@/components/gym/PublicFrame";
import { publicHead } from "@/lib/public-head";
export const Route = createFileRoute("/privacy")({
  head: () =>
    publicHead(
      "Privacy and training safety",
      "How RappGym handles accounts, training data, optional AI, payments and your privacy rights.",
    ),
  component: Privacy,
});
function Privacy() {
  return (
    <PublicFrame>
      <h1 className="font-display text-3xl font-bold">Privacy & training safety</h1>
      <p className="text-xs text-muted-foreground">
        Updated 2026-11-27 · Rapp Solutions AB, Sweden ·{" "}
        <a className="underline" href="mailto:gym@rappsol.com">
          gym@rappsol.com
        </a>
      </p>
      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="font-display text-xl font-bold">What RappGym is for</h2>
          <p>
            A workout diary and planning tool, not healthcare. Statistics describe what you logged,
            not a medical assessment. AI suggestions are not medical advice, diagnosis or treatment.
            Choose loads within your ability, stop for pain or dizziness and seek appropriate
            medical care when needed.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold">What we keep and why</h2>
          <p>
            Google or Microsoft supplies your account identity, name, email and any profile picture.
            We store workout plans, completed sets, training locations, equipment choices, exercise
            preferences, consent records and optional training-profile fields to run your diary and
            planning features. Profile details can include health-related information; enter only
            what you want processed. Feedback and exercise suggestions include your contact
            information and relevant diagnostics.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold">Who can see it</h2>
          <p>
            Your training log and private locations are not public. Authorised administrators can
            access data for support. Read-only user inspection records its start and end. The shared
            exercise bank, its instructions and pictures are public. Do not upload personal pictures
            or copyrighted material you cannot share.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold">Optional AI</h2>
          <p>
            AI requests run only when you ask. We send relevant training history, selected location,
            exercise information and your optional profile through Lovable's AI service to the model
            provider. Account name and email are not included, but free text can identify you; this
            is data minimisation, not guaranteed anonymisation. Requests and answers are stored in
            your history. Do not include someone else's personal data. Provider retention,
            international transfers and contractual safeguards must be confirmed before a paid
            public launch; we do not promise that every AI processing step takes place in the EU.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold">Hosting, sign-in and other services</h2>
          <p>
            Lovable hosts the app and provides its database, authentication and file storage. Google
            or Microsoft handles your sign-in under its own terms. Elastic Email processes support
            messages sent to us; email copies may remain in our mailbox. Google Fonts receives font
            requests, including the network information required to deliver fonts. Exercise pictures
            and video thumbnails can make requests to third-party image hosts when displayed.
            Exercise-video links open third-party pages when selected.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold">Payments</h2>
          <p>
            When enabled, Stripe handles payment details, receipts and subscriptions. RappGym keeps
            the Stripe customer/subscription references, access status and paid period, not your
            card number. A separate RappGym product distinguishes these payments from support for
            our other tools. Membership is tied to your app account ID; your receipt email may
            differ. Financial records may have statutory retention obligations even after an app
            account is deleted.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold">Visitor statistics and local storage</h2>
          <p>
            Lovable's analytics uses no cookies, stores nothing on your device, does not retain IP
            addresses and does not identify visitors. It records pages visited, referral sources,
            country, browser, operating system, device type, time on page, page speed, errors and
            clicks. Detailed data is kept for 90 days and daily summaries for a year. Lovable
            collects this data for us.{" "}
            <a
              href="https://lovable.dev/privacy"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Lovable's privacy policy
            </a>{" "}
            explains how it handles it.
          </p>
          <p className="mt-2">
            We record clicks and other actions for every visitor, unless your browser sends a Global
            Privacy Control signal. We count basic visit statistics for every visitor: pages
            visited, time on page, page speed and errors. This uses no cookies and does not identify
            you.
          </p>
          <p className="mt-2">
            Our hosting provider sets one strictly necessary cookie. It makes sure every page you
            load comes from the same version of the site. It holds no information about you and
            expires within 7 days. The app also stores your sign-in session, language, selected
            location and workout recovery state in browser storage to keep the app working.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold">Your choices and rights</h2>
          <p>
            You can export your completed log, remove optional profile fields or delete your entire
            account from the avatar menu. Account deletion removes live private training data and
            cancels RappGym subscriptions recorded by the app; shared exercise definitions remain
            without their creator link. It does not immediately remove backups or copies already
            delivered by email. Contact{" "}
            <a className="underline" href="mailto:gym@rappsol.com">
              gym@rappsol.com
            </a>{" "}
            to request access, correction, deletion, restriction, portability or to object to
            processing. Where consent is the legal basis, you can withdraw it. You can complain to
            Sweden's privacy authority, IMY, or your local supervisory authority.
          </p>
        </section>
      </div>
    </PublicFrame>
  );
}
