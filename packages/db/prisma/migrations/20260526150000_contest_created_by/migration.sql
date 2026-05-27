-- AlterTable
ALTER TABLE `contests` ADD COLUMN `created_by_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `contests` ADD CONSTRAINT `contests_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
