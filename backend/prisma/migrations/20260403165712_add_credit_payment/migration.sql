-- AlterTable
ALTER TABLE `ar_payments` MODIFY `method` ENUM('CASH', 'CARD', 'MIXED', 'OTHER', 'CREDIT') NOT NULL;

-- AlterTable
ALTER TABLE `sales` MODIFY `payment_method` ENUM('CASH', 'CARD', 'MIXED', 'OTHER', 'CREDIT') NOT NULL;
