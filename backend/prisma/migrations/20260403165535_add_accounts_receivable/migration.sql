-- CreateTable
CREATE TABLE `accounts_receivable` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `sale_id` INTEGER NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `paid` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `due_date` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `accounts_receivable_company_id_customer_id_idx`(`company_id`, `customer_id`),
    INDEX `accounts_receivable_company_id_status_idx`(`company_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ar_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `receivable_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `method` ENUM('CASH', 'CARD', 'MIXED', 'OTHER') NOT NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `accounts_receivable` ADD CONSTRAINT `accounts_receivable_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accounts_receivable` ADD CONSTRAINT `accounts_receivable_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ar_payments` ADD CONSTRAINT `ar_payments_receivable_id_fkey` FOREIGN KEY (`receivable_id`) REFERENCES `accounts_receivable`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
