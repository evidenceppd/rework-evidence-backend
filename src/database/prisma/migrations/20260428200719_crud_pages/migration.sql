-- CreateTable
CREATE TABLE `HomePage` (
    `id` VARCHAR(191) NOT NULL,
    `bannerHome` JSON NOT NULL,
    `scenario` JSON NOT NULL,
    `bottlenecks` JSON NOT NULL,
    `performance` JSON NOT NULL,
    `howWeWork` JSON NOT NULL,
    `blogSectionTitle` VARCHAR(191) NOT NULL,
    `cardFooter` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TestimonialsPage` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` VARCHAR(191) NOT NULL,
    `homePageId` VARCHAR(191) NOT NULL,
    `informative` JSON NOT NULL,
    `testimonials` JSON NULL,
    `cardFooter` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TestimonialsPage_homePageId_key`(`homePageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HowWeWorkPage` (
    `id` VARCHAR(191) NOT NULL,
    `aboutUs` JSON NOT NULL,
    `howWeWork` JSON NOT NULL,
    `oursValues` JSON NOT NULL,
    `cardFooter` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServicesPage` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` VARCHAR(191) NOT NULL,
    `explanation` TEXT NOT NULL,
    `businessAccelerator` JSON NOT NULL,
    `results` JSON NOT NULL,
    `cardFooter` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceCard` (
    `id` VARCHAR(191) NOT NULL,
    `cardIcon` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `topics` JSON NOT NULL,
    `servicesPageId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceCard_servicesPageId_idx`(`servicesPageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientsPage` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` VARCHAR(191) NOT NULL,
    `homePageId` VARCHAR(191) NOT NULL,
    `cardsClients` JSON NOT NULL,
    `cardFooter` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ClientsPage_homePageId_key`(`homePageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Company` (
    `id` VARCHAR(191) NOT NULL,
    `segment` VARCHAR(191) NOT NULL,
    `clientImage` VARCHAR(191) NOT NULL,
    `clientDescription` TEXT NOT NULL,
    `clientSince` DATE NOT NULL,
    `clientsPageId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Company_clientsPageId_idx`(`clientsPageId`),
    INDEX `Company_segment_idx`(`segment`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlogPage` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` VARCHAR(191) NOT NULL,
    `homePageId` VARCHAR(191) NOT NULL,
    `cardFooter` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BlogPage_homePageId_key`(`homePageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlogPost` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `segment` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `blogImage` VARCHAR(191) NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `blogPageId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BlogPost_slug_key`(`slug`),
    INDEX `BlogPost_slug_idx`(`slug`),
    INDEX `BlogPost_segment_idx`(`segment`),
    INDEX `BlogPost_blogPageId_idx`(`blogPageId`),
    INDEX `BlogPost_views_idx`(`views`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteConfig` (
    `id` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `cnpj` VARCHAR(191) NOT NULL,
    `socialMedia` JSON NOT NULL,
    `contactUs` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TestimonialsPage` ADD CONSTRAINT `TestimonialsPage_homePageId_fkey` FOREIGN KEY (`homePageId`) REFERENCES `HomePage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceCard` ADD CONSTRAINT `ServiceCard_servicesPageId_fkey` FOREIGN KEY (`servicesPageId`) REFERENCES `ServicesPage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientsPage` ADD CONSTRAINT `ClientsPage_homePageId_fkey` FOREIGN KEY (`homePageId`) REFERENCES `HomePage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Company` ADD CONSTRAINT `Company_clientsPageId_fkey` FOREIGN KEY (`clientsPageId`) REFERENCES `ClientsPage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlogPage` ADD CONSTRAINT `BlogPage_homePageId_fkey` FOREIGN KEY (`homePageId`) REFERENCES `HomePage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlogPost` ADD CONSTRAINT `BlogPost_blogPageId_fkey` FOREIGN KEY (`blogPageId`) REFERENCES `BlogPage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
