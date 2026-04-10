-- CreateTable
CREATE TABLE `employees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER NOT NULL,
    `branch_id` INTEGER NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `cuil` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `position` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `hire_date` DATETIME(3) NOT NULL,
    `termination_date` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE') NOT NULL DEFAULT 'ACTIVE',
    `contract_type` ENUM('FULL_TIME', 'PART_TIME', 'TEMPORARY', 'TRIAL') NOT NULL DEFAULT 'FULL_TIME',
    `gross_salary` DECIMAL(10, 2) NOT NULL,
    `bank_account` VARCHAR(191) NULL,
    `cbu` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `employees_company_id_idx`(`company_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payrolls` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER NOT NULL,
    `employee_id` INTEGER NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `period_type` ENUM('MONTHLY', 'SAC', 'FINAL') NOT NULL DEFAULT 'MONTHLY',
    `basic_salary` DECIMAL(10, 2) NOT NULL,
    `extra_hours` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `bonus` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `other_earnings` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `gross_total` DECIMAL(10, 2) NOT NULL,
    `deduct_jubilacion` DECIMAL(10, 2) NOT NULL,
    `deduct_obra_social` DECIMAL(10, 2) NOT NULL,
    `deduct_inssjp` DECIMAL(10, 2) NOT NULL,
    `deduct_sindicato` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `deduct_other` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total_deductions` DECIMAL(10, 2) NOT NULL,
    `net_salary` DECIMAL(10, 2) NOT NULL,
    `patronal_jubilacion` DECIMAL(10, 2) NOT NULL,
    `patronal_inssjp` DECIMAL(10, 2) NOT NULL,
    `patronal_obra_social` DECIMAL(10, 2) NOT NULL,
    `patronal_art` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `patronal_total` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('DRAFT', 'CONFIRMED', 'PAID') NOT NULL DEFAULT 'DRAFT',
    `notes` VARCHAR(191) NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payrolls_company_id_idx`(`company_id`),
    UNIQUE INDEX `payrolls_employee_id_period_key`(`employee_id`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payrolls` ADD CONSTRAINT `payrolls_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payrolls` ADD CONSTRAINT `payrolls_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
