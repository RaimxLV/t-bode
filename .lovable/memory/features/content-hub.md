---
name: Content hub (Idejas un Padomi) rules
description: DTF-first content rules, no reading time, no table of contents for /idejas articles
type: feature
---
- Galvenā tehnoloģija ir DTF — visos rakstos uzsvars uz DTF priekšrocībām.
- DTG T-Bode NAV; to drīkst minēt tikai kā salīdzinājumu/piemēru.
- Vinilplēve, sublimācija, sietspiede — tikai individuāliem pieprasījumiem.
- Rakstos NERĀDA lasīšanas ilgumu ("min lasīšana") un NERĀDA satura rādītāju (TOC).
- Raksta CTA poga = HeroCtaButton (tāda pati kā hero sadaļā), "Sākt personalizēt" → /design.
- Sezonalitāte: content_topics.season_months (1-12; tukšs = visu gadu). Svētku tēmas ģenerējas TIKAI savos mēnešos (Ziemassvētki 11-12, Valentīndiena 1-2, Lieldienas 3-4, Mātes diena 4-5, Jāņi 5-6, skolas sākums 7-8).
- Katram rakstam kalendārā ir "Pārģenerēt" (teksts) un "AI bilde" (fotoreālistisks vāka attēls) pogas.

## PAUZE + stila iebildumi (2026-08-06)
- Rakstu automātiskā publicēšana ir APTURĒTA (cron `publish-approved-content` atslēgts). Neieslēgt atpakaļ bez lietotāja atļaujas.
- Lietotājam nepatīk esošais rakstu stils: izklausās kā "90. gadu sākums", pārāk pašsaprotami/banāli teksti, pārāk daudz salīdzinājumu (DTF vs DTG vs sietspiede u.tml.) un pārāk uzskatāms, uzbāzīgs DTF uzsvars.
- Pirms jaunas ģenerēšanas jāpārstrādā prompts: mūsdienīga, konkrēta, praktiska valoda; minimāli salīdzinājumi; DTF jāparādās dabiski, nevis reklāmas tonī; bez pašsaprotamām frāzēm.
