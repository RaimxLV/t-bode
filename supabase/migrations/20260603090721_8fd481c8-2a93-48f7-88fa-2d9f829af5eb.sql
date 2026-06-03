UPDATE public.products
SET sizes = ARRAY(SELECT DISTINCT REPLACE(REPLACE(REPLACE(REPLACE(unnest, '5XL', 'XXXXXL'), '4XL', 'XXXXL'), '3XL', 'XXXL'), '2XL', 'XXL') FROM unnest(sizes))
WHERE sizes && ARRAY['2XL','3XL','4XL','5XL'];