import { useLanguage } from "@/lib/i18n";

const POINTS = ["data", "login", "ai", "control"] as const;

/** Consent/privacy bullet points; shared by the consent dialog and the public /privacy page. */
export function ConsentPoints() {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <ul className="list-disc space-y-2 pl-5 text-sm">
        {POINTS.map((k) => (
          <li key={k}>
            <strong className="font-semibold text-foreground">
              {t(`consent.points.${k}.label`)}:
            </strong>{" "}
            {t(`consent.points.${k}.text`)}
          </li>
        ))}
      </ul>
      <p className="text-sm leading-relaxed">
        <strong>{t("consent.medicalTitle")}:</strong> {t("consent.medicalText")}
      </p>
    </div>
  );
}
