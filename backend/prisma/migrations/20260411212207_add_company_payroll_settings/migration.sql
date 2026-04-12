-- AlterTable
ALTER TABLE `companies` ADD COLUMN `accounting_enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `art_rate` DOUBLE NOT NULL DEFAULT 0.025,
    ADD COLUMN `union_rate` DOUBLE NOT NULL DEFAULT 0.02;
