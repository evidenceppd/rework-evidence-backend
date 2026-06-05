-- CreateTable: DiagnosticForm
CREATE TABLE `DiagnosticForm` (
  `id`          VARCHAR(191) NOT NULL,
  `slug`        VARCHAR(191) NOT NULL,
  `title`       VARCHAR(191) NOT NULL,
  `description` TEXT         NULL,
  `sections`    JSON         NOT NULL,
  `isActive`    BOOLEAN      NOT NULL DEFAULT true,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,

  UNIQUE INDEX `DiagnosticForm_slug_key`(`slug`),
  INDEX `DiagnosticForm_slug_idx`(`slug`),
  INDEX `DiagnosticForm_isActive_idx`(`isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: Lead — add formId FK
ALTER TABLE `Lead`
  ADD COLUMN `formId` VARCHAR(191) NULL;

CREATE INDEX `Lead_formId_idx` ON `Lead`(`formId`);

ALTER TABLE `Lead`
  ADD CONSTRAINT `Lead_formId_fkey`
  FOREIGN KEY (`formId`) REFERENCES `DiagnosticForm`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
