# AI Video Editor: kompletan funnel plan

Od prvog rilsa do 2. meseca u AI Profit Lab-u.

**Stack:** Cloudflare Workers na `studio.aiprofit.rs` (stranice + API + D1 baza + Queues) · Stripe Checkout (custom one-click upsell) · Circle Business na `aiprofit.rs` (isporuka + zajednica) · WooCommerce na `vladsdigital.com` (samo spisak porudžbina) · MailerLite (mejlovi) · ManyChat (DM iz rilsova) · PostHog + Meta Pixel/CAPI (analitika)

**Za sada isključeno (26.10.):** order bump (Viral Hook Pack) i radionica za prvih 100. Delovi plana o njima ostaju kao ideje za kasnije, ali nisu u kodu ni na stranicama. Proizvod se zove **AI Video Editor** (Circle grupa „Reel Lab Studio“, prostor kursa (/c/ai-video-editor)).

**Odluke (26.10.):** bez garancije i bez povraćaja za Studio · Woo je samo evidencija, ne pravi fakture · Stripe nalog i porez su rešeni · bez TikTok oglasa · postojeći Lab članovi ostaju na Circle Paywall-u, nove Lab pretplate iz upsella idu direktno preko Stripe-a

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
 CIRCLE: AI Video Editor prostor ──► prvi rils za 48h ──► Pokaži svoj rils
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
- [x] Garancija uklonjena sa landinga, checkout-a i hvala stranice (umesto nje: blok „Ne ostaješ sam posle kupovine“ i FAQ da nema povraćaja).
- [ ] PostHog + Pixel (vidi sekciju 10).

**Dodati**
- [ ] `CONFIG.mode: "launch" | "evergreen"`. U evergreen modu nestaju „vrata se zatvaraju“ blokovi, ostaje cena 97€ i bonus.
- [ ] Mala linija ispod glavnog CTA: „Sigurno plaćanje preko Stripe-a · Apple Pay / Google Pay · Pristup odmah“.
- [ ] Ako dolazi Lab član (`?clan=lab`): prikaz cene 67€ i promo kod automatski prosleđen u checkout.

---

## 3. Checkout (naša stranica + Stripe Payment Element)

> Ažurirano 26.10.: umesto Stripe-ove hostovane stranice koristi se naša dizajnirana `/checkout` stranica. Sesija se pravi sa `ui_mode: "elements"`, polja za karticu daje Stripe, a pristanak na uslove beležimo sami (`/api/checkout/consent`). Ostala podešavanja iz tabele važe.

`POST /api/checkout` kreira Checkout Session:

| Podešavanje | Vrednost | Zašto |
|---|---|---|
| `mode` | `payment` | jednokratno 97€ / 67€ |
| `line_items` | AI Video Editor (price koji važi u tom trenutku: launch / regular / lead-72h) | cena se bira na serveru, ne u browseru |
| `optional_items` | Viral Hook Pack 27€ | order bump direktno u Stripe Checkout-u |
| `customer_creation` | `always` | treba nam Customer za upsell |
| `payment_intent_data.setup_future_usage` | `off_session` | **ovo omogućava one-click upsell** |
| `automatic_tax` | uključiti Stripe Tax | PDV/OSS (vidi Pravno) |
| `consent_collection.terms_of_service` | `required` | prihvatanje uslova + odricanje od 14 dana za digitalni sadržaj (`custom_text`: „pristup počinje odmah, gubim pravo na odustanak, povraćaj nije moguć“). Pošto nema garancije, ovaj pristanak je ono što pravno drži „bez povraćaja“. |
| `metadata` | utm_*, fbclid, lead_id, cena_tip, `ph_id` (PostHog ID posetioca), `source: "studio"` | atribucija, CAPI, i oznaka da je kupovina iz ovog funnela |
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

**Ako je kupac već Lab član** (provera po mejlu preko Circle API-ja): preskače `/ponuda` i ide direktno na `/hvala` sa porukom „Već si u Lab-u, vidimo se unutra“. Član je Lab član ako ima aktivan Circle Paywall za Lab **ili** je u access group-u `AI Profit Lab` (nove pretplate iz ovog funnela).

### Dva sistema za Lab, paralelno
Postojeći Lab članovi kupuju preko Lab landinga na Circle-u i Circle Paywall-a (Circle-ov checkout, iza je Stripe). To ostaje kako jeste. Paywall ne može da uradi one-click upsell sačuvanom karticom, pa nove Lab pretplate iz Studio funnela idu direktno preko Stripe-a, a pristup daje access group.

