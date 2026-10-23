# Creator Studio: kompletan funnel plan

Od prvog rilsa do 2. meseca u AI Profit Lab-u.

**Stack:** Vercel (stranice + API) · Stripe Checkout (custom one-click upsell) · Circle Business (isporuka + zajednica) · MailerLite (mejlovi) · ManyChat (DM iz rilsova) · Meta Pixel + CAPI

---

## 0. Ceo flow na jednoj slici

```
 PROMET                         ULAZ                        PRODAJA
 ─────────────────────────────────────────────────────────────────────────────
 Organski rils ──► ManyChat "STUDIO" ──────────────┐
               └─► ManyChat "SKILL" ──► /besplatno ──► nurture 7 dana ──┐
 Meta/TikTok ads ─► landing (topli/retarget)        │                   │
                 └► /besplatno (hladni)             ▼                   ▼
 Email lista + Lab članovi ─────────────────► LANDING (/)  ◄────────────┘
                                                    │  CTA
                                                    ▼
                                     STRIPE CHECKOUT 97€ (67€ launch)
                                     + order bump: Viral Hook Pack 27€
                                     + sačuvana kartica (off_session)
                                                    │
                                                    ▼
                                     UPSELL /ponuda  (one-click, bez kartice)
                                     AI Profit Lab: 1€ prvi mesec, pa 47€
                                         │ Da                 │ Ne hvala
                                         ▼                    ▼
                                     /hvala  (3 koraka + radionica ako ≤100)
                                                    │
 ISPORUKA (webhook, automatski) ────────────────────┤
   Circle član + access group ▸ licenca ▸ MailerLite grupa ▸ welcome mejl ▸ CAPI
                                                    ▼
 CIRCLE: Creator Studio prostor ──► prvi rils za 48h ──► Pokaži svoj rils
         AI Profit Lab prostor (ako je uzeo) ──► 30 dana onboarding ──► 47€/mes
         Lab "pogledaj unutra" (ako nije) ──► downsell mejlovi D3 / D10
```

---

## 1. Promet i ulazi

| Izvor | Kuda vodi | Zašto |
|---|---|---|
| **Organski rils** sa CTA „komentariši STUDIO“ | ManyChat DM → landing sa UTM-om | Topla publika, ide direktno na prodaju |
| **Organski rils** „komentariši SKILL“ | ManyChat DM → `/besplatno` | Gradi listu, prodaje kasnije kroz mejl |
| **Meta ads, hladni** | `/besplatno` (lead magnet) | Jeftiniji lead od direktne prodaje za 97€ |
| **Meta ads, retarget** (posetili landing, gledali 50% rilsa, lead-ovi) | Landing | Ovde se prodaje |
| **Email lista** | Landing, launch sekvenca | |
| **Postojeći AI Profit Lab članovi** | Landing sa članskom cenom 67€ tokom celog launcha | Obrnuti cross-sell, nagrađuje članove |

**ManyChat DM poruka (STUDIO):** kratko „Evo linka 👇“ + jedna rečenica šta je Studio + dugme. Ne tražiti mejl u DM-u za STUDIO, samo za SKILL.

### Lead magnet: `/besplatno`
- Ponuda: **originalni besplatni skill** („Claude ti montira prvi rils“, 3 izgleda), isti koji je u rilsu.
- Stranica: naslov, 15-sek demo, polje za mejl → MailerLite grupa `Lead – Free skill`.
- Odmah posle: `/besplatno/hvala` sa install komandom + mejl sa istim.
- **Nurture sekvenca (7 dana), lični rok:**
  - D0 skill + instalacija
  - D1 tvoja priča (zašto si ga napravio, sati montaže)
  - D2 dokaz: pre/posle, broj pregleda, testimonijal
  - D3 šta Studio dodaje originalu (46 efekata, probni rilsovi, karuseli, objavljivanje)
  - D4 **lična ponuda 72h**: 67€ umesto 97€ (pravi rok po osobi, ne lažni tajmer)
  - D6 još 24h
  - D7 zatvaranje ponude
- Ko ne kupi → opšti newsletter + povremeno direktna ponuda AI Profit Lab za 1€ (Lab ima i svoj ulaz, ne samo kroz Studio).

---

## 2. Landing (postojeći `index.html`)

Struktura je jaka. Pre puštanja:

