-- AlterTable
ALTER TABLE `order` ADD COLUMN `cardBrand` VARCHAR(191) NULL,
    ADD COLUMN `cardLast4` VARCHAR(191) NULL,
    ADD COLUMN `customerEmail` VARCHAR(191) NULL,
    ADD COLUMN `customerName` VARCHAR(191) NULL,
    ADD COLUMN `paidAt` DATETIME(3) NULL,
    ADD COLUMN `shippingAddress` VARCHAR(191) NULL,
    ADD COLUMN `shippingCity` VARCHAR(191) NULL;
