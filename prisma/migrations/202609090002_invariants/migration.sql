-- Database invariants beyond Prisma's declarative relations.
ALTER TABLE users ADD CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email)));
ALTER TABLE profiles ADD CONSTRAINT profiles_username_format CHECK (username ~ '^[a-z][a-z0-9_]{2,23}$');
ALTER TABLE friendships ADD CONSTRAINT friendships_ordered_pair CHECK (user_low_id < user_high_id);
ALTER TABLE friend_requests ADD CONSTRAINT requests_not_self CHECK (sender_id <> recipient_id);
CREATE UNIQUE INDEX requests_pending_pair ON friend_requests
  (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id)) WHERE status = 'PENDING';
ALTER TABLE blocks ADD CONSTRAINT blocks_not_self CHECK (blocker_id <> blocked_id);
ALTER TABLE conversations ADD CONSTRAINT conversations_ordered_pair CHECK (user_low_id < user_high_id);
ALTER TABLE media_assets ADD CONSTRAINT media_valid_dimensions CHECK (size > 0 AND width > 0 AND height > 0);
ALTER TABLE post_images ADD CONSTRAINT image_position_positive CHECK (position >= 0);
ALTER TABLE comments ADD CONSTRAINT comment_not_empty CHECK (length(btrim(body)) > 0);
ALTER TABLE messages ADD CONSTRAINT message_not_empty CHECK (length(btrim(body)) > 0);
CREATE INDEX notifications_unread ON notifications (recipient_id, created_at DESC, id DESC) WHERE read_at IS NULL;

-- Exactly two participants, both matching the canonical conversation pair.
-- Deferred so the conversation and both participants can be inserted atomically.
CREATE FUNCTION check_conversation_members() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cid uuid; lo uuid; hi uuid; total integer; valid integer;
BEGIN
  IF TG_TABLE_NAME = 'conversations' THEN
    cid := COALESCE(NEW.id, OLD.id);
  ELSE
    cid := COALESCE(NEW.conversation_id, OLD.conversation_id);
  END IF;
  SELECT user_low_id, user_high_id INTO lo, hi FROM conversations WHERE id = cid;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT count(*), count(*) FILTER (WHERE user_id IN (lo, hi)) INTO total, valid
    FROM conversation_participants WHERE conversation_id = cid;
  IF total <> 2 OR valid <> 2 THEN
    RAISE EXCEPTION 'A direct conversation must have its two designated participants' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER conversation_members_valid AFTER INSERT OR UPDATE ON conversations
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_conversation_members();
CREATE CONSTRAINT TRIGGER participant_members_valid AFTER INSERT OR UPDATE OR DELETE ON conversation_participants
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_conversation_members();

-- Read cursors must refer to a message in the same conversation.
ALTER TABLE conversation_participants ADD CONSTRAINT participant_read_message_same_conversation
  FOREIGN KEY (conversation_id, last_read_message_id) REFERENCES messages(conversation_id, id)
  ON DELETE SET NULL (last_read_message_id) DEFERRABLE INITIALLY DEFERRED;
