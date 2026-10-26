# Creator Studio: realizacija korak po korak

Šta se gradi i zašto je u [FUNNEL-PLAN.md](FUNNEL-PLAN.md). Ovde je **redosled rada**: šta radiš ti (nalozi, ključevi, sadržaj) i šta radim ja (kod).

Oznake: **[TI]** radiš ti u dashboard-u · **[JA]** radim ja u kodu · **[ZAJEDNO]** ti klikneš, ja proverim.

> **Ključevi nikad ne idu u chat.** Lokalno ih upisuješ u fajl `.dev.vars` (šablon je `.dev.vars.example`, fajl je u `.gitignore`). Za produkciju ih upisuješ komandom `npx wrangler secret put IME`. Ja ih vidim samo kroz kod koji ih čita.

---

## Faza 0: nalozi i ključevi (ti, ~2 sata)

Sve u **test modu** gde postoji. Live ključevi tek u Fazi 5.

### 0.1 Cloudflare [TI]
1. Napravi nalog na cloudflare.com (ako ga nemaš).
2. **Add a domain → `aiprofit.rs`**, Free plan. Cloudflare sam povuče postojeće DNS zapise.
3. **Pre nego što promeniš nameserver-e, proveri zapise:**
   - Circle zapisi (CNAME za `aiprofit.rs` / `www`, koje ti je Circle dao): **narandžasti oblak ugašen (DNS only)**. Ako ostane uključen, Circle zajednica može da prestane da radi.
   - MX i TXT zapisi za mejl: moraju da budu tu, isto kao kod sadašnjeg DNS-a.
4. Kod registra domena promeni nameserver-e na one koje ti Cloudflare da. Sačekaj da Cloudflare kaže „Active“ (obično 15 min do par sati).
5. Otvori aiprofit.rs i proveri da Circle radi.
6. **Workers & Pages → Plans → Workers Paid (5$ mesečno).** Treba zbog Queues i cron-a.
7. Javi mi kad je gotovo. Ja onda u terminalu pokrećem `npx wrangler login`, a ti odobriš u browseru.

### 0.2 Stripe [TI]
1. Uključi **Test mode** (gornji desni ugao).
2. **Developers → API keys:** kopiraj `Publishable key` (pk_test_...) i `Secret key` (sk_test_...) u `.dev.vars`.
3. **Settings → Public details:** upiši URL uslova korišćenja (`https://studio.aiprofit.rs/uslovi`). Bez toga Stripe ne dozvoljava obavezno prihvatanje uslova u checkout-u.
4. **Settings → Billing → Customer portal:** uključi „Cancel subscriptions“ (odmah ili na kraju perioda, predlog: na kraju perioda) i „Update payment methods“. Sačuvaj.
5. **Settings → Payment methods:** proveri da su uključeni Cards, Apple Pay i Google Pay.
6. Proizvode, cene i kupon **pravim ja** skriptom (0.7), da imaju tačne `lookup_key` oznake koje kod traži.
7. Pogledaj **Settings → Connect** ili listu nedavnih uplata: da li se vide Circle Paywall uplate za Lab? Javi mi da/ne (za filter u webhook-u).

### 0.3 Circle [TI]
1. **Settings → Developers → Tokens → Admin API V2:** napravi token, upiši u `.dev.vars` kao `CIRCLE_TOKEN`.
2. Napravi **access groups** (Members → Access groups):
   - `Creator Studio`
   - `Viral Hook Pack`
   - `Radionica`
   - `AI Profit Lab (Studio)`: dodaj mu **iste prostore** koje otvara Lab Paywall.
3. Napravi prostore iz plana (sekcija 7), za početak makar prazne: *Kreni ovde*, *Pitanja i pomoć*, *Ažuriranja*. Dodaj ih u access group `Creator Studio`.
4. **Settings → Paywalls → AI Profit Lab:** zapiši koji Stripe nalog je povezan (za 0.2, korak 7).
5. ID-jeve grupa i prostora **čitam ja** preko API-ja, ne moraš da ih tražiš.

### 0.4 WooCommerce na vladsdigital.com [TI]
1. **WooCommerce → Settings → Advanced → REST API → Add key:** opis „Creator Studio“, permisije **Read/Write**. Upiši `Consumer key` i `Consumer secret` u `.dev.vars`.
2. **Woo mejlovi:** ne gase se globalno (sajt prodaje i druge proizvode). Umesto toga instaliraš snippet `wordpress/studio-funnel-tihi-mejlovi.php`, koji ih gasi samo za porudžbine iz funnela.
3. Proizvode sa SKU-ovima (`CS-STUDIO`, `LAB-MESECNO`) **pravim ja** preko API-ja, kao virtuelne i sakrivene iz prodavnice.
4. Ako sajt ima Wordfence, iThemes ili sličan plugin: dozvoli `/wp-json/wc/v3`. Proverim ja prvim pozivom.

