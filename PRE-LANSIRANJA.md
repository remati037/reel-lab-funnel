# Pre lansiranja

Spisak onoga što još mora da se reši pre nego što funnel ide uživo. Kad nešto rešiš, obriši tu stavku.
Na stranicama su ova mesta označena sa `[PROVERI]` ili `[UBACI]` (vidljiva narandžasta oznaka) ili sa `<div class="ph">` (prazan okvir).

## 1. Tvrdnje koje treba proveriti sa Vladom

Sve je u FAQ-u i u sekcijama landinga (`public/index.html`). Za svaku: potvrdi, ispravi ili izbaci, pa obriši oznaku `[PROVERI]`.

- [ ] **Claude desktop aplikacija (Claude Code)** i plaćeni Claude plan, Pro (20$) je dovoljan. Pominje se na 3 mesta: „Nije za tebe ako“, blok cene, FAQ „Šta mi treba na računaru?“.
- [ ] **Koliko rilsova pokriva Pro plan mesečno**: u FAQ-u „Koji Claude plan mi treba?“ stoji `[PROVERI: broj]`.
- [ ] **Srpski jezik.** U kodu stoji Vladina beleška: Studio 2.6.2 prepisuje govor engleskim modelima (small.en, medium.en), pa je prepis srpskih snimaka izašao na engleskom. Ako to i dalje važi, FAQ „Da li radi na srpskom?“ ne sme da kaže „Da“.
- [ ] **Ćirilica i slovo đ** u titlovima.
- [ ] **Privatnost snimaka**: sečenje i render na računaru, Claude vidi samo tekst i sličice, ti ne vidiš snimke.
- [ ] **Zernio**: zvanično povezivanje sa Instagramom, potreban Creator ili Business nalog, prva 2 naloga besplatna, svaki sledeći 6$ mesečno.
- [ ] **Trajanje montaže**: nekoliko minuta za rils od 15 do 30 sekundi, Chalk Talk i Show and Tell do desetak minuta.
- [ ] **Otkazan Claude plan**: Studio i stilovi ostaju sačuvani.
- [ ] **Priča autora**: „Montaža mi je bila usko grlo…“, Vlada traži konkretniji detalj ako postoji.
- [ ] **Vrednosti u bloku cene** (procena, 369€ ukupno): Look Builder 97€, FX paket 67€, probni rilsovi 47€, Carousel Studio 47€, objavljivanje 37€, zvuk i GIF Finder 27€, snimci i podešavanje 47€.
- [ ] **Upsell (`public/ponuda.html`)**: nazivi nedelja u planu „Prvih 30 dana“ i stavke „Sam / Sa Lab-om“ su predlog, uskladi ih sa onim što Lab stvarno daje.

## 2. Slike i videi

Fajlove stavi u `public/assets/`. Na svakom mestu u HTML-u je komentar sa tačnim imenom fajla ili tagom koji treba ubaciti.

Landing (`public/index.html`):
- [ ] Fotografija Vladimira (sekcija sa pričom autora)
- [ ] Kartice stilova 7, 8 i 9 (video + slika, kao `assets/stilovi/01-chalk-talk.mp4` i `.jpg`)
- [ ] Efekti: Type Wall, UI World, Couch Wall, Comment Bubble
- [ ] Probni rilsovi: objavljen rils, Proba 1, Proba 2
- [ ] Izgledi titlova: Horizon, Bold Creator, Old Money, Girly Pop, Soft Studio, Tvoj izgled

Upsell (`public/ponuda.html`):
- [ ] Video o AI Profit Lab-u, 60 do 90 sekundi (`assets/lab.mp4` + `assets/lab.jpg`)
- [ ] Fotografija autora za Lab (`assets/autor-lab.jpg`)
- [ ] Po želji: pravi screenshot-ovi iz Circle-a umesto nacrtanih kartica (`lab-30-dana.jpg`, `lab-poziv.jpg`, `lab-stil.jpg`, `lab-zajednica.jpg`)

## 3. Tehničko, pred produkcioni deploy

- [ ] Obrisati traku **TEST FUNNEL** sa `public/ponuda.html` i `public/hvala.html` (i `.demo` stil u `funnel.css`)
- [ ] Pravi Stripe Customer Portal link umesto test linka u `public/funnel.js` (`portalUrl`) i u `public/uslovi-pretplate.html`
- [ ] Live Stripe ključevi u Cloudflare secrets i Stripe cene `studio_launch` (67€) i `studio_regular` (200€)
- [ ] Posle svake izmene landinga: `npm run standalone` (pravi `landing-standalone.html`)
