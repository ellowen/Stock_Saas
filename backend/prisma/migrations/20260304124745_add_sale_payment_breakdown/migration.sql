-- AlterTable
ALTER TABLE `sales` ADD COLUMN `payment_card_amount` DECIMAL(10, 2) NULL,
    ADD COLUMN `payment_cash_amount` DECIMAL(10, 2) NULL;
