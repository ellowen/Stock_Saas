-- CreateTable
CREATE TABLE `inventory_movements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER NOT NULL,
    `branch_id` INTEGER NOT NULL,
    `product_variant_id` INTEGER NOT NULL,
    `type` ENUM('SALE', 'MANUAL_ADJUST', 'SET_QUANTITY', 'TRANSFER_IN', 'TRANSFER_OUT') NOT NULL,
    `quantity_before` INTEGER NOT NULL,
    `quantity_after` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `reference_type` VARCHAR(191) NULL,
    `reference_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventory_movements_company_id_branch_id_created_at_idx`(`company_id`, `branch_id`, `created_at` DESC),
    INDEX `inventory_movements_company_id_product_variant_id_created_at_idx`(`company_id`, `product_variant_id`, `created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_product_variant_id_fkey` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