- Access group `AI Profit Lab` mora da otvara **iste prostore** kao Lab Paywall, da član ne vidi razliku.
- Webhook obrađuje **samo** evente sa `metadata.source = "studio"` (sesija ili pretplata). Ako je Circle Paywall povezan na isti Stripe nalog, njegove naplate takođe stižu na naš webhook, i moraju da se preskoče, inače bi duplo dodavali pristup i pravili Woo porudžbine.
- Otkazivanje: Lab članovi iz funnela otkazuju preko Stripe Customer Portal-a (link u mejlovima i u Circle-u), Paywall članovi kao i do sada.
- Proveriti pre izrade: kako je Circle Paywall povezan sa Stripe-om (isti nalog ili Stripe Connect) i da li Circle API vraća status paywall pretplate po članu.

**Ako kaže ne:** ne prikazujemo drugi downsell odmah (kupac je tek platio, ne treba mu treća stranica). Lab ponuda se vraća kroz mejl D3 i D10 i kroz Circle teaser.

---

## 5. Hvala stranica (`/hvala`)

Jedan cilj: **da kupac u roku od 10 minuta bude u Circle-u i nalepi install komandu.**

1. „Dobrodošao u AI Video Editor 🎬“
2. Tri koraka sa velikim brojevima:
   1. Proveri mejl (pozivnica za Circle stiže za 1 minut, pogledaj i Promocije/Spam)
   2. Uđi u Circle → *Kreni ovde*
   3. Nalepi install komandu, montiraj prvi rils
3. Dugme „Otvori Circle“ (direktan link na lekciju Instalacija)
4. **Ako je među prvih 100:** „🎟️ Tvoje mesto na radionici je sačuvano. Nedelja, [datum] u 11h, Zoom.“ + dugme „Dodaj u kalendar“
5. **Ako je uzeo Lab:** „AI Profit Lab je otključan, naći ćeš ga u istom Circle-u.“
6. Pixel `Purchase` sa ukupnom vrednošću (Studio + bump + Lab 1€), deduplikovan sa CAPI preko `event_id`. PostHog `identify` po mejlu, da se poseta spoji sa kupovinom.

### Circle login
Webhook kreira člana preko API-ja. Dve opcije, odaberi jednu i prilagodi FAQ:
- **A (preporuka):** Circle šalje svoju pozivnicu, kupac postavi lozinku jednom. FAQ: „Pristup stiže mejlom za minut.“
- **B:** Ako u Circle-u uključiš prijavu kodom na mejl, onda je „bez lozinke“ tačno.

---

## 6. Isporuka (automatski, Stripe webhook)

`POST /api/stripe-webhook` na Cloudflare Worker-u, sve idempotentno (svaki event obrađen tačno jednom).

### Kako radi na Cloudflare-u
1. Worker proveri Stripe potpis (`constructEventAsync`, Web Crypto), preskoči evente bez `source: "studio"`, upiše event ID u D1 i stavi posao u **Queue**. Stripe-u odgovara za manje od sekunde.
2. Queue consumer radi korake redom. Svaki korak ima svoj status u D1 (`circle_ok`, `license_ok`, `mailerlite_ok`, `woo_ok`, `analytics_ok`). Ako jedan padne, Queue ponavlja samo taj korak, ostali se ne ponavljaju.
3. Posle 5 neuspelih pokušaja posao ide u dead-letter queue + poruka tebi.
4. **Noćni cron:** uporedi Stripe naplate iz poslednjih 48h sa D1 i dopuni sve što fali.

Treba **Workers Paid plan (5$ mesečno)** zbog Queues, cron-a i CPU limita.

