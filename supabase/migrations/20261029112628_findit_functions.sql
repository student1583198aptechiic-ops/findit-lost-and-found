/*
# FindIt — Server functions

1. New Functions
- create_notification(recipient, type, title, message, related_id, related_type): SECURITY DEFINER, lets an authenticated user write a notification for another user (used by matching/claim events).
- compute_match_score(lost_uuid, found_uuid): SECURITY DEFINER, returns (score 0-100, matched-attributes jsonb) using category (25), title word-overlap (25), color (15), description word-overlap (20), date proximity (10), geo distance (5).
- generate_matches(item_uuid): SECURITY DEFINER, compares a new item against all open opposite-type items, inserts matches with score>=35 (unique constraint de-dupes), and notifies both reporters.
- platform_stats(): public RPC returning total_items, lost_count, found_count, returned_count, user_count.
- admin_stats(): admin-only RPC returning total_users, total_items, pending_claims, lost_count, found_count.

2. Security
- All SECURITY DEFINER functions have search_path set to public and EXECUTE revoked from PUBLIC/anon, granted to authenticated (platform_stats granted to anon+authenticated).
- admin_stats checks profiles.role='admin' for the caller.
*/

CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient uuid, p_type text, p_title text, p_message text,
  p_related_id uuid DEFAULT NULL, p_related_type text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.notifications (recipient_id, type, title, message, related_resource_id, related_resource_type)
  VALUES (p_recipient, p_type, p_title, p_message, p_related_id, p_related_type);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.compute_match_score(p_lost uuid, p_found uuid)
RETURNS TABLE(score integer, attributes jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lost items%ROWTYPE;
  v_found items%ROWTYPE;
  v_attrs jsonb := '[]'::jsonb;
  v_lost_words text[];
  v_found_words text[];
  v_common_count integer;
  v_date_gap integer;
  v_dist numeric;
  v_ratio real;
BEGIN
  SELECT * INTO v_lost FROM items WHERE id = p_lost AND item_type = 'LOST';
  SELECT * INTO v_found FROM items WHERE id = p_found AND item_type = 'FOUND';
  IF v_lost.id IS NULL OR v_found.id IS NULL THEN RETURN; END IF;

  score := 0;

  IF v_lost.category = v_found.category THEN
    score := score + 25;
    v_attrs := v_attrs || jsonb_build_array('category');
  END IF;

  v_lost_words := regexp_split_to_array(lower(v_lost.title), '\s+');
  v_found_words := regexp_split_to_array(lower(v_found.title), '\s+');
  SELECT count(*) INTO v_common_count FROM unnest(v_lost_words) w WHERE w = ANY(v_found_words) AND w <> '';
  IF array_length(v_lost_words, 1) > 0 AND v_common_count > 0 THEN
    v_ratio := v_common_count::real / array_length(v_lost_words, 1)::real;
    score := score + LEAST(25, (v_ratio * 25)::integer);
    v_attrs := v_attrs || jsonb_build_array('title');
  END IF;

  IF v_lost.color <> '' AND lower(v_lost.color) = lower(v_found.color) THEN
    score := score + 15;
    v_attrs := v_attrs || jsonb_build_array('color');
  END IF;

  v_lost_words := regexp_split_to_array(lower(v_lost.description), '\s+');
  v_found_words := regexp_split_to_array(lower(v_found.description), '\s+');
  SELECT count(*) INTO v_common_count FROM unnest(v_lost_words) w WHERE w = ANY(v_found_words) AND length(w) > 3;
  IF array_length(v_lost_words, 1) > 0 AND v_common_count > 0 THEN
    v_ratio := v_common_count::real / array_length(v_lost_words, 1)::real;
    score := score + LEAST(20, (v_ratio * 20)::integer);
    v_attrs := v_attrs || jsonb_build_array('description');
  END IF;

  v_date_gap := ABS(v_lost.date_lost_or_found - v_found.date_lost_or_found);
  IF v_date_gap <= 30 THEN
    score := score + (10 - LEAST(10, v_date_gap));
    v_attrs := v_attrs || jsonb_build_array('date');
  END IF;

  IF v_lost.lat IS NOT NULL AND v_lost.lng IS NOT NULL AND v_found.lat IS NOT NULL AND v_found.lng IS NOT NULL THEN
    v_dist := sqrt(power(v_lost.lat - v_found.lat, 2) + power(v_lost.lng - v_found.lng, 2));
    IF v_dist <= 1.0 THEN
      score := score + (5 - LEAST(5, (v_dist * 5)::integer));
      v_attrs := v_attrs || jsonb_build_array('location');
    END IF;
  END IF;

  score := LEAST(100, score);
  attributes := v_attrs;
  RETURN NEXT;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.compute_match_score(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compute_match_score(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_matches(p_item uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new items%ROWTYPE;
  v_other RECORD;
  v_score integer;
  v_attrs jsonb;
BEGIN
  SELECT * INTO v_new FROM items WHERE id = p_item;
  IF NOT FOUND THEN RETURN; END IF;

  FOR v_other IN SELECT id, reporter_id FROM items
    WHERE id <> p_item AND item_type <> v_new.item_type AND status = 'open'
  LOOP
    SELECT score, attributes FROM public.compute_match_score(
      CASE WHEN v_new.item_type = 'LOST' THEN p_item ELSE v_other.id END,
      CASE WHEN v_new.item_type = 'FOUND' THEN p_item ELSE v_other.id END
    ) INTO v_score, v_attrs;

    IF v_score >= 35 THEN
      BEGIN
        IF v_new.item_type = 'LOST' THEN
          INSERT INTO matches (lost_item_id, found_item_id, score, matching_attributes)
          VALUES (p_item, v_other.id, v_score, v_attrs);
        ELSE
          INSERT INTO matches (lost_item_id, found_item_id, score, matching_attributes)
          VALUES (v_other.id, p_item, v_score, v_attrs);
        END IF;
        PERFORM public.create_notification(v_new.reporter_id, 'match', 'New potential match', 'A possible match was found for your item.', v_other.id, 'item');
        PERFORM public.create_notification(v_other.reporter_id, 'match', 'New potential match', 'A possible match was found for your item.', p_item, 'item');
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
    END IF;
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.generate_matches(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_matches(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.platform_stats()
RETURNS TABLE(total_items bigint, lost_count bigint, found_count bigint, returned_count bigint, user_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY SELECT
    (SELECT count(*) FROM items),
    (SELECT count(*) FROM items WHERE item_type = 'LOST'),
    (SELECT count(*) FROM items WHERE item_type = 'FOUND'),
    (SELECT count(*) FROM items WHERE status = 'returned'),
    (SELECT count(*) FROM profiles WHERE account_status = 'active');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.platform_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_stats() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS TABLE(total_users bigint, total_items bigint, pending_claims bigint, lost_count bigint, found_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  RETURN QUERY SELECT
    (SELECT count(*) FROM profiles),
    (SELECT count(*) FROM items),
    (SELECT count(*) FROM claims WHERE status IN ('pending','under_review')),
    (SELECT count(*) FROM items WHERE item_type = 'LOST'),
    (SELECT count(*) FROM items WHERE item_type = 'FOUND');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
