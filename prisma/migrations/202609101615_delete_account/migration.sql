-- Adds the DELETED status for self-service account deletion. Existing
-- ACTIVE/SUSPENDED checks throughout the app already treat any non-ACTIVE
-- status as logged-out/hidden, so no other code path needs to change.
ALTER TYPE "UserStatus" ADD VALUE 'DELETED';
