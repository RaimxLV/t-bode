## Mērķis

Pievienot pirms-customizera izvēli starp **Bulk (vienots logo izmērs)** un **Individual (atsevišķs dizains katram izmēram)** workflow, lai komandas/apjoma pasūtījumi neveido fragmentētu grozu ar daudzām atsevišķām rindām.

## 1. Pre-customizer modal (ProductDetail)

Pirms Zakeke designer atvēršanas — `Dialog` ar 2 kartiņām:
- **A — Standartizēts logo izmērs (apjomam/komandām)** — atver designeri uz fiksēta "master" izmēra (sastādītā saraksta pirmais, pēc noklusējuma `M`)
- **B — Individuāls mērogs katram izmēram** — esošā plūsma, dizains saistīts ar konkrēto izvēlēto izmēru

Izvēli glabājam state: `designMode: "bulk" | "individual"`.

## 2. Bulk plūsma (Option A)

- Atver Zakeke ar master izmēru, `quantity = 1`
- `ZakekeDesigner` `onAddToCart` callback — **NEPIEVIENO** uzreiz grozam, bet atver jaunu `BulkSizeMatrixDialog`
- Matrix dialog:
  - Tabula ar visiem produkta izmēriem + skaitļa input (default 0)
  - Live kopējais daudzums + summa (esošās produkta cenas reizinājums; ja vēlāk pievienosim wholesale tier — caur to pašu komponentu)
  - "Apstiprināt un pievienot grozam" → 1 cart line ar:
    - `quantity` = visu izmēru summa
    - `size` = `"BULK"` (vai cilvēklasāmi `"2×S, 5×M, 5×L, 1×XL"`)
    - jauns lauks `selectedSizes: Record<string, number>`
    - tas pats `designId`, `designThumbnail`, `designPreviews`, `zakekeVisitorCode`

## 3. Individual plūsma (Option B)

Nemainās. Esošā loģika `ProductDetail` → `ZakekeDesigner` → `addItem` paliek 1:1.

## 4. DB & Backend

### `order_items` migration
- Pievienot `selected_sizes jsonb NULL` (null = individual; objekts = bulk)
- Pievienot `is_bulk boolean NOT NULL DEFAULT false` (ātrai filtrēšanai/UI tagam)

### `Checkout.tsx`
- Pārsūta `selected_sizes` un `is_bulk` uz `order_items` insert (gan Stripe, gan Montonio, gan manual bank transfer ceļos)

### `zakeke-create-order` edge function
- Esošā loģika rada 1 Zakeke order per `order_item` ar `quantity = it.quantity`
- Ar `selected_sizes`: vienā Zakeke order saglabājam **vienu line** ar kopējo `quantity` un papildus `notes` / `properties` array, kas uzskaitīts katrs izmērs un tā skaits, lai Zakeke un raža redz: 1 print fails → sadalīt pa izmēriem.
- Print failu logic NEMAINĀS — viens `designId` → tie paši front/back faili.

## 5. Cart UI

- `CartSidebar` un checkout summary: ja `selectedSizes` ir aizpildīts, parādīt izmēru sadalījumu zem produkta nosaukuma (`2×S · 5×M · 5×L · 1×XL`) viena izmēra vietā.

## 6. Admin

- `OrdersList` / order detail rindas:
  - Badge: `[BULK: UNIFIED PRINT SIZE]` (oranžs) vai `[INDIVIDUAL: SCALED PER SIZE]` (neitrāls)
  - Bulk rindām: `"Kopā: 13 gab · Sadalījums: 2×S, 5×M, 5×L, 1×XL"`
  - Print failu pogai (`ZakekePrintFilesButton`) — neizmaiņas; tā joprojām strādā ar 1 design ID

## 7. Translations

Pievienot LV+EN atslēgas modalim, matrix dialogam, cart sadalījuma rindai, admin badge.

## Skartie faili

**Frontend**
- `src/pages/ProductDetail.tsx` — modal + state pārvaldība
- `src/components/ZakekeDesigner.tsx` — nodot `mode` un master size; bulk režīmā mainīt `onAddToCart` plūsmu
- `src/components/BulkSizeMatrixDialog.tsx` *(jauns)*
- `src/context/CartContext.tsx` — `CartItem.selectedSizes?: Record<string,number>`, `isBulk?: boolean`; salikšanas atslēga ņem vērā bulk
- `src/components/CartSidebar.tsx` — sadalījuma render
- `src/pages/Checkout.tsx` — sūtīt jaunos laukus uz `order_items`
- `src/components/admin/OrdersList.tsx` — badge + sadalījums
- `src/locales/lv/translation.json`, `src/locales/en/translation.json`

**Backend**
- Jauna migrācija: `order_items.selected_sizes jsonb`, `order_items.is_bulk boolean`
- `supabase/functions/zakeke-create-order/index.ts` — bulk gadījumā 1 Zakeke order ar agregātu `quantity` + size sadalījuma metadata
- `supabase/functions/montonio-webhook/index.ts` un `supabase/functions/stripe-webhook/index.ts` — bez izmaiņām (jau izsauc zakeke-create-order)
- `src/integrations/supabase/types.ts` — auto-regen pēc migrācijas

## Tehniskās nianses

- Cart merge loģika: bulk items vienmēr atsevišķa rinda (kā jau šobrīd `designId`-itemi), jo katrai bulk pievienošanai cits selected_sizes
- Master size izvēle: ņemam vidējo no `product.sizes` (`M` ja ir, citādi pirmo)
- Validācija matrix dialogā: jābūt vismaz 1 gab kopā; "Apstiprināt" disabled, ja `total === 0`
- Zakeke API payload bulk gadījumā — viens line ar `quantity = sum` un `properties: [{name:"size_breakdown", value:"S:2,M:5,L:5,XL:1"}]` (Zakeke `properties` lauks ir brīvas formas)

## Plūsma vienā teikumā

ProductDetail → "Sākt dizainu" → izvēles modal → (A) Zakeke ar master M → onAddToCart → BulkSizeMatrixDialog → 1 cart line ar `selectedSizes` → checkout saglabā `selected_sizes` JSON → webhook izsauc zakeke-create-order → 1 Zakeke order ar agregātu daudzumu + size breakdown → admin redz BULK badge un sadalījumu, viens print fails der visiem.