### 0.5 Mejlovi [TI]
1. **MailerLite → Integrations → API:** napravi token, upiši kao `MAILERLITE_TOKEN`. Grupe pravim ja.
2. **Transakcioni mejlovi (welcome, kod za licencu): Resend** (resend.com, besplatno do 3.000 mejlova mesečno).
   - Napravi nalog, **Domains → Add → `aiprofit.rs`** (ili `mail.aiprofit.rs`).
   - Resend da DNS zapise. Pošto je domen na Cloudflare-u, ima dugme da ih doda sam.
   - API key upiši kao `RESEND_KEY`.

### 0.6 Analitika [TI]
1. **PostHog:** nalog na **eu.posthog.com** (EU server, zbog GDPR-a), projekat „Creator Studio“. Kopiraj **Project API key** (phc_...) kao `POSTHOG_KEY`. Ovaj ključ je javan i sme u HTML.
2. **Meta Pixel + CAPI** (Faza 3): Events Manager → Pixel ID + Conversions API access token.
3. **Cloudflare Web Analytics** uključujem ja kad je sajt na Cloudflare-u.
4. **Obaveštenja o kupovini** (opciono): Telegram bot (@BotFather → token) + tvoj chat ID.

### 0.7 Podešavanje preko skripti [JA]
Kad su ključevi u `.dev.vars`, pokrećem skripte (sve u test modu):
- **Stripe:**
  - proizvodi: Creator Studio (cene `studio_launch` 67€, `studio_regular` 97€, `studio_lead` 67€), Viral Hook Pack (`hookpack` 27€), AI Profit Lab (`lab_monthly` 47€/mes)
  - kupon `PRVI_MESEC_1E` (46€ popusta, jednom)
- **Woo:** 3 proizvoda sa SKU-ovima.
- **MailerLite:** grupe `Lead – Free skill`, `Kupci – Studio`, `Lab – član`, `Lab – bivši`, `Radionica`, `Refund` + polja.
- **Circle:** čitam ID-jeve access group-a i proveravam da token radi.

---

## Faza 1: osnova i prva kupovina (ja, ~4 dana)

| # | Korak | Gotovo kad |
|---|---|---|
| 1.1 | **Cloudflare Worker projekat** [JA]: `wrangler.jsonc`, statičke stranice u `public/`, D1 baza i šema, Queue, cron. Lokalno: `npm run dev`. | stranice rade na `localhost:8787` |
| 1.2 | **`/api/checkout`** [JA]: pravi Stripe Checkout sesiju. Cenu bira server po datumu (launch/regular/evergreen), plus bump, čuvanje kartice, pristanak „bez povraćaja“, UTM i PostHog ID u `metadata`, `source: studio`. Landing dugmad vode ovde. | klik na dugme otvara Stripe test checkout |
| 1.3 | **`/api/stripe-webhook`** [JA]: proverava potpis, preskače sve bez `source: studio`, upisuje event u D1 (bez duplikata), šalje posao u Queue. | `stripe trigger` stiže i upisuje se |
| 1.4 | **Queue consumer** [JA]: za `checkout.session.completed` upisuje porudžbinu u D1, dodeljuje broj kupca (radionica ≤ 100), pa radi korake: Circle → MailerLite → welcome mejl → Woo → PostHog → obaveštenje. Svaki korak ima svoj status i ponavlja se sam ako padne. | test kupovina prođe sve korake |
| 1.5 | **Circle** [JA]: nađi ili napravi člana po mejlu, dodaj u `Creator Studio` (+ Hook Pack, + Radionica). | test kupac vidi prostor u Circle-u |
| 1.6 | **MailerLite + Resend** [JA]: upis u grupe sa poljima, welcome mejl sa linkom za Circle. | mejl stiže za < 1 min |
| 1.7 | **Woo** [JA]: kupac po mejlu, porudžbina `completed` sa SKU-ovima, stvarnom cenom, PaymentIntent ID-om, UTM-om. Bez duplikata. | porudžbina se vidi na vladsdigital.com |
| 1.8 | **`/api/order`** [JA]: hvala stranica pita server šta je kupljeno (bump, radionica, Lab) umesto test parametara iz URL-a. | hvala prikazuje prave kartice |
| 1.9 | **Noćni cron** [JA]: uporedi Stripe naplate iz poslednjih 48h sa D1 i dopuni ono što fali. | ručno pokrenut cron nađe „izgubljenu“ kupovinu |
| 1.10 | **Pravne stranice** [ZAJEDNO]: `/uslovi` (bez povraćaja posle pristupa), `/privatnost`, `/uslovi-pretplate`. Ja pravim stranice i nacrt teksta, ti proveravaš sadržaj. | linkovi u footeru i Stripe-u rade |

