## Mērķi

1. Sakārtot dizainu haosu — viena vieta visiem dizainiem ar filtriem
2. Fona noņemšana arī kampaņas dizainiem (caur auto-saglabāšanu bibliotēkā)
3. Brīvais AI ģenerators bez kampaņas (smieklīgi kaķi u.tml.)

## Pašreizējais haoss

| Vieta | Kas tur ir | Problēma |
|---|---|---|
| Autopilot → CampaignWizard | Kampaņas dizaini + (jau eksistē) bibliotēkas panelis blakus | Bg-remove tikai bibliotēkai |
| **Melnraksti → Dizaini** (`DraftDesignsGallery`) | Apvieno `design_library` + `campaign_designs` bez `product_id` | Dublē Bulk Studio Bibliotēku |
| **Bulk Studio → Bibliotēka** (`DesignLibrary`) | Tikai `design_library` augšupielādes | Dublē Melnraksti |
| **Dizaini → Krekli** (`DesignsToProducts`) | Pārvērš dizainus produktos | Tas paliek — atsevišķa funkcija |

## Risinājums

### 1. Vienota "Dizainu bibliotēka" (jauna komponente)

Aizvietot `DraftDesignsGallery` un `Bulk Studio → Bibliotēka` ar vienu `UnifiedDesignLibrary` komponenti.

**Filtri (chip-row):**
- Visi
- Augšupielādēti (`design_library` bez `campaign` tag)
- Kampaņu ★ favorīti (`design_library` ar `campaign` tag)
- Kampaņu melnraksti (`campaign_designs` ar `product_id IS NULL`)
- Bez fona (PNG ar transparency tagu)

**Darbības katram:** Apskatīt (lightbox) · Noņemt fonu · Lejupielādēt (cm dialogs) · Pārvērst produktā · Dzēst.

Atjaunot `Melnraksti` tabu lai rāda tikai produktu melnrakstus (paslēpt `Dizaini` apakštabu — tos rādīs bibliotēka).
`Bulk Studio → Bibliotēka` tabs paliek bet `DesignLibrary.tsx` aizvietota ar to pašu `UnifiedDesignLibrary`.

### 2. Fona noņemšana kampaņas dizainiem

`CampaignWizard.tsx` dizainu cell + jauns lightbox (atvērts klikšķinot bildi):
- Poga **"Noņemt fonu"** abās vietās
- Plūsma: ja dizains vēl nav bibliotēkā → izsauc `saveToLibrary(d)` (jau eksistē) → tad `removeDesignBackground([newLibId])` → atsvaidzina `signedUrls` ar jauno transparent PNG
- Lietotāja teiktais: "vispirms automātiski saglabā bibliotēkā" ✓

Jauns `CampaignDesignLightbox` komponents — atver dizainu pilnā izmērā ar pogām: ★ · Noņemt fonu · Lejupielādēt · Pārģenerēt · Dzēst.

### 3. Brīvais AI ģenerators (jauns tabs Autopilot)

Jauns `Autopilot` apakštabu sākums:
- **Svētku kampaņas** (esošais `AutopilotDashboard`)
- **AI Studija** (jauns) — brīvs prompts bez kampaņas

`FreeDesignStudio.tsx`:
- Liels textarea prompts ("smieklīgi kaķi astronauta tērpā…")
- Skaits (1–8), izmērs (kvadrāts / portrets), modelis (auto / recraft / flux-pro u.c.)
- Poga "Ģenerē" — izsauc esošu `generate-campaign-designs` edge funkciju ar **virtuālu kampaņu** (status `archived`, title "AI Studija"). Vai vienkāršāks: jauna mazāka funkcija `generate-free-design` kas izsauc fal.ai tieši un saglabā rezultātu **uzreiz `design-library` bucket + `design_library` row** ar tagu `["ai", "studio"]`.
- Pēc ģenerēšanas: rezultāti parādās zem formas + automātiski bibliotēkā ar tagu "studio"

**Tehnisks risinājums:** Izveidot jaunu mazu edge funkciju `generate-free-design` (reuses fal.ai loģiku no `generate-campaign-designs`), lai izvairītos no fake-campaign hakeriem. Saglabā tieši `design-library` ar tagu `studio`.

### 4. Admin tabu sakārtošana

```
Autopilot (apakštabi: Kampaņas | AI Studija)
Dizainu bibliotēka (jauns — aizvieto "Melnraksti → Dizaini")
Dizaini → Krekli (paliek)
Melnraksti (tikai produktu melnraksti — bez apakštabu)
```

`Bulk Studio → Bibliotēka` paliek bet rāda to pašu unified komponenti (vai linkojas uz galveno tabu).

## Tehniskas detaļas

- **Tags konvencija `design_library.tags`:** `upload` (manuāls augšupl.), `campaign` (saglabāts no kampaņas), `studio` (no AI Studio), `transparent` (pēc bg-remove).
- **`removeDesignBackground`** funkcija jau strādā — pielietot to no UnifiedDesignLibrary un no CampaignWizard pēc auto-save.
- **`DownloadSizeDialog`** atkārtoti izmantot abās vietās.
- **Migrācijas:** Nav vajadzīgas — visas datu struktūras jau eksistē. Tikai pievienojam tagus.

## Failu izmaiņas

**Jauni:**
- `src/components/admin/UnifiedDesignLibrary.tsx` — galvenā jaunā komponente
- `src/components/admin/FreeDesignStudio.tsx` — AI ģenerators bez kampaņas
- `src/components/admin/CampaignDesignLightbox.tsx` — lightbox ar darbībām
- `supabase/functions/generate-free-design/index.ts` — viena bilde, tieši uz library

**Maina:**
- `src/components/admin/AutopilotDashboard.tsx` — pievienot apakštabu (Kampaņas / AI Studija)
- `src/components/admin/CampaignWizard.tsx` — pievienot bg-remove pogu dizainu cell + atvērt lightbox uz klikšķa
- `src/pages/Admin.tsx` — pārdēvēt "Melnraksti → Dizaini" → atsevišķs "Dizainu bibliotēka" tabs; melnraksti = tikai produkti
- `src/components/admin/BulkStudio.tsx` — Bibliotēka tabs izsauc UnifiedDesignLibrary

**Aizvietots (paliek import-savietojams):**
- `src/components/admin/DraftDesignsGallery.tsx` — kļūst plāns wrapper ap UnifiedDesignLibrary (vai dzēsts)
- `src/components/admin/bulk/DesignLibrary.tsx` — tāpat

## Pieņēmumi / atvērtie

- AI Studio rezultāti iet **uzreiz uz bibliotēku** (ne uz "starprezultātu sarakstu"). Ja gribi pirms-apstiprināšanu, pasaki.
- "Transparent" tag tiks pievienots automātiski pēc bg-remove (lai filtrs strādā).
