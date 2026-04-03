-- AlterTable
ALTER TABLE `sale_items` ADD COLUMN `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `sales` ADD COLUMN `discount_total` DECIMAL(10, 2) NOT NULL DEFAULT 0;