| Stripe event | Šta se dešava |
|---|---|
| `checkout.session.completed` | 1. Circle: kreira/nađe člana, doda u access group **AI Video Editor** (+ **Hook Pack** ako je bump)<br>2. Kupac broj ≤ 100 → access group **Radionica**<br>3. Kreira licencu (vezana za mejl)<br>4. MailerLite: upsert, grupa `Kupci – Studio`, izbaci iz `Lead`, polja (datum, bump, radionica, cena)<br>5. Welcome mejl (transakcioni)<br>6. WooCommerce porudžbina<br>7. PostHog `purchase` + Meta CAPI `Purchase`<br>8. Obaveštenje tebi (Telegram/Slack) |
| `invoice.paid` (Lab, `source: studio`) | Circle access group **AI Profit Lab** dodat/ostaje · MailerLite grupa `Lab – član` · Woo porudžbina · PostHog `lab_payment` (1. ili n-ti mesec) |
| `invoice.payment_failed` | Stripe Smart Retries + mejl za ažuriranje kartice (pristup ostaje tokom retry perioda) |
| `customer.subscription.deleted` | Ukloni iz **AI Profit Lab** access group-a · MailerLite `Lab – bivši` · PostHog `lab_canceled` |
| `charge.dispute.created` / ručni `charge.refunded` | Povraćaja nema, ali chargeback ili izuzetak koji ti ručno uradiš i dalje mogu da se dese: ukloni **AI Video Editor** access, opozovi licencu, MailerLite `Refund`. **Lab ostaje aktivan.** |

### Evidencija kupaca u WooCommerce-u
Sajt: **vladsdigital.com**. Svaka uspešna naplata pravi porudžbinu u WooCommerce-u, pa je tamo spisak svih kupaca i svih uplata na jednom mestu. Stripe ostaje sistem koji naplaćuje, a Woo služi samo za evidenciju i ne naplaćuje ništa.

| Stripe event | WooCommerce (REST API `/wp-json/wc/v3`) |
|---|---|
| `checkout.session.completed` | `POST /orders`: status `completed`, `set_paid: true`, stavke AI Video Editor (+ Hook Pack), cena kakva je stvarno plaćena, `payment_method_title: "Stripe"`, `transaction_id` = PaymentIntent ID |
| `invoice.paid` (Lab) | Nova porudžbina za svaku naplatu Lab-a (1€, pa svaka 47€), da se vidi i ponavljana uplata |
| `charge.refunded` | `POST /orders/{id}/refunds` sa `api_refund: false` (beleži povraćaj, ne pokušava da vrati novac drugi put) |
| `customer.subscription.deleted` | Beleška na poslednjoj Lab porudžbini: „Pretplata otkazana“ |

