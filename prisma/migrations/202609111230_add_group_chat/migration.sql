-- Group chat: a conversation is either a direct 1:1 (the existing
-- user_low_id/user_high_id canonical pair) or a group (members tracked only
-- through conversation_participants). Both shapes share the same messages
-- and conversation_participants tables.

ALTER TABLE "conversations" ADD COLUMN "is_group" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "conversations" ADD COLUMN "name" VARCHAR(80);
ALTER TABLE "conversations" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "conversations" ALTER COLUMN "user_low_id" DROP NOT NULL;
ALTER TABLE "conversations" ALTER COLUMN "user_high_id" DROP NOT NULL;

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The old unconditional unique index/CHECK assumed every conversation was a
-- direct pair. Replace both with variants that only apply when is_group is
-- false; a group conversation carries null user_low_id/user_high_id instead.
DROP INDEX "conversations_user_low_id_user_high_id_key";
CREATE UNIQUE INDEX "conversations_direct_pair_key" ON "conversations" ("user_low_id", "user_high_id")
  WHERE "is_group" = false;

ALTER TABLE "conversations" DROP CONSTRAINT "conversations_ordered_pair";
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_direct_pair_shape" CHECK (
  ("is_group" = false AND "user_low_id" IS NOT NULL AND "user_high_id" IS NOT NULL AND "user_low_id" < "user_high_id")
  OR
  ("is_group" = true AND "user_low_id" IS NULL AND "user_high_id" IS NULL AND "name" IS NOT NULL)
);

-- The membership trigger only makes sense for direct conversations (exactly
-- the two designated users); a group's membership is whatever the
-- application inserted into conversation_participants, unconstrained here.
CREATE OR REPLACE FUNCTION check_conversation_members() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cid uuid; grp boolean; lo uuid; hi uuid; total integer; valid integer;
BEGIN
  IF TG_TABLE_NAME = 'conversations' THEN
    cid := COALESCE(NEW.id, OLD.id);
  ELSE
    cid := COALESCE(NEW.conversation_id, OLD.conversation_id);
  END IF;
  SELECT is_group, user_low_id, user_high_id INTO grp, lo, hi FROM conversations WHERE id = cid;
  IF NOT FOUND OR grp THEN RETURN NULL; END IF;
  SELECT count(*), count(*) FILTER (WHERE user_id IN (lo, hi)) INTO total, valid
    FROM conversation_participants WHERE conversation_id = cid;
  IF total <> 2 OR valid <> 2 THEN
    RAISE EXCEPTION 'A direct conversation must have its two designated participants' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;