**Obavezno popraviti**
- [ ] Datumi: launch cena je istekla 22.10, zatvaranje je 25.10. Postaviti nove datume (predlog u sekciji 11).
- [ ] Placeholderi: `[Tvoje Ime]`, `[Tvoj Brend]`, „Ime Prezime“ u testimonijalima, `info@tvojdomen.rs`, stilovi 6–9 („Naziv stila“), tvoja fotografija.
- [ ] `checkoutUrl` → svako dugme ide na `/api/checkout` (kreira Stripe sesiju i nosi UTM).
- [ ] FAQ „prijavi se mejlom, bez lozinke“: uskladiti sa stvarnim Circle loginom (vidi sekciju 5).
- [ ] Garancija: tekst je OK, dodati link na uslove povraćaja.
- [ ] Pixel (PageView, ViewContent, InitiateCheckout na klik).

**Dodati**
- [ ] `CONFIG.mode: "launch" | "evergreen"`. U evergreen modu nestaju „vrata se zatvaraju“ blokovi, ostaje cena 97€ i bonus.
- [ ] Mala linija ispod glavnog CTA: „Sigurno plaćanje preko Stripe-a · Apple Pay / Google Pay · Pristup odmah“.
- [ ] Ako dolazi Lab član (`?clan=lab`): prikaz cene 67€ i promo kod automatski prosleđen u checkout.

---

## 3. Checkout (Stripe Checkout, hosted)

`POST /api/checkout` kreira Checkout Session:

| Podešavanje | Vrednost | Zašto |
|---|---|---|
| `mode` | `payment` | jednokratno 97€ / 67€ |
| `line_items` | Creator Studio (price koji važi u tom trenutku: launch / regular / lead-72h) | cena se bira na serveru, ne u browseru |
| `optional_items` | Viral Hook Pack 27€ | order bump direktno u Stripe Checkout-u |
| `customer_creation` | `always` | treba nam Customer za upsell |
| `payment_intent_data.setup_future_usage` | `off_session` | **ovo omogućava one-click upsell** |
| `automatic_tax` | uključiti Stripe Tax | PDV/OSS (vidi Pravno) |
| `consent_collection.terms_of_service` | `required` | prihvatanje uslova + odricanje od 14 dana za digitalni sadržaj |
| `metadata` | utm_*, fbclid, lead_id, cena_tip | atribucija i CAPI |
| `success_url` | `/ponuda?session_id={CHECKOUT_SESSION_ID}` | ide na upsell, ne na hvala |
| `cancel_url` | `/` | |

Kartice, Apple Pay i Google Pay rade sa sačuvanom metodom za kasnije naplate. Uključiti Stripe Radar.

> `optional_items` proveriti u Stripe dokumentaciji pri izradi. Ako nije dostupan za tvoj nalog, bump ide kao checkbox na međustranici pre Checkout-a.

### Order bump: predlog
**Viral Hook Pack, 27€** (opcija u checkout-u, ~25–40% uzima)
- 150 proverenih hook formula za prve 3 sekunde, po nišama
- dodatak za Studio koji ih automatski rotira u probnim rilsovima („napravi 8 probnih sa hook-ovima iz paketa“)
- radi odmah, direktno pojačava najjaču funkciju (probni rilsovi), 100% marža

Rezerva ako ti se ne sviđa: **Premium paket stilova** (+6 stilova montaže + 6 karusel izgleda), 27€.

---

## 4. Upsell: AI Profit Lab za 1€ (`/ponuda`)

### Ponuda
- **1€ prvi mesec, posle 47€ mesečno.** Otkaži bilo kad, jednim klikom.
- **Cena zaključana:** „Redovno 57€. Kao kupac Studija plaćaš 47€ dok god si član.“ Tako koristiš oba broja: 57€ je sidro, 47€ je razlog da ne otkažu.
- Ugao: *„Studio ti pravi sadržaj. Lab ti pokazuje kako da od tog sadržaja zaradiš.“*
- Ekskluzivno za Lab članove (razlog za ostanak posle 1. meseca): novi Studio stil svakog meseca pre ostalih, mesečni live poziv, snimak radionice.

