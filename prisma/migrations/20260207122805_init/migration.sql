-- CreateTable
CREATE TABLE "Album" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "releaseDate" TEXT,
    "genre" TEXT,
    "length" TEXT,
    "label" TEXT,
    "tag" TEXT,
    "comment" TEXT,
    "coverUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Album_genre_idx" ON "Album"("genre");

-- CreateIndex
CREATE UNIQUE INDEX "Album_artist_title_key" ON "Album"("artist", "title");
