-- Add popular Latvian holidays/observances for autopilot campaigns.
-- Safe to re-run: unique constraint (name_lv, month, day) prevents duplicates.

INSERT INTO public.holidays (name_lv, month, day, prompt_theme, lead_days, is_active) VALUES
  ('Valentīna diena',        2, 14, 'Mīlestība, sirsniņas, pāri, romantika, sarkans un rozā', 21, true),
  ('Sieviešu diena',         3,  8, 'Pavasaris, ziedi, sievišķība, dāvana mammai vai draudzenei', 21, true),
  ('Skolas sākums',          9,  1, 'Zinību diena, 1. septembris, skola, bērni, gladiolas', 21, true),
  ('Skolotāju diena',       10,  5, 'Skolotāju diena, paldies skolotājam, ābols, grāmatas', 21, true),
  ('Tēva diena',             9, 13, 'Tētis, ģimene, lepnums, "labākais tētis pasaulē"', 21, true),
  ('Helovīns',              10, 31, 'Helovīns, ķirbji, spoki, raganas, melns un oranžs', 21, true),
  ('Mārtiņdiena',           11, 10, 'Mārtiņdiena, gailis, rudens, latviešu tradīcijas', 14, true),
  ('Lāčplēša diena',       11, 11, 'Lāčplēša diena, varonība, sveces, sarkanbaltsarkans', 14, true),
  ('Melnā piektdiena',      11, 28, 'Black Friday, atlaides, iepirkšanās, dāvanas', 14, true),
  ('Vecgada vakars',         12, 31, 'Vecgada vakars, salūts, šampanietis, atskats uz gadu', 21, true),
  ('Meteņi',                 2, 16, 'Meteņi, ziemas atvadīšana, pankūkas, latviešu folklora', 21, true),
  ('Baltā galdauta svētki',  5,  4, '4. maijs, Latvijas neatkarības atjaunošana, baltais galdauts', 14, true),
  ('Annas diena',            7, 26, 'Annas diena, vārdadiena, vasara', 14, true)
ON CONFLICT (name_lv, month, day) DO NOTHING;
