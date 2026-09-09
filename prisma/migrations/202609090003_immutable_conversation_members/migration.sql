-- Moving a participant could leave the old conversation incomplete. Membership
-- identities are immutable; changes require delete/insert and deferred checks.
CREATE FUNCTION prevent_conversation_identity_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'conversations' THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_low_id IS DISTINCT FROM OLD.user_low_id
      OR NEW.user_high_id IS DISTINCT FROM OLD.user_high_id THEN
      RAISE EXCEPTION 'Conversation identities are immutable' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Participant identities are immutable' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER conversation_identity_immutable BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION prevent_conversation_identity_change();
CREATE TRIGGER participant_identity_immutable BEFORE UPDATE ON conversation_participants
  FOR EACH ROW EXECUTE FUNCTION prevent_conversation_identity_change();