## Faza 2: upsell, Lab i bump (ja, ~3 dana)

| # | Korak | Gotovo kad |
|---|---|---|
| 2.1 | **Provera „već Lab član“** [JA]: Circle API po mejlu (Paywall ili access group). Ako jeste, preskače se `/ponuda`. | postojeći član ide pravo na hvala |
| 2.2 | **`/api/upsell`** [JA]: proveri plaćenu sesiju i da upsell nije već iskorišćen, napravi pretplatu (`lab_monthly` + kupon, sačuvana kartica, `source: studio`). Na 3DS vraća `requires_action`, na odbijenu karticu `declined`. | test kartica `4242`, 3DS kartica `4000 0027 6000 3184` i odbijena `4000 0000 0000 9995` daju tačne ishode |
| 2.3 | **`/ponuda` uživo** [JA]: `FUNNEL.demo = false`, Stripe.js za 3DS potvrdu. | dugme „Da“ naplaćuje 1€ bez unosa kartice |
| 2.4 | **Lab webhook-ovi** [JA]: `invoice.paid` (Circle `AI Profit Lab (Studio)` + MailerLite + Woo + PostHog), `invoice.payment_failed`, `customer.subscription.deleted` (skini pristup). | |
| 2.5 | **Customer Portal link** [JA]: `/lab/otkazi` šalje kupcu link za portal na mejl. | otkazivanje radi bez tvoje pomoći |
| 2.6 | **Stripe test clock** [JA]: simulacija 30 dana → naplata 47€ → neuspela naplata → otkazivanje. | sve tri promene se vide u Circle-u, Woo-u i PostHog-u |
| 2.7 | **Chargeback** [JA]: `charge.dispute.created` skida Studio i opoziva licencu, Lab ostaje. | |
| 2.8 | **Hook Pack sadržaj** [TI]: fajlovi + prostor u Circle-u. | |

## Faza 3: plugin licenca i install (ja + ti, ~3 dana)

Treba mi pristup repou plugina.

| # | Korak |
|---|---|
| 3.1 | [JA] `/api/license/activate` (mejl → 6-cifreni kod na mejl → aktivacija, max 2 uređaja) i `/api/license/verify`. |
| 3.2 | [JA] Paket plugina u privatnom **Cloudflare R2** bucket-u. Server ga daje tek posle provere licence. |
| 3.3 | [JA] `install.sh` (Mac) i `install.ps1` (Windows) na `studio.aiprofit.rs`. |
| 3.4 | [JA] U pluginu: pitanje za mejl i kod pri prvom pokretanju, licenca i u `doctor` komandi. |
| 3.5 | [TI] Circle lekcije 03/04 sa install komandom i snimkom. |

## Faza 4: analitika i promet (~3 dana)

| # | Korak |
|---|---|
| 4.1 | [JA] Cookie banner. PostHog i Pixel se pale posle pristanka, bez pristanka PostHog radi anonimno. |
| 4.2 | [JA] PostHog događaji na stranicama (`cta_click`, `scroll_50`, `video_play`, `faq_open`, `upsell_*`) i serverski (`checkout_started`, `purchase`, `lab_payment`, `lab_canceled`). |
| 4.3 | [JA] Dashboard-i u PostHog-u: funnel, prihod po izvoru, Lab zadržavanje, lead → kupac. |
| 4.4 | [JA] Meta Pixel + CAPI sa `event_id` deduplikacijom. |
| 4.5 | [JA] Cloudflare Web Analytics. |
| 4.6 | [JA] `/besplatno` + `/besplatno/hvala` + MailerLite forma. Lični rok 72h: potpisan link u mejlu koji checkout-u daje cenu `studio_lead`. |
| 4.7 | [TI] MailerLite automatizacije (onboarding, Lab trial, nurture, radionica). Ja pišem tekstove mejlova, ti ih ubacuješ i proveravaš. |
| 4.8 | [TI] ManyChat: STUDIO i SKILL ključne reči, linkovi sa UTM-om. |

## Faza 5: pre otvaranja (~2 dana)

