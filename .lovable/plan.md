
## Mērķis

Pievienot automātiskas apjoma atlaides **tikai personalizētiem produktiem** (T-krekli/hūdiji ar Zakeke dizainu vai BULK), pārveidot dizaina plūsmas izvēles logu par modernām vizuālām kartītēm un pievienot cenu skaidrojuma bloku.

---

## 1. Apjoma atlaides loģika

**Jauns helper `src/lib/volumeDiscount.ts`:**
- `getDiscountPercent(qty)` → 0 | 10 | 15 | 30
  - 5–9 → 10%, 10–19 → 15%, 20+ → 30%
- `isEligibleItem(item)` → `true`, ja `item.designId` vai `item.isBulk` (gatavie kolekcijas produkti = neattiecas).
- `applyDiscount(item)` → atgriež `{ unitPrice, discountedUnitPrice, lineTotal, discountPercent, savings }`.

**`CartContext`:**
- `totalPrice` pārrēķina, piemērojot atlaidi atbilstošajiem ierakstiem (qty = `item.quantity`, kas BULK gadījumā jau ir summa pa izmēriem).
- Pievienot `discountedTotal`, `totalSavings`, `getLineDiscount(item)` palīgus contextā.

**`CartSidebar`:**
- Pie katras pozīcijas, ja atlaide piemērota, parādīt nopārsvītrotu cenu + jauno cenu + mazu badge `−10/15/30%`.
- Apakšā: starpsumma, ietaupījums, kopā ar atlaidi.

**Checkout (`src/pages/Checkout.tsx` + `create-checkout` edge function):**
- Uz Stripe/bank flow padot jau atlaidētās `price` vērtības `items[]` (pārrakstam `unit_price` pirms sūtīšanas).
- `order_items.unit_price` un `orders.total` saglabā jau atlaidētās summas — neviena DB izmaiņa nav vajadzīga; netiek izmantots `promo_codes`.
- Saglabājam oriģinālo `base_unit_price` / `print_unit_price` kā līdz šim (informatīvi).

## 2. Dizaina plūsmas izvēles logs (ProductDetail.tsx)

Pārveidot esošo `Dialog` `workflowChoiceOpen` par 2 lielām kartītēm:

- **Kartīte A — Standarta pasūtījums:** SVG ilustrācija ar 3 vienādiem krekliem rindā (vienkrāsains, viens centrēts logo) + jauns LV teksts no specifikācijas.
- **Kartīte B — Individuāls dizains:** SVG ar 3 krekliem, katram cits motīvs (#1, ⭐, ABC) + jauns LV teksts.
- Hover efekts: `border-primary`, `scale-[1.02]`, `shadow-glow`, ilustrācijas elementi viegli kustas (CSS transition).
- Zem kartītēm — **cenu skaidrojuma bloks** (jauns komponents `PricingExplainer.tsx`):
  - 3 punkti: bāzes cena, personalizācija, apjoma atlaide (ar 5+/10+/20+ pakāpieniem).
  - Atkalizmantojams; tiek rādīts arī tukšajā groza skatā un Checkout sānā.

## 3. Tulkojumi

Pievienot LV (un EN kopijas) atslēgas `src/locales/lv/translation.json` un `en/translation.json`:
- `bulk.optionATitle/Description` (pārrakstām)
- `bulk.optionBTitle/Description` (pārrakstām)
- `pricing.explainer.*` — virsraksts un 3 punkti + atlaides līmeņi
- `cart.volumeDiscountBadge`, `cart.savings`, `cart.subtotal`

## 4. Tehniskās detaļas

- Atlaide pamatā ir vienai pozīcijai (`item.quantity`), kas atbilst lietotāja formulējumam "vienādas preces skaitam grozā". BULK gadījumā `quantity` = visu izmēru summa → automātiski strādā.
- Nesummējam dažādu produktu skaitus — ja klients grib 10 šortus + 10 hūdijus, katrs saņem savu atlaidi (skaidri un godīgi; atbilst pašreizējam UI rādījumam pa rindām).
- Atlaide tiek aprēķināta no `price` (kas jau iekļauj `customizationPrice`), tātad `(bāzes + Zakeke) × qty × (1 − discount)`.
- Nemainām DB shēmu, RLS, vai promo kodu sistēmu.

## Skartie faili

- `src/lib/volumeDiscount.ts` (jauns)
- `src/components/PricingExplainer.tsx` (jauns)
- `src/context/CartContext.tsx`
- `src/components/CartSidebar.tsx`
- `src/pages/ProductDetail.tsx` (workflow modal)
- `src/pages/Checkout.tsx` (padot atlaidēto cenu)
- `src/locales/lv/translation.json`, `src/locales/en/translation.json`