### Stranica
1. Traka na vrhu: „✓ Plaćanje uspešno. Tvoj Studio je spreman. Još jedan korak.“ (progress 2/3)
2. Video 60–90 sek (ti, iskreno: šta je Lab, šta dobija u prvih 30 dana)
3. 3–5 konkretnih ishoda + šta je unutra
4. Dugme: **„Da, dodaj AI Profit Lab za 1€“**, ispod sitno: „Naplaćujemo karticu koju si upravo koristio. Posle 30 dana 47€/mes. Otkaži bilo kad.“
5. Link: „Ne hvala, idem na svoj Studio →“

### Kako radi one-click (`POST /api/upsell`)
1. Primi `session_id`, proveri da je sesija plaćena i da upsell za nju nije već iskorišćen.
2. Iz PaymentIntent-a uzme `customer` i `payment_method`.
3. Kreira Subscription: price `lab_mesecno_47`, kupon `PRVI_MESEC_1E` (46€ popusta, `duration: once`), `default_payment_method`, `off_session`.
4. Ako banka traži 3DS (`requires_action`) → stranica pokaže Stripe potvrdu (`confirmCardPayment`), kupac potvrdi u par sekundi.
5. Redirect na `/hvala?lab=1`.

**Ako je kupac već Lab član** (provera po mejlu preko Circle API-ja): preskače `/ponuda` i ide direktno na `/hvala` sa porukom „Već si u Lab-u, vidimo se unutra“.

**Ako kaže ne:** ne prikazujemo drugi downsell odmah (kupac je tek platio, ne treba mu treća stranica). Lab ponuda se vraća kroz mejl D3 i D10 i kroz Circle teaser.

---

## 5. Hvala stranica (`/hvala`)

Jedan cilj: **da kupac u roku od 10 minuta bude u Circle-u i nalepi install komandu.**

1. „Dobrodošao u Creator Studio 🎬“
2. Tri koraka sa velikim brojevima:
   1. Proveri mejl (pozivnica za Circle stiže za 1 minut, pogledaj i Promocije/Spam)
   2. Uđi u Circle → *Kreni ovde*
   3. Nalepi install komandu, montiraj prvi rils
3. Dugme „Otvori Circle“ (direktan link na lekciju Instalacija)
4. **Ako je među prvih 100:** „🎟️ Tvoje mesto na radionici je sačuvano. Nedelja, [datum] u 11h, Zoom.“ + dugme „Dodaj u kalendar“
5. **Ako je uzeo Lab:** „AI Profit Lab je otključan, naći ćeš ga u istom Circle-u.“
6. Pixel `Purchase` sa ukupnom vrednošću (Studio + bump + Lab 1€), deduplikovan sa CAPI preko `event_id`.

### Circle login
Webhook kreira člana preko API-ja. Dve opcije, odaberi jednu i prilagodi FAQ:
- **A (preporuka):** Circle šalje svoju pozivnicu, kupac postavi lozinku jednom. FAQ: „Pristup stiže mejlom za minut.“
- **B:** Ako u Circle-u uključiš prijavu kodom na mejl, onda je „bez lozinke“ tačno.

---

## 6. Isporuka (automatski, Stripe webhook)

`POST /api/stripe-webhook`, sve idempotentno (svaki event obrađen tačno jednom).

| Stripe event | Šta se dešava |
|---|---|
| `checkout.session.completed` | 1. Circle: kreira/nađe člana, doda u access group **Creator Studio** (+ **Hook Pack** ako je bump)<br>2. Kupac broj ≤ 100 → access group **Radionica**<br>3. Kreira licencu (vezana za mejl)<br>4. MailerLite: upsert, grupa `Kupci – Studio`, izbaci iz `Lead`, polja (datum, bump, radionica, cena)<br>5. Welcome mejl (transakcioni)<br>6. Meta CAPI `Purchase`<br>7. Obaveštenje tebi (Telegram/Slack) |
| `invoice.paid` (Lab) | Circle access group **AI Profit Lab** dodat/ostaje · MailerLite grupa `Lab – član` |
| `invoice.payment_failed` | Stripe Smart Retries + mejl za ažuriranje kartice (pristup ostaje tokom retry perioda) |
| `customer.subscription.deleted` | Ukloni iz **AI Profit Lab** access group-a · MailerLite `Lab – bivši` |
| `charge.refunded` (Studio) | Ukloni **Creator Studio** access · opozovi licencu · MailerLite `Refund` |

