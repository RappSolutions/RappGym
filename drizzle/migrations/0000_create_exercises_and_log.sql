CREATE TABLE public.exercises (
 id uuid primary key default gen_random_uuid(),
 code text not null unique,
 category text not null,
 name text not null,
 equipment text not null default '',
 variant text not null default '',
 muscles text not null default '',
 instructions text not null default '',
 dose text not null default '',
 focus text not null default '',
 sort_order int not null default 1000,
 created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read exercises" ON public.exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert exercises" ON public.exercises FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update exercises" ON public.exercises FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete exercises" ON public.exercises FOR DELETE TO authenticated USING (true);
INSERT INTO public.exercises (code,category,name,equipment,variant,muscles,instructions,dose,focus,sort_order) VALUES
('PU1','Push','Chest Press (HG)','Gymstick HG3.0','Bilateralt / Enarm','Bröst, Axlar & Triceps','Sitt med ryggen stadigt mot dynan och fatta bröstpresshandtagen i brösthöjd. Pressa handtagen rakt framåt tills armarna är nästan sträckta och håll emot lugnt tillbaka.','3–4 varv × 8–12 reps','Sänk axlarna bort från öronen i hela pressen.',0),
('PU2','Push','Sidolyft (Hantel)','Hantel','Unilateralt / Enarm','Bröst, Axlar & Triceps','Stå upprätt med hantlar längs sidorna och lätt böjda armbågar. Lyft vikterna kontrollerat rakt ut åt sidorna upp till axelhöjd och sänk långsamt tillbaka utan att svinga bålen.','3–4 varv × 10–12 reps','Låt armbågarna leda rörelsen; skonsamt för tennisarmbåge.',1),
('PU3','Push','Triceps Pushdown (HG)','Gymstick HG3.0','Bilateralt / Enarm','Bröst, Axlar & Triceps','Stå vänd mot övre trissan på HG3.0 med överarmarna låsta intill revbenen. Pressa stången eller enkelhandtaget rakt nedåt tills armbågarna är helt sträckta och spänn triceps i bottenläget.','3–4 varv × 10–12 reps','Håll överarmarna helt stilla; enbart underarmen rör sig.',2),
('PU4','Push','Band Pulls (Band)','Gummiband','Unilateralt / Enarm','Bröst, Axlar & Triceps','Håll ett gummiband framför bröstet med raka armar i axelbredd. Dra isär bandet brett åt sidorna genom att nypa ihop skulderbladen tills bandet nuddar bröstet, och bromsa lugnt tillbaka.','3–4 varv × 15–20 reps','Stärker baksida axel och hållningsmusklerna.',3),
('PU5','Push','Cable Flyes (nedre)','Gymstick HG3.0','Unilateralt / Enarm','Bröst, Axlar & Triceps','Fäst enkelhandtaget i nedre trissan och ta ett steg framåt. För armen med lätt böjd armbåge i en vid båge uppåt och inåt framför bröstet tills handen är i brösthöjd.','3–4 varv × 10–12/arm','Bra ensidig bröstkontakt utan att belasta handleden.',4),
('PU6','Push','Incline Cable Fly (HG)','Gymstick HG3.0','Unilateralt / Enarm','Bröst, Axlar & Triceps','Dra handtaget från nedre trissan snett uppåt och tvärs över kroppen mot motsatt axel. Håll bålen stilla och knip ihop övre delen av bröstet i toppläget.','3–4 varv × 10–12/arm','Tränar övre bröstmuskeln och bålstabiliteten.',5),
('PU7','Push','Stående Axelpress (Hantel)','Hantel','Bilateralt / Enarm','Bröst, Axlar & Triceps','Spänn bål och säte och håll hantlarna i axelhöjd med handflatorna framåt. Pressa vikterna rakt upp mot taket tills armarna är utsträckta och sänk kontrollerat tillbaka.','3–4 varv × 8–10 reps','Svanka inte i ländryggen i toppläget.',6),
('PU8','Push','Pec Deck – Underarm (HG)','Gymstick HG3.0','Bilateralt (skonar handled)','Bröst, Axlar & Triceps','Sitt i HG3.0 med underarmarna placerade mot de lodräta armdynorna i axelhöjd. Pressa ihop armbågar och underarmar framför bröstet tills dynorna möts, och bromsa kontrollerat tillbaka.','3–4 varv × 10–12 reps','Avlastar handled och underarmsfäste helt vid tennisarmbåge.',7),
('PU9','Push','Pec Deck – Händer (HG)','Gymstick HG3.0','Bilateralt (handgrepp)','Bröst, Axlar & Triceps','Sitt mot ryggstödet och greppa de yttre handtagen på pec-deck-armarna med lätt böjda armbågar. För händerna i en vid båge framför bröstet tills de möts och håll emot tillbaka.','3–4 varv × 10–12 reps','Ger längre rörelsebana och djupare bröststretch än PU8.',8),
('PU10','Push','High-to-Low Cable Fly','Gymstick HG3.0','Unilateralt / Enarm (övre/inre bröst)','Bröst, Axlar & Triceps','Stå med sidan mot övre trissan och håll enkelhandtaget med armen utsträckt i axelhöjd. För armen och armbågen i en båge snett nedåt och inåt framför bröstet tills handen passerar mittlinjen.','3–4 varv × 10–12/arm','Tränar övre och inre bröstmuskeln med stark slutkontraktion.',9),
('PL1','Pull','Lat Pulldown (HG)','Gymstick HG3.0','Bilateralt / Enarm','Rygg, Skuldror & Biceps','Sitt ned med låren låsta under stöddynan och greppa latsdragstången brett. Dra stången kontrollerat ned mot övre bröstet genom att föra armbågarna nedåt och bakåt, och släpp lugnt upp.','3–4 varv × 8–12 reps','Brösta upp lätt och sänk axlarna innan du börjar dra.',10),
('PL2','Pull','Enarms Hantelrodd (Hantel)','Hantel','Unilateralt / Enarm','Rygg, Skuldror & Biceps','Stöd ena knät och handen på en bänk med rak rygg. Dra hanteln upp mot höften genom att föra armbågen rakt bakåt längs sidan, och sänk vikten kontrollerat tills armen är sträckt.','3–4 varv × 8–10/arm','Neutralt grepp avlastar underarmen vid tennisarmbåge.',11),
('PL3','Pull','Hammer Curls (Hantel)','Hantel','Bilateralt / Enarm','Rygg, Skuldror & Biceps','Stå upprätt med hantlar i neutralt grepp (tummarna framåt) och armbågarna låsta intill kroppen. Böj armbågarna och lyft hantlarna upp mot axlarna utan att vrida handleden.','3–4 varv × 10–12 reps','Skonsammaste bicepsövningen vid känslig underarm.',12),
('PL4','Pull','Low Row (HG)','Gymstick HG3.0','Bilateralt / Enarm','Rygg, Skuldror & Biceps','Sitt på golvet med fötterna mot fotstödet och ryggen rak. Dra roddhandtaget in mot nedre delen av magen genom att nypa ihop skulderbladen, och släpp kontrollerat framåt igen.','3–4 varv × 10–12 reps','Håll ryggen rak och dra med armbågarna nära kroppen.',13),
('PL5','Pull','High Row (HG)','Gymstick HG3.0','Bilateralt / Enarm','Rygg, Skuldror & Biceps','Stå vänd mot övre trissan på HG3.0. Dra handtagen snett nedåt och bakåt mot övre bröstet/ansiktet med armbågarna utåt i axelhöjd, och håll emot kontrollerat tillbaka.','3–4 varv × 10–12 reps','Tränar övre rygg och baksida axel för god hållning.',14),
('PL6','Pull','Single Arm Lat High-Row (HG)','Gymstick HG3.0','Unilateralt / Enarm','Rygg, Skuldror & Biceps','Stå på knä framför övre trissan med enkelhandtag i ena handen. Dra armbågen nedåt och bakåt in mot höften samtidigt som du pressar ned skuldran, och släpp lugnt tillbaka till full sträckning.','3–4 varv × 10–12/arm','Ger full stretch i latsen och isolerar en sida i taget.',15),
('PL7','Pull','Preacher Curl (HG)','Gymstick HG3.0','Bilateralt / Enarm','Rygg, Skuldror & Biceps','Vila överarmarna stadigt mot preacher-dynan och fatta stången eller handtaget från nedre trissan. Böj armbågarna och dra vikten upp mot hakan, och sänk långsamt tillbaka utan att lyfta armbågarna.','3–4 varv × 10–12 reps','Strikt bicepsisolering helt utan fusk eller gung.',16),
('PL8','Pull','Single Rear Delt Fly (HG)','Gymstick HG3.0','Unilateralt / Enarm','Rygg, Skuldror & Biceps','Stå med sidan mot kabeln och håll handtaget med yttre handen framför bröstet. För den nästan raka armen i en vid båge rakt ut åt sidan och bakåt, och håll emot lugnt tillbaka.','3–4 varv × 12–15/arm','Tränar baksida axel med jämnt kabelmotstånd.',17),
('PL9','Pull','High Pulley Curl - Enarm','Gymstick HG3.0','Unilateralt / Enarm (biceps)','Rygg, Skuldror & Biceps','Stå med sidan mot HG3.0 och håll enkelhandtaget från övre trissan med armen rakt ut åt sidan i axelhöjd. Lås armbågen helt stilla och böj armen så att handen dras in mot tinningen/axeln.','3–4 varv × 10–12/arm','Isolerar biceps med neutralt handledsgrepp; håll armbågen uppe.',18),
('PL10','Pull','Stående Kabelcurl','Gymstick HG3.0','Bilateralt / Enarm (nedre trissa)','Rygg, Skuldror & Biceps','Stå vänd mot nedre trissan på HG3.0 med stång eller enkelhandtag. Lås överarmarna intill revbenen, böj armbågarna och curla handtaget uppåt mot axlarna utan att gunga ryggen.','3–4 varv × 10–12 reps','Ger jämnt kabelmotstånd i hela rörelsen och utmanar bålen.',19),
('LE1','Legs','Knäböj (Skivstång)','Skivstång','Bilateralt','Ben & Sätesmuskel','Placera skivstången över övre ryggen och stå axelbrett. Böj i höft och knän med stolt bröst tills låren är parallella med golvet, och tryck ifrån genom hela foten upp till stående.','3–4 varv × 8–10 reps','Håll knäna i linje med tårna och spänn bålen.',20),
('LE2','Legs','Single Leg Extension (HG)','Gymstick HG3.0','Unilateralt / Enben','Ben & Sätesmuskel','Sitt i bensparken på HG3.0 med vristen bakom fotrullen. Sträck ut ett ben i taget rakt framåt tills knät är utsträckt, håll 1 sekund i toppläget och sänk kontrollerat tillbaka.','3–4 varv × 12–15/ben','Bygger styrka och uthållighet i framsida lår inför skidåkning.',21),
('LE3','Legs','Enarms Split Squat (Hantel)','Hantel','Unilateralt / Enben','Ben & Sätesmuskel','Stå i ett långt utfallssteg med en hantel i motsatt hand mot det främre benet. Sänk bakre knät rakt nedåt mot golvet tills båda knäna har ca 90° vinkel, och pressa upp genom främre hälen.','3–4 varv × 10–12/ben','Tränar benstyrka, höftbalans och bålstabilitet samtidigt.',22),
('LE4','Legs','Single Leg Curl (HG)','Gymstick HG3.0','Unilateralt / Enben','Ben & Sätesmuskel','Stå vänd mot HG3.0 med händerna på stöddynan och hälen bakom fotrullen. Böj knät och dra hälen uppåt mot sätet ett ben i taget, och sänk långsamt tillbaka till rakt ben.','3–4 varv × 12–15/ben','Viktigt knäskydd för baksida lår inför pjäx- och skidåkning.',23),
('LE5','Legs','Tåhävningar (Hantel)','Hantel','Bilateralt / Enben','Ben & Sätesmuskel','Stå med framfoten på ett trappsteg eller en bräda. Sänk hälarna djupt nedåt för full stretch i vaden och pressa sedan upp så högt som möjligt på tå med ett kort stopp i toppen.','3–4 varv × 15–20 reps','Stärker vader och fotledsstabilitet i pjäxor.',24),
('LE6','Legs','Leg Press (HG)','Gymstick HG3.0','Bilateralt','Ben & Sätesmuskel','Sitt stadigt mot ryggdynan på HG3.0 med båda fötterna höftbrett på benpressplattan. Pressa plattan rakt framåt tills benen är nästan sträckta och håll emot kontrollerat tillbaka.','3–4 varv × 10–12 reps','Lås inte ut knäna helt i ytterläget.',25),
('LE7','Legs','Leg Extension (HG)','Gymstick HG3.0','Bilateralt','Ben & Sätesmuskel','Sitt i bensparken på HG3.0 med båda vristerna bakom fotrullen. Sparka båda benen rakt framåt samtidigt tills knäna är sträckta, spänn framsida lår och sänk lugnt tillbaka.','3–4 varv × 12–15 reps','Effektiv volymträning för lårens framsida.',26),
('LE8','Legs','Jägarvila','Matta / Kroppsvikt','Statisk låruthållighet','Ben & Sätesmuskel','Pressa ländrygg och skuldror mot en vägg och glid ner tills du har 90° vinkel i både höft- och knäled med hälarna rakt under knäna. Håll positionen statiskt med händerna fria.','3–4 varv × 45–60 sek','Bästa grenliknande mjölksyraträningen för utförsåkning.',27),
('LE9','Legs','Innerlår (Adduktorer)','Gummiband','Unilateralt','Ben & Sätesmuskel','Fäst vristmanschetten i nedre kabeln och stå med sidan mot maskinen. För det inre benet med sträckt knä rakt in framför ståbenet och bromsa lugnt tillbaka ut åt sidan.','3–4 varv × 12–15/ben','Stabiliserar knäleden och ljumskarna vid skärande svängar.',28),
('LE10','Legs','Kickback (HG)','Gymstick HG3.0','Unilateralt / Säte','Ben & Sätesmuskel','Fäst vristmanschetten i nedre trissan och håll händerna lätt på HG3.0 för balans. Pressa det arbetande benet rakt bakåt genom att spänna sätesmuskeln utan att svanka i ländryggen.','3–4 varv × 12–15/ben','Aktiverar sätesmuskeln och höftstabiliteten inför skidåkning.',29),
('CO1','Core','Crunches (Matta)','Matta / Kroppsvikt','Bål / Mage','Bål & Ländrygg','Ligg på rygg med fötterna i golvet och böjda knän. Rulla upp överkroppen så att skulderbladen lyfter från mattan genom att dra revbenen mot höften, och sänk lugnt tillbaka.','3–4 varv × 15–20 reps','Håll hakan fri från bröstet utan att dra i nacken.',30),
('CO2','Core','Plankan (Matta)','Matta / Kroppsvikt','Statisk bålstabilitet','Bål & Ländrygg','Vila på underarmar och tår med armbågarna rakt under axlarna. Håll kroppen i en rak linje från huvud till hälar genom att spänna mage och säte utan att tappa ned svanken.','3–4 varv × 30–45 sek','Andas lugnt medan du håller bålspänningen.',31),
('CO3','Core','Pallof Press (HG)','Gymstick HG3.0','Anti-rotation','Bål & Ländrygg','Stå med sidan mot kabeln och håll handtaget med båda händerna intill bröstet. Pressa händerna rakt framåt tills armarna är sträckta utan att låta kabeln vrida överkroppen i sidled.','3–4 varv × 10–12/sida','Bygger rotationsstabilitet för skidsvängar och lyft.',32),
('CO4','Core','Marklyft RDL (Skivstång)','Skivstång','Ländrygg, bål & baksida','Bål & Ländrygg','Stå höftbrett med lätt böjda knän. Skjut höften bakåt och fäll överkroppen framåt med helt rak rygg medan stången följer låren ned till mitt på smalbenen, och skjut fram höften upp igen.','3–4 varv × 10–12 reps','Stärker bålkorsetten, ländryggen och baksida lår.',33),
('CO5','Core','Cable Crunch (HG)','Gymstick HG3.0','Bål / Mage (knästående)','Bål & Ländrygg','Stå på knä framför HG3.0 och håll repet eller handtaget från övre kabeln intill huvudet/tinningarna. Runda ryggen och böj överkroppen nedåt genom att dra revbenen mot bäckenet utan att sitta bakåt med höften.','3–4 varv × 12–15 reps','Spänn magmusklerna ordentligt i bottenläget och håll höften stilla.',34);
CREATE TABLE public.log_entries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid(),
 date date not null default current_date,
 sets int not null default 1,
 code text not null,
 load text not null default '',
 reps int,
 note text,
 created_at timestamptz not null default now()
);
CREATE INDEX log_entries_user_date ON public.log_entries(user_id, date desc);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.log_entries TO authenticated;
GRANT ALL ON public.log_entries TO service_role;
ALTER TABLE public.log_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.log_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.log_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.log_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.log_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);