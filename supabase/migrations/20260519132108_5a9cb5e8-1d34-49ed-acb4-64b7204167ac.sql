
CREATE OR REPLACE FUNCTION public.validate_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_lc text;
  email_domain text;
  recent_count integer;
  blocked_domains text[] := ARRAY[
    'test.com','example.com','example.org','ddd.com','aaa.com','bbb.com','ccc.com',
    'asd.com','qwe.com','fff.com','eee.com','ggg.com','hhh.com','iii.com','jjj.com',
    'kkk.com','lll.com','mmm.com','nnn.com','ooo.com','ppp.com','rrr.com','sss.com',
    'ttt.com','uuu.com','vvv.com','www.com','xxx.com','yyy.com','zzz.com',
    'mailinator.com','guerrillamail.com','tempmail.com','temp-mail.org','10minutemail.com',
    'yopmail.com','trashmail.com','sharklasers.com','throwaway.email','fake.com',
    'fakeinbox.com','dispostable.com','getnada.com','mintemail.com','maildrop.cc'
  ];
BEGIN
  email_lc := lower(coalesce(NEW.guest_email, ''));
  IF email_lc = '' THEN
    RETURN NEW;
  END IF;

  IF position('@' IN email_lc) = 0 THEN
    RAISE EXCEPTION 'Nederīga e-pasta adrese';
  END IF;
  email_domain := split_part(email_lc, '@', 2);

  IF email_domain = ANY(blocked_domains) THEN
    RAISE EXCEPTION 'Lūdzu izmantojiet īstu e-pasta adresi (% nav atļauts)', email_domain;
  END IF;

  -- Block obvious patterns: 3+ identical letters in domain prefix (aaa, bbb, fff…)
  IF email_domain ~ '^([a-z])\1{2,}\.' THEN
    RAISE EXCEPTION 'Lūdzu izmantojiet īstu e-pasta adresi';
  END IF;

  -- Rate limit: max 3 orders per hour per email
  SELECT count(*) INTO recent_count
  FROM public.orders
  WHERE lower(guest_email) = email_lc
    AND created_at > (now() - interval '1 hour');

  IF recent_count >= 3 THEN
    RAISE EXCEPTION 'Pārāk daudz pasūtījumu īsā laikā. Lūdzu mēģiniet vēlāk.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_new_order_trigger ON public.orders;
CREATE TRIGGER validate_new_order_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_new_order();
