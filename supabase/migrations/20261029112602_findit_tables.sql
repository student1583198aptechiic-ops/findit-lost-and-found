/*
# FindIt — Tables, Policies, Triggers

1. New Tables
- profiles: id (uuid PK -> auth.users), full_name, avatar_url, role (user/admin), account_status (active/suspended), bio, timestamps
- items: title, description, category, color, identifying_characteristics, item_type (LOST/FOUND), status, images[], approximate_location, lat/lng, date_lost_or_found, reward, reporter_id (defaults auth.uid()), contact_preference, timestamps
- matches: lost_item_id, found_item_id, score 0-100, matching_attributes jsonb, unique pair
- claims: item_id, claimant_id, private_description, status, reviewed_by, review_notes, timestamps
- conversations: participant_a, participant_b, related_item_id, related_claim_id, last_message_at, unique pair
- messages: conversation_id, sender_id, content, read_at, created_at
- notifications: recipient_id, type, title, message, related_resource_id, related_resource_type, read_at, created_at

2. Security
- RLS on every table. Items + matches + public_profiles view are publicly readable (anon+authenticated). Everything else authenticated-scoped by ownership/membership.
- Admin (role='admin' in profiles) gets override SELECT/UPDATE/DELETE policies on profiles, items, claims, conversations.

3. Notes
- reporter_id and claimant_id default to auth.uid() so client inserts succeed.
- handle_new_user trigger auto-creates a profile on signup.
- public_profiles view exposes only id, full_name, avatar_url.
*/

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','suspended')),
  bio text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_self" ON profiles;
CREATE POLICY "profiles_select_self" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;
CREATE POLICY "profiles_admin_select" ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE OR REPLACE VIEW public_profiles AS SELECT id, full_name, avatar_url FROM profiles;
ALTER VIEW public_profiles OWNER TO postgres;
GRANT SELECT ON public_profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;

-- ---------- items ----------
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL CHECK (category IN ('Electronics','Wallets','Keys','Bags','Documents','Jewelry','Clothing','Pets','Other')),
  color text DEFAULT '',
  identifying_characteristics text DEFAULT '',
  item_type text NOT NULL CHECK (item_type IN ('LOST','FOUND')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','claimed','returned','closed')),
  images text[] NOT NULL DEFAULT '{}',
  approximate_location text DEFAULT '',
  lat numeric(9,6),
  lng numeric(9,6),
  date_lost_or_found date NOT NULL,
  reward text DEFAULT '',
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_preference text NOT NULL DEFAULT 'message' CHECK (contact_preference IN ('message','email')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS items_item_type_idx ON items(item_type);
CREATE INDEX IF NOT EXISTS items_category_idx ON items(category);
CREATE INDEX IF NOT EXISTS items_status_idx ON items(status);
CREATE INDEX IF NOT EXISTS items_created_at_idx ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS items_reporter_id_idx ON items(reporter_id);
GRANT SELECT ON items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON items TO authenticated;

DROP POLICY IF EXISTS "items_public_select" ON items;
CREATE POLICY "items_public_select" ON items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "items_insert_own" ON items;
CREATE POLICY "items_insert_own" ON items FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "items_update_own" ON items;
CREATE POLICY "items_update_own" ON items FOR UPDATE TO authenticated
  USING (auth.uid() = reporter_id) WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "items_delete_own" ON items;
CREATE POLICY "items_delete_own" ON items FOR DELETE TO authenticated USING (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "items_admin_update" ON items;
CREATE POLICY "items_admin_update" ON items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "items_admin_delete" ON items;
CREATE POLICY "items_admin_delete" ON items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ---------- matches ----------
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lost_item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  found_item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  matching_attributes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lost_item_id, found_item_id)
);
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS matches_lost_item_id_idx ON matches(lost_item_id);
CREATE INDEX IF NOT EXISTS matches_found_item_id_idx ON matches(found_item_id);
GRANT SELECT ON matches TO anon, authenticated;
DROP POLICY IF EXISTS "matches_public_select" ON matches;
CREATE POLICY "matches_public_select" ON matches FOR SELECT TO anon, authenticated USING (true);

-- ---------- claims ----------
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  claimant_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  private_description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','under_review','approved','rejected','completed')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS claims_item_id_idx ON claims(item_id);
CREATE INDEX IF NOT EXISTS claims_claimant_id_idx ON claims(claimant_id);
CREATE INDEX IF NOT EXISTS claims_status_idx ON claims(status);
GRANT SELECT, INSERT ON claims TO authenticated;
GRANT UPDATE ON claims TO authenticated;

DROP POLICY IF EXISTS "claims_select_involved" ON claims;
CREATE POLICY "claims_select_involved" ON claims FOR SELECT TO authenticated USING (
  auth.uid() = claimant_id
  OR auth.uid() = (SELECT items.reporter_id FROM items WHERE items.id = claims.item_id)
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS "claims_insert_own" ON claims;
CREATE POLICY "claims_insert_own" ON claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = claimant_id);
DROP POLICY IF EXISTS "claims_update_status" ON claims;
CREATE POLICY "claims_update_status" ON claims FOR UPDATE TO authenticated
  USING (auth.uid() = (SELECT items.reporter_id FROM items WHERE items.id = claims.item_id)
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (auth.uid() = (SELECT items.reporter_id FROM items WHERE items.id = claims.item_id)
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "claims_admin_select" ON claims;
CREATE POLICY "claims_admin_select" ON claims FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ---------- conversations ----------
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  related_item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  related_claim_id uuid REFERENCES claims(id) ON DELETE SET NULL,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_a, participant_b, related_item_id)
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS conversations_participant_a_idx ON conversations(participant_a);
CREATE INDEX IF NOT EXISTS conversations_participant_b_idx ON conversations(participant_b);
CREATE INDEX IF NOT EXISTS conversations_related_item_id_idx ON conversations(related_item_id);
GRANT SELECT, INSERT, UPDATE ON conversations TO authenticated;

DROP POLICY IF EXISTS "conversations_select_participant" ON conversations;
CREATE POLICY "conversations_select_participant" ON conversations FOR SELECT TO authenticated
  USING (auth.uid() = participant_a OR auth.uid() = participant_b);
DROP POLICY IF EXISTS "conversations_insert_participant" ON conversations;
CREATE POLICY "conversations_insert_participant" ON conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);
DROP POLICY IF EXISTS "conversations_update_participant" ON conversations;
CREATE POLICY "conversations_update_participant" ON conversations FOR UPDATE TO authenticated
  USING (auth.uid() = participant_a OR auth.uid() = participant_b)
  WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);
DROP POLICY IF EXISTS "conversations_admin_select" ON conversations;
CREATE POLICY "conversations_admin_select" ON conversations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ---------- messages ----------
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);
GRANT SELECT, INSERT ON messages TO authenticated;
GRANT UPDATE ON messages TO authenticated;

DROP POLICY IF EXISTS "messages_select_participant" ON messages;
CREATE POLICY "messages_select_participant" ON messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id
    AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())));
DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id
    AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())));
DROP POLICY IF EXISTS "messages_update_read" ON messages;
CREATE POLICY "messages_update_read" ON messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id
    AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id
    AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())));

-- ---------- notifications ----------
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  related_resource_id uuid,
  related_resource_type text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS notifications_recipient_id_idx ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

-- ---------- updated_at triggers ----------
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS items_set_updated_at ON items;
CREATE TRIGGER items_set_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS claims_set_updated_at ON claims;
CREATE TRIGGER claims_set_updated_at BEFORE UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
