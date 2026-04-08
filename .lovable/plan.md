

## Sākotnējo FAQ jautājumu pievienošana datubāzē

Ievietosim 5-6 biežāk uzdotos jautājumus ar atbildēm abās valodās (LV/EN) tieši `faqs` tabulā.

### Jautājumi, kas tiks pievienoti:

1. **Kā noformēt pasūtījumu?** — soļi, kā veikt pirkumu
2. **Cik ilgi aizņem piegāde?** — piegādes termiņi (Omniva, kurjers)
3. **Kā izveidot savu dizainu?** — personalizācijas process
4. **Vai es varu atgriezt preci?** — atgriešanas politika
5. **Kādas izmaksas ir piegādei?** — piegādes cenas
6. **Vai jūs piedāvājat vairumtirdzniecību?** — korporatīvie pasūtījumi

### Tehniskā izpilde

- Izmantosim Supabase insert rīku, lai ievietotu 6 ierakstus `faqs` tabulā
- Katram ierakstam: `question_lv`, `answer_lv`, `question_en`, `answer_en`, `sort_order`, `is_active = true`
- Nav nepieciešamas migrācijas — tabula jau eksistē