Pravila:
- **Proizvodi u Woo-u** sa fiksnim SKU-ovima (`CS-STUDIO` #45406, `LAB-MESECNO` #45407), virtuelni, privatni i sakriveni iz prodavnice.
- **Kupac:** porudžbine su gostujuće (mejl i ime u billing podacima), bez pravljenja Woo naloga, jer bi Woo inače poslao mejl „nalog je napravljen“. Sve porudžbine jednog kupca se nađu pretragom po mejlu.
- **Bez duplikata:** u porudžbinu se upisuje `meta_data` `stripe_session_id` / `stripe_invoice_id`. Pre kreiranja proverava se da li porudžbina sa tim ID-om već postoji.
- **Woo mejlovi kupcima:** ne gase se globalno, jer sajt prodaje i druge proizvode. Porudžbine iz funnela nose meta `studio_funnel = 1`, a snippet [wordpress/studio-funnel-tihi-mejlovi.php](wordpress/studio-funnel-tihi-mejlovi.php) gasi Woo mejlove samo za njih. Admin obaveštenje „New order“ ostaje (može se isključiti u snippetu).
- **UTM i izvor** idu u `meta_data`, pa se i u Woo-u vidi odakle je kupac došao.
- **Ako je Woo nedostupan:** Queue ponavlja samo Woo korak. Pristup u Circle-u se ne blokira zbog Woo-a: Circle i licenca idu prvi, Woo posle.
- **Samo spisak:** bez faktura i fiskalizacije, pa Checkout ne mora da traži adresu. Ime i mejl su dovoljni.
- **Ključ:** WooCommerce REST API ključ sa Read/Write pravom, preko HTTPS-a, čuva se kao Cloudflare secret (`wrangler secret put`).
- Ako vladsdigital.com ima Cloudflare ili sigurnosni plugin koji blokira REST pozive, dodati izuzetak za `/wp-json/wc/v3`.

**Skladište: Cloudflare D1** (SQLite): kupci, porudžbine (sa UTM-om i PostHog ID-om), licence, brojač radionice, obrađeni eventi, status koraka isporuke.

### Plugin i install komanda
- U Circle lekciji je **ista komanda za sve:**
  - Mac: `curl -fsSL https://studio.[domen]/install.sh | bash`
  - Windows: `irm https://studio.[domen]/install.ps1 | iex`
- Pri prvom pokretanju plugin traži **mejl sa kojim si kupio** → šalje mu 6-cifreni kod → aktivira licencu na tom računaru (`/api/license/activate`, 1 računar po licenci).
- Ažuriranja proveravaju licencu (`/api/license/verify`). Chargeback = licenca opozvana = nema više ažuriranja.
- Kod privatan (privatni GitHub repo, a server isporučuje paket tek posle provere licence).
- `doctor` komanda proverava i licencu.

Ovim je komanda u Circle-u bezbedna i ako procuri, a „prijavi se mejlom, bez lozinke“ je istina za sam plugin.

---

## 7. Circle struktura (jedna zajednica)

```
[Tvoj Brend] zajednica
│
├── 🎬 CREATOR STUDIO              (access group: AI Video Editor)
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
- Dodat u *AI Video Editor* → DM od tebe („Hej [ime], počni od lekcije 03/04, piši mi ovde ako zapne“) + tag `studio`
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
| D6 | „Zapeo si negde? Odgovori na ovaj mejl, rešavamo zajedno.“ | aktivacija, manje chargeback-ova |
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

## 10. Merenje i analitika

UTM → Checkout `metadata` → webhook → D1, PostHog, MailerLite polja i CAPI. Ovako znaš koji rils ili oglas je doneo novac, a ne samo klikove.

### Alati
| Alat | Za šta |
|---|---|
| **PostHog** (EU cloud, besplatno do 1M događaja mesečno) | Glavna analitika: posete, funnel, izvori, session replay. Dashboard-i su ovde. |
| **Meta Pixel + Conversions API** | Optimizacija i merenje Meta oglasa |
| **Cloudflare Web Analytics** | Rezerva bez kolačića: čist broj poseta, radi i kad neko odbije kolačiće |
| **Stripe** | Izvor istine za novac |
| **Circle** | Aktivacija (otvorena lekcija 05) |

### Zamka: Stripe Checkout je Stripe-ova stranica
Na nju ne možemo da ubacimo svoj tracking. Zato se „ušao u checkout“ meri kad `/api/checkout` napravi sesiju, a „platio“ serverski iz webhook-a. PostHog ID posetioca ide kroz `metadata`, pa se serverski događaj spaja sa istom osobom koja je došla sa rilsa.

### Događaji
| Događaj | Gde se šalje | Odakle |
|---|---|---|
| `$pageview` (landing, /ponuda, /hvala, /besplatno) | stranica | PostHog + Pixel `PageView` |
| `scroll_50`, `video_play`, `faq_open` | stranica | PostHog |
| `cta_click` (koje dugme, koja sekcija) | stranica | PostHog |
| `checkout_started` | `/api/checkout` | PostHog + CAPI `InitiateCheckout` |
| `purchase` (iznos, bump da/ne, cena_tip, UTM) | webhook | PostHog + CAPI `Purchase` |
| `upsell_viewed`, `upsell_accepted`, `upsell_declined`, `upsell_failed` | /ponuda + `/api/upsell` | PostHog |
| `lab_payment` (mesec 1, 2, 3...), `lab_canceled` | webhook | PostHog |
| `lead` | /besplatno forma | PostHog + CAPI `Lead` |

### Dashboard u PostHog-u
1. **Glavni funnel:** poseta → CTA → checkout → kupovina → upsell → Lab 2. mesec, razbijen po `utm_source` / `utm_campaign` (koji rils, koji oglas).
2. **Prihod po izvoru:** Studio + bump + Lab, po UTM-u.
3. **Lab zadržavanje:** koliko ih plati 2., 3., 4. mesec.
4. **Lead → kupac** za /besplatno.

Po želji, mala zaštićena `/admin` stranica iz D1 (danas: posete, kupovine, prihod, upsell %), za brz pogled sa telefona.

### Kolačići
EU posetioci: cookie banner. PostHog i Pixel se pale tek posle pristanka. Bez pristanka PostHog radi bez kolačića (anonimno, bez spajanja sa kupovinom), a Cloudflare Web Analytics i serverski događaji iz webhook-a rade uvek.

| Metrika | Cilj |
|---|---|
| Landing → kupovina (topli) | 5–10% |
| Landing → kupovina (hladni ads) | 1–3% |
| Order bump | 25–40% |
| Upsell Lab 1€ | 30–50% |
| Lab 1. → 2. mesec | 50%+ |
| Aktivacija (prvi rils za 48h) | 60%+ |
| Chargeback | < 1% |
| Lead → kupac (7 dana) | 3–8% |

Sve metrike osim aktivacije su u PostHog dashboard-u. Aktivacija dolazi iz Circle-a (lekcija 05).

---

## 11. Pravno i porez

- Stranice: Uslovi korišćenja (sa jasnom rečenicom da za Studio nema povraćaja posle pristupa), Politika privatnosti, Uslovi pretplate za Lab.
- **Bez garancije:** pošto je Studio digitalni sadržaj isporučen odmah, „bez povraćaja“ važi samo uz izričitu saglasnost u checkout-u (sekcija 3). Bez tog pristanka kupac iz EU ima 14 dana za odustanak.
- Upsell dugme mora jasno da kaže: **1€ sada, 47€/mes od [datum], otkaži bilo kad.** Stripe Customer Portal za samostalno otkazivanje (link u svakom Lab mejlu).
- Checkbox u checkout-u: saglasnost da pristup digitalnom sadržaju počinje odmah (EU pravo na odustanak).
- **Porez:** Stripe nalog i porez su rešeni (potvrđeno 26.10.).
- Cookie banner za Pixel (EU posetioci).

---

## 12. Redosled izrade

**Faza 1: bez ovoga nema lansiranja**
1. Stripe: proizvodi i cene (Studio 97/67/lead-67, Hook Pack 27, Lab 47/mes, kupon 1€), Tax, Radar, Customer Portal
2. Cloudflare: `studio.aiprofit.rs`, Worker sa static assets, D1, Queue, Workers Paid plan, secrets
3. `/api/checkout` + landing CONFIG + datumi + placeholderi
4. `/api/stripe-webhook` + Queue consumer → Circle + MailerLite + welcome mejl + licenca + WooCommerce porudžbina na vladsdigital.com (proizvodi sa SKU-om, REST ključ, ugašeni Woo mejlovi kupcima) + noćni cron
5. Circle: access groups (Lab grupa otvara iste prostore kao Lab Paywall), AI Video Editor prostori, lekcije *Kreni ovde*, workflows
6. Install skripte + aktivacija licence u pluginu
7. `/hvala` + pravne stranice
8. PostHog + Cloudflare Web Analytics + cookie banner, osnovni događaji i funnel dashboard
9. Test end-to-end u Stripe test modu (kupovina, chargeback, 3DS kartica, Woo porudžbina, PostHog funnel)

**Faza 2: upsell i bump**
10. `/ponuda` + `/api/upsell` (one-click, 3DS, zaštita od duplog, provera Paywall člana)
11. Lab automatika (`invoice.paid`, `subscription.deleted`), onboarding *Prvih 30 dana*
12. Order bump + Hook Pack sadržaj
13. Stripe test clock: simulirati 30 dana → naplata 47€ → otkazivanje

**Faza 3: promet**
14. `/besplatno` + MailerLite nurture + lični rok 72h
15. ManyChat (STUDIO, SKILL)
16. Meta Pixel + CAPI, UTM tok

**Faza 4: evergreen**
17. Evergreen mod, Lab teaser prostor, referral

### Predlog kalendara (datumi na landingu su prošli)
- 2 nedelje izrade + testiranja → **otvaranje pon 9.11. u 9h**
- 67€ do sre 11.11. u 21h → 97€ do **ned 15.11. u 21h**
- Radionica za prvih 100: **ned 22.11. u 11h**
- Od 16.11. evergreen

---

## 13. Otvorena pitanja (za tebe)

1. **Circle Paywall i Stripe:** kako je Lab Paywall povezan sa Stripe-om (isti nalog kao za Studio ili Stripe Connect)? Proveravamo pri izradi, utiče na filtriranje webhook-a (sekcija 4).

### Rešeno 26.10.
- Postojeći Lab članovi ostaju na Circle Paywall-u, nove pretplate iz upsella idu direktno preko Stripe-a (oba paralelno).
- Domen: `studio.aiprofit.rs` na Cloudflare-u. Circle: `aiprofit.rs`. Woo: `vladsdigital.com`.
- Stripe nalog i porez: rešeno.
- Woo je samo spisak porudžbina, bez faktura.
- Analitika: PostHog + Meta Pixel/CAPI, bez TikTok-a.
- Nema garancije ni povraćaja za Studio. Ako ipak dođe do chargeback-a, Lab ostaje aktivan.
