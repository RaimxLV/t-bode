DO $$
DECLARE
  rec RECORD;
  variant jsonb;
  v_canonical_hex TEXT;
  v_name_key TEXT;
  v_display_name TEXT;
BEGIN
  CREATE TEMP TABLE canonical_colors AS
  WITH all_colors AS (
    SELECT lower(trim(v->>'name')) AS nk,
           v->>'hex' AS hx,
           v->>'name' AS dn
    FROM products p, jsonb_array_elements(p.color_variants) v
    WHERE coalesce(trim(v->>'name'),'') <> ''
  ),
  hex_counts AS (
    SELECT nk, hx, count(*) AS cnt,
           ROW_NUMBER() OVER (PARTITION BY nk ORDER BY count(*) DESC, hx) AS rn
    FROM all_colors
    GROUP BY nk, hx
  ),
  name_display AS (
    SELECT DISTINCT ON (nk) nk, dn
    FROM all_colors
    ORDER BY nk, dn
  )
  SELECT h.nk AS name_key, h.hx AS canonical_hex, n.dn AS display_name
  FROM hex_counts h
  JOIN name_display n USING (nk)
  WHERE h.rn = 1;

  FOR rec IN SELECT id, color_variants FROM products WHERE jsonb_array_length(color_variants) > 0 LOOP
    DECLARE
      merged jsonb := '{}'::jsonb;
      keys_order TEXT[] := ARRAY[]::TEXT[];
      acc jsonb;
      k TEXT;
      result jsonb := '[]'::jsonb;
    BEGIN
      FOR variant IN SELECT * FROM jsonb_array_elements(rec.color_variants) LOOP
        v_name_key := lower(trim(coalesce(variant->>'name','')));
        IF v_name_key = '' THEN CONTINUE; END IF;

        SELECT cc.canonical_hex, cc.display_name INTO v_canonical_hex, v_display_name
        FROM canonical_colors cc WHERE cc.name_key = v_name_key;

        variant := jsonb_set(variant, '{hex}', to_jsonb(v_canonical_hex));
        variant := jsonb_set(variant, '{name}', to_jsonb(v_display_name));

        IF NOT (variant ? 'images') OR jsonb_typeof(variant->'images') <> 'array' THEN
          variant := jsonb_set(variant, '{images}', '[]'::jsonb, true);
        END IF;

        IF merged ? v_name_key THEN
          acc := merged->v_name_key;
          acc := jsonb_set(
            acc, '{images}',
            (SELECT jsonb_agg(DISTINCT img) FROM (
              SELECT jsonb_array_elements(coalesce(acc->'images','[]'::jsonb)) AS img
              UNION
              SELECT jsonb_array_elements(coalesce(variant->'images','[]'::jsonb)) AS img
            ) s)
          );
          merged := jsonb_set(merged, ARRAY[v_name_key], acc);
        ELSE
          merged := jsonb_set(merged, ARRAY[v_name_key], variant, true);
          keys_order := array_append(keys_order, v_name_key);
        END IF;
      END LOOP;

      FOREACH k IN ARRAY keys_order LOOP
        result := result || jsonb_build_array(merged->k);
      END LOOP;

      UPDATE products SET color_variants = result, updated_at = now() WHERE id = rec.id;
    END;
  END LOOP;

  DROP TABLE canonical_colors;
END $$;