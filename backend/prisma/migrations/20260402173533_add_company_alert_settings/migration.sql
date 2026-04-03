-- AlterTable
ALTER TABLE `companies` ADD COLUMN `low_stock_alerts` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `sales_report_freq` VARCHAR(191) NULL DEFAULT 'NONE';
