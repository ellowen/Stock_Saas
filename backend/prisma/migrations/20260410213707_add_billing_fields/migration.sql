-- AlterTable
ALTER TABLE `companies` ADD COLUMN `current_period_end` DATETIME(3) NULL,
    ADD COLUMN `mp_subscription_id` VARCHAR(191) NULL,
    ADD COLUMN `stripe_subscription_id` VARCHAR(191) NULL;
