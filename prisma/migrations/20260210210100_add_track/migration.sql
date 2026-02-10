-- CreateTable
CREATE TABLE "Track" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "releaseDate" TEXT,
    "genre" TEXT,
    "length" TEXT,
    "label" TEXT,
    "tag" TEXT,
    "comment" TEXT,
    "coverUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Track_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Track_userId_genre_idx" ON "Track"("userId", "genre");

-- CreateIndex
CREATE UNIQUE INDEX "Track_userId_artist_albumName_title_key" ON "Track"("userId", "artist", "albumName", "title");
