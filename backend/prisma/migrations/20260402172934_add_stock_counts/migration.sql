-- CreateTable
CREATE TABLE `stock_counts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER NOT NULL,
    `branch_id` INTEGER NOT NULL,
    `status` ENUM('OPEN', 'APPLIED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closed_at` DATETIME(3) NULL,
    `created_by` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_count_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stock_count_id` INTEGER NOT NULL,
    `variant_id` INTEGER NOT NULL,
    `system_qty` INTEGER NOT NULL,
    `counted_qty` INTEGER NULL,

    UNIQUE INDEX `stock_count_items_stock_count_id_variant_id_key`(`stock_count_id`, `variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `stock_counts` ADD CONSTRAINT `stock_counts_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_counts` ADD CONSTRAINT `stock_counts_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_counts` ADD CONSTRAINT `stock_counts_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_count_items` ADD CONSTRAINT `stock_count_items_stock_count_id_fkey` FOREIGN KEY (`stock_count_id`) REFERENCES `stock_counts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_count_items` ADD CONSTRAINT `stock_count_items_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
