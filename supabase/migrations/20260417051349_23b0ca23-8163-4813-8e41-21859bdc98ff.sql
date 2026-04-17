DO $$
DECLARE
  rec RECORD;
  variant jsonb;
  key TEXT;
  merged jsonb;
  result jsonb;
  keys_order TEXT[];
  k TEXT;
  acc jsonb;
BEGIN
  FOR rec IN SELECT id, color_variants FROM products WHERE jsonb_array_length(color_variants) > 0 LOOP
    merged := '{}'::jsonb;
    keys_order := ARRAY[]::TEXT[];

    FOR variant IN SELECT * FROM jsonb_array_elements(rec.color_variants) LOOP
      key := lower(trim(coalesce(variant->>'name', '')));
      IF key = '' THEN CONTINUE; END IF;

      IF merged ? key THEN
        -- merge images
        acc := merged->key;
        acc := jsonb_set(
          acc,
          '{images}',
          (
            SELECT jsonb_agg(DISTINCT img)
            FROM (
              SELECT jsonb_array_elements(coalesce(acc->'images','[]'::jsonb)) AS img
              UNION
              SELECT jsonb_array_elements(coalesce(variant->'images','[]'::jsonb)) AS img
            ) s
          )
        );
        merged := jsonb_set(merged, ARRAY[key], acc);
      ELSE
        -- normalize images to array
        IF variant ? 'images' AND jsonb_typeof(variant->'images') = 'array' THEN
          acc := variant;
        ELSE
          acc := jsonb_set(variant, '{images}', '[]'::jsonb, true);
        END IF;
        merged := jsonb_set(merged, ARRAY[key], acc, true);
        keys_order := array_append(keys_order, key);
      END IF;
    END LOOP;

    result := '[]'::jsonb;
    FOREACH k IN ARRAY keys_order LOOP
      result := result || jsonb_build_array(merged->k);
    END LOOP;

    UPDATE products SET color_variants = result, updated_at = now() WHERE id = rec.id;
  END LOOP;
END $$;