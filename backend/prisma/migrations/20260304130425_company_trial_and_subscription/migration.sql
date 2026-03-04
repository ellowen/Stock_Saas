-- AlterTable
ALTER TABLE `companies` ADD COLUMN `stripe_customer_id` VARCHAR(191) NULL,
    ADD COLUMN `subscription_status` VARCHAR(191) NULL,
    ADD COLUMN `trial_ends_at` DATETIME(3) NULL;
