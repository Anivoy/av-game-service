-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "game_modes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "playTimeEstimateMinutes" INTEGER,
    "rewardMultiplier" DOUBLE PRECISION,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_modes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_rounds" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "sceneId" TEXT NOT NULL,
    "guessLat" DOUBLE PRECISION NOT NULL,
    "guessLng" DOUBLE PRECISION NOT NULL,
    "actualLat" DOUBLE PRECISION NOT NULL,
    "actualLng" DOUBLE PRECISION NOT NULL,
    "actualLocation" TEXT NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "score" INTEGER NOT NULL,
    "timeSpent" INTEGER NOT NULL,
    "guessedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameModeId" TEXT NOT NULL,
    "totalRounds" INTEGER NOT NULL DEFAULT 5,
    "status" "SessionStatus" NOT NULL DEFAULT 'COMPLETED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalDuration" INTEGER,
    "finalScore" INTEGER NOT NULL,
    "averageDistance" DOUBLE PRECISION NOT NULL,
    "perfectRounds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneQueryConfig" (
    "id" TEXT NOT NULL,
    "gameModeId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "showIds" TEXT[],
    "difficultyIds" TEXT[],
    "regionIds" TEXT[],
    "prefectureIds" TEXT[],
    "cityIds" TEXT[],

    CONSTRAINT "SceneQueryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_rounds_sessionId_roundNumber_idx" ON "game_rounds"("sessionId", "roundNumber");

-- CreateIndex
CREATE INDEX "game_rounds_sceneId_idx" ON "game_rounds"("sceneId");

-- CreateIndex
CREATE INDEX "game_sessions_userId_idx" ON "game_sessions"("userId");

-- CreateIndex
CREATE INDEX "game_sessions_userId_completedAt_idx" ON "game_sessions"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "game_sessions_finalScore_idx" ON "game_sessions"("finalScore");

-- CreateIndex
CREATE INDEX "game_sessions_createdAt_idx" ON "game_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "game_sessions_gameModeId_idx" ON "game_sessions"("gameModeId");

-- CreateIndex
CREATE UNIQUE INDEX "SceneQueryConfig_gameModeId_key" ON "SceneQueryConfig"("gameModeId");

-- AddForeignKey
ALTER TABLE "game_rounds" ADD CONSTRAINT "game_rounds_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_gameModeId_fkey" FOREIGN KEY ("gameModeId") REFERENCES "game_modes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneQueryConfig" ADD CONSTRAINT "SceneQueryConfig_gameModeId_fkey" FOREIGN KEY ("gameModeId") REFERENCES "game_modes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
