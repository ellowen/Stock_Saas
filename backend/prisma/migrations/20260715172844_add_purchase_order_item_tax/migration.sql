-- AlterTable
ALTER TABLE `purchase_order_items` ADD COLUMN `tax_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `tax_config_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_tax_config_id_fkey` FOREIGN KEY (`tax_config_id`) REFERENCES `tax_configs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
