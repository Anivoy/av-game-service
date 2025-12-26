/*
  Warnings:

  - You are about to drop the `SceneQueryConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "game"."SceneQueryConfig" DROP CONSTRAINT "SceneQueryConfig_gameModeId_fkey";

-- DropTable
DROP TABLE "game"."SceneQueryConfig";

-- CreateTable
CREATE TABLE "scene_query_configs" (
    "id" TEXT NOT NULL,
    "gameModeId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 5,
    "showId" TEXT,
    "regionId" TEXT,
    "prefectureId" TEXT,
    "cityId" TEXT,
    "difficultyWeights" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scene_query_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scene_query_configs_gameModeId_key" ON "scene_query_configs"("gameModeId");

-- AddForeignKey
ALTER TABLE "scene_query_configs" ADD CONSTRAINT "scene_query_configs_gameModeId_fkey" FOREIGN KEY ("gameModeId") REFERENCES "game_modes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