### Evidencija kupaca u WooCommerce-u
Svaka uspešna naplata pravi porudžbinu u WooCommerce-u, pa je tamo spisak svih kupaca i svih uplata na jednom mestu. Stripe ostaje sistem koji naplaćuje, a Woo služi samo za evidenciju i ne naplaćuje ništa.

| Stripe event | WooCommerce (REST API `/wp-json/wc/v3`) |
|---|---|
| `checkout.session.completed` | `POST /orders`: status `completed`, `set_paid: true`, stavke Creator Studio (+ Hook Pack), cena kakva je stvarno plaćena, `payment_method_title: "Stripe"`, `transaction_id` = PaymentIntent ID |
| `invoice.paid` (Lab) | Nova porudžbina za svaku naplatu Lab-a (1€, pa svaka 47€), da se vidi i ponavljana uplata |
| `charge.refunded` | `POST /orders/{id}/refunds` sa `api_refund: false` (beleži povraćaj, ne pokušava da vrati novac drugi put) |
| `customer.subscription.deleted` | Beleška na poslednjoj Lab porudžbini: „Pretplata otkazana“ |

Pravila:
- **Proizvodi u Woo-u** sa fiksnim SKU-ovima (`CS-STUDIO`, `CS-HOOKPACK`, `LAB-MESECNO`), virtuelni, sakriveni iz prodavnice. Webhook ih traži po SKU-u.
- **Kupac:** traži se po mejlu (`GET /customers?email=`), a ako ne postoji, pravi se novi. Tako jedan kupac ima sve svoje porudžbine na jednom mestu.
- **Bez duplikata:** u porudžbinu se upisuje `meta_data` `stripe_session_id` / `stripe_invoice_id`. Pre kreiranja proverava se da li porudžbina sa tim ID-om već postoji.
- **Ugasiti Woo mejlove kupcima** (Completed order, Customer invoice, Refunded order), jer kupac već dobija welcome mejl. Ostaviti samo obaveštenje adminu, po želji.
- **UTM i izvor** idu u `meta_data`, pa se i u Woo-u vidi odakle je kupac došao.
- **Ako je Woo nedostupan:** pokušaj se ponavlja (Stripe sam ponavlja webhook, ili red u Upstash-u). Pristup u Circle-u se ne blokira zbog Woo-a: Circle i licenca idu prvi, Woo poslednji.
- **Ključ:** WooCommerce REST API ključ sa Read/Write pravom, preko HTTPS-a, čuva se u Vercel env varijablama.

**Skladište:** Upstash Redis (Vercel KV) ili Supabase: kupci, licence, brojač radionice, obrađeni eventi.

### Plugin i install komanda
- U Circle lekciji je **ista komanda za sve:**
  - Mac: `curl -fsSL https://studio.[domen]/install.sh | bash`
  - Windows: `irm https://studio.[domen]/install.ps1 | iex`
- Pri prvom pokretanju plugin traži **mejl sa kojim si kupio** → šalje mu 6-cifreni kod → aktivira licencu na tom računaru (`/api/license/activate`, limit npr. 2 uređaja).
- Ažuriranja proveravaju licencu (`/api/license/verify`). Refund = licenca opozvana = nema više ažuriranja.
- Kod privatan (privatni GitHub repo, a server isporučuje paket tek posle provere licence).
- `doctor` komanda proverava i licencu.

Ovim je komanda u Circle-u bezbedna i ako procuri, a „prijavi se mejlom, bez lozinke“ je istina za sam plugin.

---

## 7. Circle struktura (jedna zajednica)

```
[Tvoj Brend] zajednica
│
├── 🎬 CREATOR STUDIO              (access group: Creator Studio)
│   ├── 📍 Kreni ovde              (course, otključavanje po redu)
│   │     01 Dobrodošlica (2 min video)
│   │     02 Šta ti treba (Claude desktop, Pro plan)
│   │     03 Instalacija: Mac
│   │     04 Instalacija: Windows
│   │     05 Prvi rils za 10 minuta  ← cilj aktivacije
│   │     06 Look Builder: izaberi ili napravi stil
│   │     07 Probni rilsovi
│   │     08 Carousel Studio
│   │     09 Automatsko objavljivanje
│   │     10 Kad nešto ne radi: doctor komanda
│   ├── 🎥 Preko ramena            (course, 8 snimaka)
│   ├── 📚 Biblioteka              (46 efekata, 9 stilova, 20 titlova, sa klipovima)
│   ├── 🆕 Ažuriranja              (changelog, notifikacije uključene za sve)
│   ├── 💬 Pitanja i pomoć
│   ├── 🔥 Pokaži svoj rils        (pre/posle, izvor testimonijala)
│   ├── 🪝 Viral Hook Pack         (access group: Hook Pack)
│   └── 📅 Radionica uživo         (event, access group: Radionica)
│
├── 🧪 AI PROFIT LAB               (access group: AI Profit Lab, postojeće)
│   ├── 🚀 Prvih 30 dana           (NOVO: put do prve zarade, za trial članove)
│   ├── … postojeći prostori
│   └── 🎞️ Snimak radionice + mesečni Studio stil (ekskluziva)
│
└── 👀 AI Profit Lab: pogledaj unutra   (vidljivo Studio kupcima koji nisu u Lab-u)
      1 besplatna lekcija + dugme „Otključaj za 1€“ (Stripe Checkout sa kuponom)
```

