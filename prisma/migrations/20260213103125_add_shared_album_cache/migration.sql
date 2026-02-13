-- CreateTable
CREATE TABLE "SharedAlbumCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "albumKey" TEXT NOT NULL,
    "artistKey" TEXT NOT NULL,
    "yearKey" TEXT,
    "albumName" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "coverUrl" TEXT,
    "genres" TEXT,
    "coverSource" TEXT,
    "genreSource" TEXT,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "lastHitAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SharedAlbumCache_albumKey_artistKey_idx" ON "SharedAlbumCache"("albumKey", "artistKey");

-- CreateIndex
CREATE INDEX "SharedAlbumCache_hitCount_idx" ON "SharedAlbumCache"("hitCount");

-- CreateIndex
CREATE INDEX "SharedAlbumCache_lastHitAt_idx" ON "SharedAlbumCache"("lastHitAt");

-- CreateIndex
CREATE UNIQUE INDEX "SharedAlbumCache_albumKey_artistKey_yearKey_key" ON "SharedAlbumCache"("albumKey", "artistKey", "yearKey");
