import { createFileRoute, Link } from "@tanstack/react-router";
import { useLanguage, LanguagePicker } from "@/lib/i18n";
import { ConsentPoints } from "@/components/gym/ConsentPoints";
import { CURRENT_TERMS_VERSION } from "@/lib/consent";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & data – RappGym" },
      { name: "description", content: "How RappGym by Rapp Solutions AB stores training data in the EU and handles optional anonymised AI analysis." },
      { property: "og:title", content: "Privacy & data – RappGym" },
      { property: "og:description", content: "How RappGym stores training data in the EU and handles optional anonymised AI analysis." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { t } = useLanguage();
  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("consent.pageTitle")}</h1>
        <LanguagePicker flagsOnly />
      </div>
      <p className="text-sm text-muted-foreground">{t("consent.pageIntro")}</p>
      <ConsentPoints />
      <p className="text-xs text-muted-foreground">v{CURRENT_TERMS_VERSION} · <a href="mailto:gym@rappsol.com" className="underline">gym@rappsol.com</a></p>
      <Link to="/" className="text-sm underline underline-offset-2">{t("consent.back")}</Link>
    </main>
  );
}
