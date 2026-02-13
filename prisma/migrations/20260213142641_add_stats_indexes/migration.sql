-- CreateIndex
CREATE INDEX "Album_userId_idx" ON "Album"("userId");

-- CreateIndex
CREATE INDEX "Album_userId_createdAt_idx" ON "Album"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Track_userId_idx" ON "Track"("userId");

-- CreateIndex
CREATE INDEX "Track_userId_createdAt_idx" ON "Track"("userId", "createdAt");
