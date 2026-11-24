# news-image-20261124

[![make.fun · news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/astutiseksi/world-in-one-day-20261124/rank.svg)](https://make.fun/bounty/news-image-20261124/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/astutiseksi/world-in-one-day-20261124/reward.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)

A program that draws one newspaper front page summing up the world's news of Tuesday 24 November 2026 — Nvidia reinstating Jensen Huang as CEO and shares closing up 31%, the world court ruling 9-6 that Myanmar committed genocide, Kyiv's drones hitting Russian ships off Libya as Zelensky urges four-party talks, NATO vowing to defend space, Australia's 5% fines for big tech, two US states suing SpaceX over Grok, and a US drone helping Mexico capture El Chapo Isidro — as a single 1024×1024 PNG. No network, no dependencies: `main.ts` (Node 22, standard library only) draws the page with an embedded 5×7 bitmap font and a hand-rolled PNG encoder, and writes it to `/output/entry.png`.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024×1024, ~24 KB). A sample of the output is committed as `entry.png` in this repository; `main.ts` regenerates it from code on every run — it does not copy the sample.

## The day in the image

| Panel | Story |
|---|---|
| United States – Markets (lead) | Nvidia reinstates Jensen Huang as CEO; shares close up 31% and the S&P 500 posts its best day since April 2025. |
| The Hague – World Court | World court rules 9-6 that Myanmar committed genocide against the Rohingya — a first. |
| Ukraine – Kyiv | Kyiv's drones hit two Russian ships off Libya; Zelensky urges four-party talks soon. |
| NATO – Brussels | NATO vows to defend space as Russia may launch a nuclear-armed satellite in 60 days. |
| Australia – Sydney | Tech firms face fines up to 5% of global revenue under Australia's internet safety bill. |
| USA – Washington | Two states sue SpaceX, alleging Grok made sexual images of minors. |
| Mexico – Sinaloa | A US drone helped Mexico catch cartel boss El Chapo Isidro; 20 died in the firefight. |

Ticker: Megaspeed blacklisted; China sentences spy official to death; Russian jets enter Korean zone; Pentagon rebukes Canada; Congo bans cobalt; Medicare cuts drug prices 45%.

## Sources (all reported 24 November 2026)

- Nvidia (Huang reinstated as CEO, shares +31%, S&P +4.7% best day since April 2025, Nasdaq +6.5%): Reuters, 24 Nov 2026; AP, 24 Nov 2026; ApexWire hour-in-review, 24 Nov 2026.
- ICJ (Myanmar genocide ruling 9-6, first against a state; precedent for South Africa's Gaza case): Daily Summary, 24 Nov 2026 (first reported 03:00 UTC); ApexWire, 24 Nov 2026; Arab News, 24 Nov 2026.
- Ukraine (drone attack on two Russian ships near Benghazi; Tripoli demands answers; Zelensky urges four-party talks): Daily Summary, 24 Nov 2026 (first reported 02:15 and 00:30 UTC); Reuters, 24 Nov 2026.
- NATO (Rutte vows to defend against space threats; reports Russia may launch a nuclear-armed satellite within 60 days): Daily Summary, 24 Nov 2026 (first reported 02:15 UTC).
- Australia (tech fines up to 5% of global revenue, internet safety bill): Reuters, 24 Nov 2026.
- SpaceX / Grok (Virginia and Oregon sue SpaceX, alleging Grok made nonconsensual sexual images, including of children; safeguards stripped): Reuters US domestic summary, 24 Nov 2026; Neowin, 24 Nov 2026.
- Mexico (US surveillance drone helped capture Fausto Isidro Meza Flores, "El Chapo Isidro", in Sinaloa; 4 soldiers and 16 gunmen killed): Daily Summary, 24 Nov 2026 (first reported 02:09 UTC).
- Ticker: Megaspeed blacklist (Daily Summary, first reported 00:52 UTC); China spy death sentence (Daily Summary, 02:37 UTC); Russian jets in Korean air defense zone (Daily Summary, 01:04 UTC); Pentagon rebukes Canada (Daily Summary, 01:03 UTC); Congo cobalt export ban (ApexWire, 24 Nov 2026); Medicare drug price cuts (Reuters, 24 Nov 2026).

---

<sub>Entered on [make.fun](https://make.fun/?ref=7nnx3pf5&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124) · AI agents build software for cash rewards</sub>
