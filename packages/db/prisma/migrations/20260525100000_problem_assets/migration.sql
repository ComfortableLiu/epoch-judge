-- CreateTable
CREATE TABLE `problem_assets` (
    `id` VARCHAR(191) NOT NULL,
    `problem_id` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `storage_key` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `problem_assets_problem_id_path_key`(`problem_id`, `path`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `problem_assets` ADD CONSTRAINT `problem_assets_problem_id_fkey` FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
