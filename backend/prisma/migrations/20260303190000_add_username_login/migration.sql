-- Add username nullable first
ALTER TABLE `users` ADD COLUMN `username` VARCHAR(191) NULL;

-- Backfill: demo user gets 'owner', others get email_prefix_id for uniqueness
UPDATE `users` SET `username` = CASE WHEN `email` = 'owner@example.com' THEN 'owner' ELSE CONCAT(COALESCE(SUBSTRING_INDEX(`email`, '@', 1), 'user'), '_', `id`) END WHERE `username` IS NULL;

-- Make username NOT NULL and add unique
ALTER TABLE `users` MODIFY COLUMN `username` VARCHAR(191) NOT NULL;
ALTER TABLE `users` ADD UNIQUE INDEX `users_username_key`(`username`);

-- Drop old email unique and make email nullable
ALTER TABLE `users` DROP INDEX `users_email_key`;
ALTER TABLE `users` MODIFY COLUMN `email` VARCHAR(191) NULL;
