CREATE TABLE `novel_promotion_chapter_batches` (
  `id` VARCHAR(191) NOT NULL,
  `novelPromotionProjectId` VARCHAR(191) NOT NULL,
  `title` TEXT NOT NULL,
  `sourceText` LONGTEXT NOT NULL,
  `sourceFingerprint` VARCHAR(64) NOT NULL,
  `chapterStartLabel` TEXT NULL,
  `chapterEndLabel` TEXT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
  `analysisJson` LONGTEXT NULL,
  `candidateEpisodesJson` LONGTEXT NULL,
  `selectedPlanJson` LONGTEXT NULL,
  `createdEpisodeIdsJson` TEXT NULL,
  `errorJson` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `novel_promotion_chapter_batches_novelPromotionProjectId_idx`(`novelPromotionProjectId`),
  INDEX `novel_promotion_chapter_batches_sourceFingerprint_idx`(`sourceFingerprint`),
  INDEX `novel_promotion_chapter_batches_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `novel_promotion_chapter_batches`
  ADD CONSTRAINT `novel_promotion_chapter_batches_novelPromotionProjectId_fkey`
  FOREIGN KEY (`novelPromotionProjectId`) REFERENCES `novel_promotion_projects`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
