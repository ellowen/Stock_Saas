-- AlterTable
ALTER TABLE `inventory_movements` MODIFY `type` ENUM('SALE', 'SALE_RETURN', 'MANUAL_ADJUST', 'SET_QUANTITY', 'TRANSFER_IN', 'TRANSFER_OUT', 'DOCUMENT_OUT', 'PURCHASE_RECEIVE') NOT NULL;

-- CreateTable
CREATE TABLE `sale_returns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sale_id` INTEGER NOT NULL,
    `company_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `reason` VARCHAR(191) NULL,
    `total` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sale_return_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `return_id` INTEGER NOT NULL,
    `variant_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sale_returns` ADD CONSTRAINT `sale_returns_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_returns` ADD CONSTRAINT `sale_returns_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_returns` ADD CONSTRAINT `sale_returns_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_return_items` ADD CONSTRAINT `sale_return_items_return_id_fkey` FOREIGN KEY (`return_id`) REFERENCES `sale_returns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_return_items` ADD CONSTRAINT `sale_return_items_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
