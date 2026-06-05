/*
  Warnings:

  - You are about to drop the column `testimonials` on the `testimonialspage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `testimonialspage` DROP COLUMN `testimonials`;

-- CreateTable
CREATE TABLE `Testimonial` (
    `id` VARCHAR(191) NOT NULL,
    `videoLink` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NOT NULL,
    `clientSince` VARCHAR(191) NOT NULL,
    `homePageId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Testimonial_homePageId_idx`(`homePageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Testimonial` ADD CONSTRAINT `Testimonial_homePageId_fkey` FOREIGN KEY (`homePageId`) REFERENCES `HomePage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
