# AI Video Editor: funnel (srpska verzija)

Landing stranica i stranice posle kupovine za AI Video Editor. Čist HTML, CSS i JavaScript, bez build koraka i bez instalacije paketa.

Trenutno je sve u **test modu**: plaćanje je simulirano i ništa se ne naplaćuje. Plan za pravu verziju (Stripe, Circle, MailerLite, webhook-ovi) je u [FUNNEL-PLAN.md](FUNNEL-PLAN.md).

## Flow

```
index.html  ──►  checkout.html  ──►  ponuda.html  ──►  hvala.html
 (landing)        (test checkout)     (upsell: AI       (potvrda i
                                       Profit Lab 1€)    sledeći koraci)
```

## Pokretanje u lokalu

Treba ti Node.js 20 ili noviji. Stranice i API rade u lokalnom Cloudflare Worker-u.

1. Kloniraj repo i uđi u folder:
   ```bash
   git clone https://github.com/remati037/reel-lab-funnel.git
   cd reel-lab-funnel
   ```
2. Instaliraj pakete i napravi lokalnu bazu (samo prvi put):
   ```bash
   npm install
   npm run db:local
   ```
3. Kopiraj `.dev.vars.example` u `.dev.vars` i upiši ključeve. Bez Stripe ključa dugmad vode na test checkout, pa sve radi i bez ključeva.
4. Pokreni:
   ```bash
   npm run dev
   ```
5. Otvori u browseru: **http://localhost:8787**

Server gasiš sa `Ctrl + C` u terminalu.

Plan izrade korak po korak je u [REALIZACIJA.md](REALIZACIJA.md).

## Kako da prođeš ceo flow

1. **Landing:** na http://localhost:8787 klikni bilo koje dugme **„Neka Claude montira moje rilsove“**.
2. **Checkout:** otvara se test checkout, sa formom i odbrojavanjem levo i karticom „Tvoja porudžbina“ desno.
   - Po želji čekiraj **Viral Hook Pack (+27€)** (order bump). Ukupno u kartici porudžbine se menja sa 200€ na 227€.
   - Upiši bilo koji email (npr. `test@primer.rs`) i čekiraj **uslove**. Polja kartice su zaključana test vrednostima.
   - Klikni **Završi porudžbinu**.
3. **Ponuda (upsell):** stranica „Tvoja porudžbina nije završena“.
   - **„Da, dodaj AI Profit Lab za 1€“** vodi na hvala stranicu sa karticom za Lab.
   - **„Ne hvala, idem na svoj Studio →“** vodi na hvala stranicu bez Lab-a.
4. **Hvala:** prikazuje samo kartice koje važe za tu porudžbinu (Lab, Hook Pack, radionica), pa tri koraka do prvog rilsa.

Na ponudi i hvala stranici, dole desno, je traka **TEST FUNNEL** sa linkom za povratak na početak.

### Simulacija različitih kupaca

Na dnu checkout-a je okvir **„Simulacija (samo test)“**:

| Prekidač | Šta se desi |
|---|---|
| Kupac je među prvih 100 | Na hvala stranici se pojavi kartica za radionicu i dugme „Dodaj u kalendar“ |
| Kupac je već AI Profit Lab član | Preskače ponudu i ide pravo na hvala, sa porukom „Već si u Lab-u“ |
| Banka odbija upsell naplatu | Na ponudi, posle klika na „Da“, pojavi se poruka o odbijenoj naplati |

### Direktni linkovi za pregled

| Šta | Link |
|---|---|
| Hvala, osnovna | http://localhost:8787/hvala |
| Hvala, sve kartice | http://localhost:8787/hvala?lab=1&bump=1&radionica=1 |
| Hvala, već Lab član | http://localhost:8787/hvala?lab=clan |
| Ponuda sa odbijenom naplatom | http://localhost:8787/ponuda?fail=1 |

## Fajlovi

| Fajl | Šta je |
|---|---|
| `public/index.html` | Landing stranica |
| `public/styles.css` | Boje, fontovi i stilovi za sve stranice (promenljive na vrhu: `--orange`, `--cream`...) |
| `public/script.js` | Podešavanja landinga: link za checkout, rok za odbrojavanje, cene |
| `public/checkout.html` | Test checkout (uživo ga zamenjuje Stripe Checkout) |
| `public/ponuda.html` | Upsell: AI Profit Lab, 1€ prvi mesec |
| `public/hvala.html` | Stranica posle kupovine |
| `public/funnel.css` | Stilovi za checkout, ponudu i hvala stranicu |
| `public/funnel.js` | Podešavanja za ponudu i hvala: test mod, Circle link, mejl, cene Lab-a, datum radionice |
| `public/landing-standalone.html` | Landing u jednom fajlu, za deljenje (ne vodi kroz funnel) |
| `public/assets/` | Ovde idu tvoje slike i videi |
| `src/` | Cloudflare Worker: `/api/checkout`, `/api/stripe-webhook`, `/api/order`, red za isporuku, noćna provera |
| `migrations/` | Šema D1 baze |
| `wrangler.jsonc` | Cloudflare podešavanja: baza, red, cron, do kada važi cena za lansiranje (`LAUNCH_UNTIL`, `MODE`) |
| `.dev.vars.example` | Šablon za ključeve |

## Licenca za AI Video Editor plugin

Plugin radi samo za mejl kojim je plaćen Studio, na jednom računaru (`LICENSE_MAX_DEVICES` u `wrangler.jsonc`).
Kod je u `src/license.js` (server) i `scripts/license.py` u repou `vladsdigital/ai-video-editor` (plugin).

- Licencu ima mejl sa plaćenom Studio porudžbinom (`orders`, `status = 'paid'`). Chargeback menja status u `disputed`, pa licenca prestaje sama.
- API: `POST /api/license/code` (kod na mejl), `/activate` (kod → token za računar), `/verify` (plugin pita na početku četa), `/deactivate` (oslobađa računar).

Ručne komande (lokalno umesto `--remote` stavi `--local`):

```bash
# Daj licencu mejlu bez kupovine (tim, tester, poklon)
npx wrangler d1 execute creator-studio --remote --command "INSERT INTO license_grants (email, note) VALUES ('ime@primer.rs', 'tester')"

# Na kojim računarima je aktiviran neki mejl
npx wrangler d1 execute creator-studio --remote --command "SELECT device_name, activated_at, last_seen FROM license_devices WHERE email = 'ime@primer.rs'"

# Oslobodi sve računare tog mejla (kupac promenio računar, a stari više nema)
npx wrangler d1 execute creator-studio --remote --command "DELETE FROM license_devices WHERE email = 'ime@primer.rs'"
```
