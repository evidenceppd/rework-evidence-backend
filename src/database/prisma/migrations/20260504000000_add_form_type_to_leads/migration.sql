-- AlterTable
ALTER TABLE `Lead` ADD COLUMN `formType` VARCHAR(191) NOT NULL DEFAULT 'unknown';

-- CreateIndex
CREATE INDEX `Lead_formType_idx` ON `Lead`(`formType`);