| # | Korak |
|---|---|
| 5.1 | [TI] Sadržaj landinga: tvoje ime i brend, fotografija, pravi testimonijali, stilovi 6–9, `info@` mejl. |
| 5.2 | [JA] Datumi u `script.js` i env varijablama (otvaranje, kraj 67€, zatvaranje, radionica). |
| 5.3 | [ZAJEDNO] **End-to-end test u test modu**, sve kombinacije: sa/bez bump-a, Lab da/ne, već Lab član, 3DS, odbijena kartica, 101. kupac, chargeback, mobilni. |
| 5.4 | [TI] Stripe **live** ključevi (`wrangler secret put`), [JA] live proizvodi skriptom i live webhook endpoint. |
| 5.5 | [ZAJEDNO] **Prava kupovina od 1€** sa tvojom karticom (privremena cena), provera svega, pa ručni refund te jedne uplate. |
| 5.6 | [JA] Ručna rezervna kopija: dugme u `/admin` da ponovi isporuku za kupca ako nešto zapne. |
| 5.7 | Otvaranje. |

## Posle otvaranja
- Prvih 48h svakog jutra: pogledaj Stripe naplate i D1/Woo (moraju da se poklapaju) i Telegram obaveštenja.
- Posle zatvaranja launcha: `MODE=evergreen` (jedna env varijabla, bez novog koda).

---

## Gde smo sada (26.10.)

**Za sada isključeno:** order bump (Viral Hook Pack) i radionica za prvih 100. Koraci iznad koji ih pominju se preskaču.

**Urađeno**
- [x] Cloudflare: Worker na https://studio.aiprofit.rs, D1 baza, redovi, noćni cron
- [x] Circle: grupe „Reel Lab Studio“ (167621) i „AI Profit Lab (Studio Reel Lab Upsell)“ (167622), prostor „Studio Reel Lab Kurs“
- [x] Woo: proizvodi `CS-STUDIO` (#45406) i `LAB-MESECNO` (#45407), privatni i sakriveni
- [x] MailerLite: grupe „Studio Reel Lab (kupci ✅)“, „AI Profit Lab - Studio upsell (aktivni / otkazali)“ i polja `studio_datum`, `studio_cena`, `studio_izvor`
- [x] Kod isporuke posle kupovine: Circle (nalog + grupa) → MailerLite → welcome mejl (Resend) → Woo porudžbina → PostHog `purchase` → Telegram
- [x] Snippet za Woo mejlove: [wordpress/studio-funnel-tihi-mejlovi.php](wordpress/studio-funnel-tihi-mejlovi.php)

- [x] Stripe (test): proizvodi, cene, kupon `PRVI_MESEC_1E`, webhook na `studio.aiprofit.rs/api/stripe-webhook`
- [x] Test kupovina Studija uživo prošla sve korake (Circle, MailerLite, welcome mejl, Woo bez mejla kupcu, PostHog, Telegram)
- [x] **Faza 2 kod:** `/api/upsell` (pretplata 1€ pa 47€ karticom iz checkout-a, 3DS, odbijena kartica), provera „već Lab član“ (Circle grupe Paywall-a 124997 i upsell-a 167622), Lab naplate (`invoice.paid`), neuspele naplate, otkazivanje, chargeback za Studio
- [x] Test upsell-a uživo: pretplata napravljena, 1€ naplaćen, Woo porudžbina, MailerLite, PostHog, Telegram
- [x] Test otkazivanja (Lab pristup skinut, Studio ostaje, MailerLite „otkazali“, beleška u Woo-u) i Stripe test clock: 2. mesec naplaćen 47€ i obrađen
- [x] Jedan mejl umesto dva: Circle pozivnica je ugašena, novi kupac dobija lozinku u welcome mejlu (računa se iz `CIRCLE_PASSWORD_SECRET` i mejla, nigde se ne čuva); postojeći Circle član dobija „prijavi se svojim nalogom“

**Čeka tebe**
- [ ] Javni Stripe ključ (`pk_test_...`) za 3DS potvrdu na /ponuda (u wrangler.jsonc, `STRIPE_PUBLISHABLE_KEY`)
- [ ] Stripe → Settings → Public details: javni naziv firme (sada se u checkout-u vidi „VLADSDIGITAL LLC VLADIMIR STANKOVIC SOLE MBR“)
- [ ] Stripe → Customer portal → uključiti link za prijavu (za otkazivanje Lab-a bez tebe)

**Sledeće (ja):** 3DS test → Stripe test clock (naplata 47€ posle 30 dana, otkazivanje) → pravne stranice → Faza 4 (analitika na stranicama)
