ALTER TABLE "guest_entries"
  ALTER COLUMN "firstName" TYPE VARCHAR(100),
  ALTER COLUMN "lastName" TYPE VARCHAR(100),
  ALTER COLUMN "email" TYPE VARCHAR(320),
  ALTER COLUMN "relationship" TYPE VARCHAR(120),
  ALTER COLUMN "yearsKnown" TYPE VARCHAR(80),
  ALTER COLUMN "message" TYPE TEXT,
  ALTER COLUMN "anecdote" TYPE TEXT,
  ALTER COLUMN "wish" TYPE TEXT,
  ALTER COLUMN "photoUrl" TYPE TEXT,
  ALTER COLUMN "photoCaption" TYPE TEXT,
  ALTER COLUMN "cardStyle" TYPE VARCHAR(60),
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6);

CREATE INDEX "guest_entries_created_at_idx"
  ON "guest_entries"("createdAt");

CREATE INDEX "guest_entries_is_approved_created_at_idx"
  ON "guest_entries"("isApproved", "createdAt");

CREATE INDEX "guest_entries_is_pinned_created_at_idx"
  ON "guest_entries"("isPinned", "createdAt");

CREATE INDEX "guest_entries_relationship_idx"
  ON "guest_entries"("relationship");

CREATE INDEX "guest_entries_updated_at_idx"
  ON "guest_entries"("updatedAt");
