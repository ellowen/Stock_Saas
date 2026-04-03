-- AlterTable
ALTER TABLE `companies` ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `currency` VARCHAR(191) NULL DEFAULT 'ARS',
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `industry_type` VARCHAR(191) NULL DEFAULT 'GENERIC',
    ADD COLUMN `logo_url` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `product_variants` MODIFY `size` VARCHAR(191) NULL,
    MODIFY `color` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `attributes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('TEXT', 'NUMBER', 'SELECT') NOT NULL DEFAULT 'TEXT',
    `options` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `attributes_company_id_name_key`(`company_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_variant_attributes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `variant_id` INTEGER NOT NULL,
    `attribute_id` INTEGER NOT NULL,
    `value` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `product_variant_attributes_variant_id_attribute_id_key`(`variant_id`, `attribute_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attributes` ADD CONSTRAINT `attributes_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variant_attributes` ADD CONSTRAINT `product_variant_attributes_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variant_attributes` ADD CONSTRAINT `product_variant_attributes_attribute_id_fkey` FOREIGN KEY (`attribute_id`) REFERENCES `attributes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