**Circle Workflows** (Business plan):
- Dodat u *Creator Studio* → DM od tebe („Hej [ime], počni od lekcije 03/04, piši mi ovde ako zapne“) + tag `studio`
- Dodat u *AI Profit Lab* → DM + automatski otvara *Prvih 30 dana*
- 3 dana bez otvorene lekcije 05 → podsetnik DM

---

## 8. Mejlovi (MailerLite)

**Transakcioni mejlovi** (welcome, kod za licencu, potvrde) idu preko **MailerSend** ili **Resend**, ne kroz MailerLite kampanje, da stignu za par sekundi i ne završe u Promocijama.

### A) Kupci Studio, onboarding (grupa `Kupci – Studio`)
| Dan | Mejl | Cilj |
|---|---|---|
| D0 | Welcome: link za Circle + install u 3 koraka | ući |
| D1 | „Tvoj prvi rils za 10 minuta“ + 3 najčešća problema | **aktivacija** |
| D2 | Izaberi svoj stil (Look Builder) | |
| D3 | Probni rilsovi: 8 verzija iz jednog videa · *+ Lab 1€ (samo ne-članovi)* | |
| D5 | Carousel Studio | |
| D6 | „Garancija ističe sutra. Zapeo si? Odgovori na ovaj mejl.“ | manje refunda, iskreno |
| D7 | Pokaži svoj rils + zamolba za utisak | testimonijali |
| D10 | *Lab 1€, poslednji put (samo ne-članovi)* | |
| D14 | Preporuči prijatelju (affiliate/referral, kasnije) | |

### B) AI Profit Lab, 1. mesec (grupa `Lab – trial`)
Ovde se zarađuje: 1€ je ulaz, **47€ u 2. mesecu je pravi upsell.**
| Dan | Mejl |
|---|---|
| D0 | Dobrodošlica + „Prvih 30 dana“ put + sledeći live poziv |
| D2 | Prvi zadatak (mala pobeda za 48h) |
| D7 | Nedeljni pregled + poziv na live |
| D14 | Priča člana koji je zaradio |
| D21 | Šta te čeka u 2. mesecu |
| D25 | Godišnja opcija: 470€/god (2 meseca gratis) |
| D27 | **Iskren podsetnik:** „Za 3 dana 47€. Evo šta si dobio. Otkaži ovde ako ti ne treba.“ (manje chargeback-ova, više poverenja) |

### C) Radionica (grupa `Radionica`)
D-3 podsetnik · D-1 · 1h pre (Zoom link) · posle: snimak + Lab ponuda za one koji nisu članovi.

### D) Launch sekvenca (lista + Lab članovi)
Najava 3 dana pre · otvaranje · „48h launch cena ističe“ · dokaz/studija slučaja · FAQ mejl · 24h · 3h do zatvaranja.

---

## 9. Posle lansiranja: evergreen

- Landing prelazi u `evergreen` mod: 97€, bez „vrata se zatvaraju“.
- Hitnost postoji **samo tamo gde je istinita:** lični rok 72h u nurture sekvenci (67€) i bonus za brzu kupovinu.
- Radionica za prvih 100 se pretvara u **mesečni live Q&A za nove kupce** (ili snimak u Studio prostoru).
- Ads: stalna kampanja na `/besplatno` + retarget na landing.
- Svaki novi efekat/stil = post u *Ažuriranja* + mejl kupcima + rils (sadržaj za promet).

