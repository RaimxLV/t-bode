
UPDATE public.products SET slug = CASE slug
  WHEN 'baby-bodysuits' THEN 'bernu-bodijs'
  WHEN 'color-changing-mug-magic' THEN 'magiska-kruze-300ml'
  WHEN 'cotton-bag' THEN 'kokvilnas-soma'
  WHEN 'duo-two-tone-mug' THEN 'divkrasu-kruze-300ml'
  WHEN 'fan-shirts' THEN 't-krekls-fanu'
  WHEN 'hoodie-with-embroidery-latvia' THEN 'dzemperis-ar-uzsuvi-latvija'
  WHEN 'kids-fan-shirt' THEN 'bernu-t-krekls-fanu'
  WHEN 'kids-hoodie-embroidery-latvia' THEN 'bernu-dzemperis-ar-uzsuvi-latvija'
  WHEN 'kids-hoodie-latvija' THEN 'bernu-dzemperis-ar-izsuvumu-latvija'
  WHEN 'large-mug-450ml' THEN 'liela-kruze-450ml'
  WHEN 'latvia-hoodie-three-stars' THEN 'dzemperis-tris-zvaigznes'
  WHEN 'latvia-hoodie-with-embroidery' THEN 'dzemperis-ar-izsuvumu-latvija'
  WHEN 'latvia-shirt-three-stars' THEN 't-krekls-tris-zvaigznes'
  WHEN 'latvia-shirt-with-embroidery' THEN 't-krekls-ar-izsuvumu-latvija'
  WHEN 'latvian-hat-embroidery-latvia' THEN 'cepure-latvija'
  WHEN 'latvian-socks' THEN 'zekes-latvija'
  WHEN 'mug-gold-silver-rim' THEN 'kruze-ar-zelta-sudraba-osi-300ml'
  WHEN 'oak-leaf-bag' THEN 'soma-ozollapas'
  WHEN 'oak-leaf-shirt' THEN 't-krekls-ozollapas'
  WHEN 'organic-cotton-t-shirt' THEN 'stanley-stella-organiskas-kokvilnas-t-krekls'
  WHEN 'sweatshirt-without-hood' THEN 'dzemperis-bez-kapuces'
  WHEN 't-shirt-kids' THEN 'bernu-t-krekls'
  WHEN 'unisex-dry-handfeel-heavyweight' THEN 'stanley-stella-bieza-auduma-t-krekls'
  WHEN 'unisex-hoodie' THEN 'dzemperis-ar-kapuci'
  WHEN 'white-mug-300ml' THEN 'balta-kruze-300ml'
  ELSE slug
END,
updated_at = now()
WHERE slug IN (
  'baby-bodysuits','color-changing-mug-magic','cotton-bag','duo-two-tone-mug',
  'fan-shirts','hoodie-with-embroidery-latvia','kids-fan-shirt',
  'kids-hoodie-embroidery-latvia','kids-hoodie-latvija','large-mug-450ml',
  'latvia-hoodie-three-stars','latvia-hoodie-with-embroidery',
  'latvia-shirt-three-stars','latvia-shirt-with-embroidery',
  'latvian-hat-embroidery-latvia','latvian-socks','mug-gold-silver-rim',
  'oak-leaf-bag','oak-leaf-shirt','organic-cotton-t-shirt',
  'sweatshirt-without-hood','t-shirt-kids','unisex-dry-handfeel-heavyweight',
  'unisex-hoodie','white-mug-300ml'
);
