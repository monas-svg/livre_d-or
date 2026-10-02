-- CreateTable
CREATE TABLE "guest_entries" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "relationship" TEXT NOT NULL DEFAULT 'Collègue',
    "yearsKnown" TEXT,
    "message" TEXT NOT NULL,
    "anecdote" TEXT,
    "wish" TEXT,
    "photoUrl" TEXT,
    "photoCaption" TEXT,
    "photos" JSONB,
    "cardStyle" TEXT NOT NULL DEFAULT 'polaroid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "reactions" JSONB NOT NULL,

    CONSTRAINT "guest_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE UNIQUE INDEX "guest_entries_token_key" ON "guest_entries"("token");

-- CreateIndex
CREATE INDEX "guest_entries_createdAt_idx" ON "guest_entries"("createdAt");