---

## 10. Merenje

UTM → Checkout `metadata` → webhook → MailerLite polja i CAPI. Ovako znaš koji rils ili oglas je doneo novac, a ne samo klikove.

| Metrika | Cilj |
|---|---|
| Landing → kupovina (topli) | 5–10% |
| Landing → kupovina (hladni ads) | 1–3% |
| Order bump | 25–40% |
| Upsell Lab 1€ | 30–50% |
| Lab 1. → 2. mesec | 50%+ |
| Aktivacija (prvi rils za 48h) | 60%+ |
| Refund | < 5% |
| Lead → kupac (7 dana) | 3–8% |

Jednostavan dashboard: Stripe (prihod) + MailerLite (grupe) + Circle (aktivnost lekcije 05).

---

## 11. Pravno i porez

- Stranice: Uslovi korišćenja, Politika privatnosti, Politika povraćaja (7 dana), Uslovi pretplate za Lab.
- Upsell dugme mora jasno da kaže: **1€ sada, 47€/mes od [datum], otkaži bilo kad.** Stripe Customer Portal za samostalno otkazivanje (link u svakom Lab mejlu).
- Checkbox u checkout-u: saglasnost da pristup digitalnom sadržaju počinje odmah (EU pravo na odustanak).
- **Porez:** Stripe Tax za obračun. Prodaja fizičkim licima u EU = EU PDV (OSS). Obavezno potvrditi sa knjigovođom pre lansiranja, posebno za koju firmu ide Stripe nalog.
- Cookie banner za Pixel (EU posetioci).

---

## 12. Redosled izrade

**Faza 1: bez ovoga nema lansiranja**
1. Stripe: proizvodi i cene (Studio 97/67/lead-67, Hook Pack 27, Lab 47/mes, kupon 1€), Tax, Radar, Customer Portal
2. `/api/checkout` + landing CONFIG + datumi + placeholderi
3. `/api/stripe-webhook` → Circle + MailerLite + welcome mejl + licenca + WooCommerce porudžbina (proizvodi sa SKU-om, REST ključ, ugašeni Woo mejlovi kupcima)
4. Circle: access groups, Creator Studio prostori, lekcije *Kreni ovde*, workflows
5. Install skripte + aktivacija licence u pluginu
6. `/hvala` + pravne stranice
7. Test end-to-end u Stripe test modu (kupovina, refund, 3DS kartica)

**Faza 2: upsell i bump**
8. `/ponuda` + `/api/upsell` (one-click, 3DS, zaštita od duplog)
9. Lab automatika (`invoice.paid`, `subscription.deleted`), onboarding *Prvih 30 dana*
10. Order bump + Hook Pack sadržaj
11. Stripe test clock: simulirati 30 dana → naplata 47€ → otkazivanje

**Faza 3: promet**
12. `/besplatno` + MailerLite nurture + lični rok 72h
13. ManyChat (STUDIO, SKILL)
14. Pixel + CAPI, UTM tok

**Faza 4: evergreen**
15. Evergreen mod, Lab teaser prostor, referral

### Predlog kalendara (datumi na landingu su prošli)
- 2 nedelje izrade + testiranja → **otvaranje pon 9.11. u 9h**
- 67€ do sre 11.11. u 21h → 97€ do **ned 15.11. u 21h**
- Radionica za prvih 100: **ned 22.11. u 11h**
- Od 16.11. evergreen

---

## 13. Otvorena pitanja (za tebe)

1. **Kako sada plaćaju postojeći Lab članovi?** Ako preko Circle Paywall-a, nove pretplate preko direktnog Stripe-a su drugi sistem. Treba odlučiti: oba paralelno (webhook upravlja samo novima) ili sve prebaciti na direktni Stripe.
2. **Domen za Studio:** `studio.aiprofit.rs` ili poseban domen?
3. **Za koju firmu je Stripe nalog?** Utiče na porez i fakture.
4. **Hook Pack:** da li ga praviš ili biramo Premium paket stilova?
5. **Da li WooCommerce pravi i fakture** (npr. plugin za fakture ili fiskalizaciju)? Ako pravi, porudžbine moraju imati pune podatke o kupcu za fakturu, pa Stripe Checkout treba da prikuplja i adresu.
6. **Refund Studija kad kupac ima Lab:** Lab ostaje aktivan (predlog) ili se gasi oba?
