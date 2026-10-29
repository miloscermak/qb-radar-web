# QB Radar

## O projektu
Veřejný repozitář `miloscermak/qb-radar-web`. Samotná aplikace QB Radar běží na
https://qb-radar.netlify.app/ (redakce se přihlašuje heslem). Tento repozitář jen
zachovává původní GitHub Pages adresu a přesměrovává z ní na Netlify.

Repozitář je veřejný: nikdy sem nepatří soukromé texty článků, konfigurace zdrojů
ani přístupové klíče.

## Struktura
- `site/index.html` – přesměrovací stránka (meta refresh + canonical na Netlify).
- `.github/workflows/pages.yml` – nasazení složky `site/` na GitHub Pages při pushi
  do `main` (jen při změně `site/**` nebo samotného workflow).
- `README.md` – krátký popis pro návštěvníky repozitáře.

## Příkazy
Žádný build ani testy. Nasazení proběhne automaticky po pushi do `main`.

## Konvence
- Komunikace s uživatelem probíhá česky.
- Commity: krátký, výstižný popis v rozkazovacím způsobu.
- Necommitovat tajné údaje (`.env`, klíče, tokeny).
