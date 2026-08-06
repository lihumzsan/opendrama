CREATE TABLE `novel_promotion_screenplays` (
  `id` VARCHAR(191) NOT NULL,
  `episodeId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `sourceFingerprint` VARCHAR(64) NOT NULL,
  `rawJson` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `novel_promotion_screenplays_episodeId_key`(`episodeId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `novel_promotion_screenplay_scenes` (
  `id` VARCHAR(191) NOT NULL,
  `screenplayId` VARCHAR(191) NOT NULL,
  `sceneNumber` INTEGER NOT NULL,
  `sourceStart` INTEGER NOT NULL,
  `sourceEnd` INTEGER NOT NULL,
  `sourceText` TEXT NOT NULL,
  `heading` TEXT NOT NULL,
  `entryState` TEXT NOT NULL,
  `goal` TEXT NOT NULL,
  `conflict` TEXT NOT NULL,
  `outcome` TEXT NOT NULL,
  `exitState` TEXT NOT NULL,
  `content` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `novel_promotion_screenplay_scenes_screenplayId_sceneNumber_key`(`screenplayId`, `sceneNumber`),
  INDEX `novel_promotion_screenplay_scenes_screenplayId_idx`(`screenplayId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `novel_promotion_screenplays`
  ADD CONSTRAINT `novel_promotion_screenplays_episodeId_fkey`
  FOREIGN KEY (`episodeId`) REFERENCES `novel_promotion_episodes`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `novel_promotion_screenplay_scenes`
  ADD CONSTRAINT `novel_promotion_screenplay_scenes_screenplayId_fkey`
  FOREIGN KEY (`screenplayId`) REFERENCES `novel_promotion_screenplays`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
