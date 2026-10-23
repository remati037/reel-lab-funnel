# Creator Studio: funnel (srpska verzija)

Landing stranica i stranice posle kupovine za Creator Studio. Čist HTML, CSS i JavaScript, bez build koraka i bez instalacije paketa.

Trenutno je sve u **test modu**: plaćanje je simulirano i ništa se ne naplaćuje. Plan za pravu verziju (Stripe, Circle, MailerLite, webhook-ovi) je u [FUNNEL-PLAN.md](FUNNEL-PLAN.md).

## Flow

```
index.html  ──►  checkout.html  ──►  ponuda.html  ──►  hvala.html
 (landing)        (test checkout)     (upsell: AI       (potvrda i
                                       Profit Lab 1€)    sledeći koraci)
```

## Pokretanje u lokalu

Treba ti samo Python 3 (na Mac-u je već instaliran). Fajlovi se ne otvaraju duplim klikom, nego preko lokalnog servera, da bi linkovi između stranica i skripte radili kako treba.

1. Kloniraj repo i uđi u folder:
   ```bash
   git clone https://github.com/remati037/reel-lab-funnel.git
   cd reel-lab-funnel
   ```
2. Pokreni lokalni server:
   ```bash
   python3 -m http.server 5500
   ```
3. Otvori u browseru: **http://localhost:5500**

Server gasiš sa `Ctrl + C` u terminalu.

> Ako posle izmene fajla u browseru vidiš staru verziju, uradi tvrdi refresh: `Cmd + Shift + R` (Mac) ili `Ctrl + Shift + R` (Windows).

## Kako da prođeš ceo flow

1. **Landing:** na http://localhost:5500 klikni bilo koje dugme **„Neka Claude montira moje rilsove“**.
2. **Checkout:** otvara se test checkout koji liči na Stripe.
   - Po želji čekiraj **Viral Hook Pack (+27 €)** (order bump). Ukupno se menja sa 97 € na 124 €.
   - Upiši bilo koji email (npr. `test@primer.rs`) i čekiraj **uslove**.
   - Klikni **Plati**. Apple Pay i Google Pay dugmad preskaču proveru forme.
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
| Hvala, osnovna | http://localhost:5500/hvala.html |
| Hvala, sve kartice | http://localhost:5500/hvala.html?lab=1&bump=1&radionica=1 |
| Hvala, već Lab član | http://localhost:5500/hvala.html?lab=clan |
| Ponuda sa odbijenom naplatom | http://localhost:5500/ponuda.html?fail=1 |

## Fajlovi

| Fajl | Šta je |
|---|---|
| `index.html` | Landing stranica |
| `styles.css` | Boje, fontovi i stilovi za sve stranice (promenljive na vrhu: `--orange`, `--cream`...) |
| `script.js` | Podešavanja landinga: link za checkout, rok za odbrojavanje, cene |
| `checkout.html` | Test checkout (uživo ga zamenjuje Stripe Checkout) |
| `ponuda.html` | Upsell: AI Profit Lab, 1€ prvi mesec |
| `hvala.html` | Stranica posle kupovine |
| `funnel.css` | Stilovi za checkout, ponudu i hvala stranicu |
| `funnel.js` | Podešavanja za ponudu i hvala: test mod, Circle link, mejl, cene Lab-a, datum radionice |
| `landing-standalone.html` | Landing u jednom fajlu, za deljenje (ne vodi kroz funnel) |
| `assets/` | Ovde idu tvoje slike i videi |
| `FUNNEL-PLAN.md` | Kompletan plan funnela |

## Šta menjaš gde

- **Cene i rok odbrojavanja na landingu:** `CONFIG` na vrhu `script.js`
- **Circle link, mejl, cene Lab-a, datum radionice:** `FUNNEL` na vrhu `funnel.js`
- **Boje i fontovi:** `:root` na vrhu `styles.css`
- **Slike i videi:** stavi fajl u `assets/` i ubaci `<img>` ili `<video>` u odgovarajući okvir. Pored svakog okvira u HTML-u piše komentar sa primerom.

## Pre puštanja uživo

1. U `script.js` postavi `checkoutUrl` na `/api/checkout` (Stripe Checkout).
2. U `funnel.js` postavi `demo: false` i upiši pravi `circleUrl`, `email` i `stripeKey`.
3. Obriši trake „TEST FUNNEL“ sa dna `ponuda.html` i `hvala.html`.
4. Zameni placeholdere: `[Tvoje Ime]`, `[Tvoj Brend]`, `info@tvojdomen.rs`, imena u utiscima, slike i videe.

Sve ostalo (API rute, webhook, Circle, MailerLite) je opisano u [FUNNEL-PLAN.md](FUNNEL-PLAN.md).
