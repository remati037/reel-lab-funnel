# Analitika i promet: uputstvo

Šta se meri, kako da obeležiš linkove i šta treba da podesiš u PostHog-u, Meta-i i MailerLite-u.

## 1. Linkovi sa UTM oznakama

Svaki link koji objaviš nosi oznake, da se u PostHog-u i Stripe-u vidi odakle je kupac došao. Oznake prate kupca kroz landing, checkout i kupovinu.

| Oznaka | Šta upisuješ | Primer |
|---|---|---|
| `utm_source` | platforma | `instagram`, `tiktok`, `youtube`, `meta-ads`, `mailerlite` |
| `utm_medium` | kanal | `manychat`, `bio`, `story`, `paid`, `email` |
| `utm_campaign` | kampanja ili ključna reč | `STUDIO`, `SKILL`, `launch-nov` |
| `utm_content` | **koji rils ili oglas** | `rils-0412-hook-capcut`, `ad-v3-video` |

Pravilo za `utm_content`: datum (mmdd) + kratak opis rilsa. Tako u dashboard-u vidiš koji rils je doneo novac.

### ManyChat
**STUDIO** (komentar „STUDIO“, ide pravo na prodaju):
```
https://studio.aiprofit.rs/?utm_source=instagram&utm_medium=manychat&utm_campaign=STUDIO&utm_content=rils-MMDD-opis
```
**SKILL** (komentar „SKILL“, besplatni skill i nurture):
```
https://studio.aiprofit.rs/besplatno?utm_source=instagram&utm_medium=manychat&utm_campaign=SKILL&utm_content=rils-MMDD-opis
```
Link u bio-u:
```
https://studio.aiprofit.rs/?utm_source=instagram&utm_medium=bio
```
Meta oglasi: u Ads Manager-u → URL parameters:
```
utm_source=meta-ads&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
```

## 2. Besplatni skill (`/besplatno`) i lični rok

1. Prijava ide u MailerLite grupu **„Studio Reel Lab - besplatni skill (lead)“**.
2. Svaki lead dobija dva polja:
   - `studio_ponuda_link`: lični link za checkout sa cenom **67€**,
   - `studio_ponuda_do`: datum do kog važi (7 dana od prijave).
3. U nurture mejlovima D4, D6 i D7 dugme vodi na `{$studio_ponuda_link}`. Link je potpisan: radi samo do roka, ne može da se izmeni, a na checkout-u pokazuje „Tvoja lična cena“ sa odbrojavanjem i unapred upisanim mejlom.
4. **Ti:** u MailerLite-u napravi automatizaciju „kad se pridruži grupi → D0…D7“ (tekstovi su u FUNNEL-PLAN.md, sekcija 1). Kad lead kupi, izbaci ga iz automatizacije (uslov: član grupe „AI Video Editor (kupci ✅)“).
5. **Ti:** na `/besplatno-hvala` upiši prave komande za instalaciju skill-a (`public/besplatno-hvala.html`, objekat `SKILL` na dnu).

## 3. PostHog: šta se šalje

| Događaj | Odakle | Kada |
|---|---|---|
| `$pageview`, `$pageleave` | sve stranice | svaka poseta |
| `cta_click` (section, text) | landing | klik na dugme za kupovinu |
| `scroll_depth` (25/50/75/100) | sve stranice | koliko daleko je skrolovao |
| `faq_open`, `video_play` | landing | otvoreno pitanje, pokrenut video |
| `cookie_choice` | sve stranice | izbor u banneru |
| `checkout_view`, `checkout_submit`, `checkout_error` | checkout | otvorio, kliknuo platiti, greška kartice |
| `checkout_started` | server | napravljena Stripe sesija |
| `purchase` (revenue, price_type, utm_*) | server | plaćeno |
| `upsell_viewed`, `upsell_click`, `upsell_declined` | /ponuda | |
| `upsell_succeeded` / `upsell_requires_action` / `upsell_declined` | server | ishod naplate 1€ |
| `lab_payment` (month, revenue), `lab_payment_failed`, `lab_canceled` | server | Lab tokom vremena |
| `lead`, `lead_submit`, `skill_command_copy` | /besplatno | |
| `chargeback` | server | |

Bez pristanka na kolačiće PostHog i dalje broji posete, ali ne pamti posetioca između stranica i ne snima sesije. Uz pristanak se poseta spaja sa kupovinom (PostHog ID ide kroz Stripe).

### Dashboard (napravi u PostHog-u → Dashboards → New)
1. **Glavni funnel** (Insight → Funnel, prozor 7 dana): `$pageview` (URL sadrži studio.aiprofit.rs/) → `cta_click` → `checkout_view` → `purchase` → `upsell_succeeded`. Breakdown: `utm_content`, pa `utm_source`.
2. **Prihod po izvoru** (Trends): `purchase`, sum of `revenue`, breakdown `utm_source`, pa `utm_content`. Dodaj seriju `lab_payment`, sum of `revenue`.
3. **Lab zadržavanje** (Trends): `lab_payment`, breakdown `month` (1, 2, 3...). Odnos broja „2“ i „1“ je zadržavanje posle prvog meseca.
4. **Lead → kupac** (Funnel, prozor 14 dana): `lead` → `purchase`.
5. **Checkout problemi** (Trends): `checkout_error` po `message`.

Napravljen je skriptom `scripts/posthog-dashboard.mjs` (26.10.): **[Studio Reel Lab: funnel i prihod](https://eu.posthog.com/project/321186/dashboard/1056907)**, 11 grafikona. Pored ovih 5 ima i dnevni pregled, prihod po rilsu (`utm_content`), upsell stopu, otkazivanja, klikove po sekciji i izbor kolačića.

## 4. Meta Pixel + Conversions API

Kod je spreman, čeka podatke:
1. Events Manager → Data sources → tvoj Pixel → **Pixel ID**: upiši u `wrangler.jsonc` (`META_PIXEL_ID`).
2. Settings → Conversions API → **Generate access token**: pošalji mi ga kao secret (`npx wrangler secret put META_CAPI_TOKEN`).
3. Za proveru: Test events → kod (TEST12345) u `META_TEST_CODE`, pa posle provere obriši.

Događaji, sa istim `event_id` iz browsera i sa servera (Meta ih broji jednom):

| Događaj | Browser | Server |
|---|---|---|
| PageView | sve stranice | |
| InitiateCheckout | checkout (`ic-<sesija>`) | pri pravljenju sesije |
| Lead | /besplatno | /api/lead |
| Purchase | /hvala (`<sesija>`) | posle uplate |

Sve ide samo ako je posetilac prihvatio kolačiće.

## 5. Cloudflare Web Analytics (broj poseta i bez kolačića)

Uključeno 26.10. Token je u `wrangler.jsonc` (`CF_BEACON_TOKEN`), a skriptu učitava `analytics.js` na svim stranicama. Rezultati: Cloudflare → Analytics & Logs → Web Analytics.
