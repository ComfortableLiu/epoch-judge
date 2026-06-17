-- AlterTable
ALTER TABLE `users` ADD COLUMN `is_teacher` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `classes` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL DEFAULT '',
    `teacher_id` VARCHAR(191) NOT NULL,
    `invitation_code` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `classes_invitation_code_key`(`invitation_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class_members` (
    `id` VARCHAR(191) NOT NULL,
    `class_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `class_members_class_id_user_id_key`(`class_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `homeworks` (
    `id` VARCHAR(191) NOT NULL,
    `class_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL DEFAULT '',
    `deadline` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `homeworks_class_id_deadline_idx`(`class_id`, `deadline`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `homework_problems` (
    `id` VARCHAR(191) NOT NULL,
    `homework_id` VARCHAR(191) NOT NULL,
    `problem_id` VARCHAR(191) NOT NULL,
    `ordinal` INTEGER NOT NULL,

    UNIQUE INDEX `homework_problems_homework_id_problem_id_key`(`homework_id`, `problem_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `classes` ADD CONSTRAINT `classes_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_members` ADD CONSTRAINT `class_members_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_members` ADD CONSTRAINT `class_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `homeworks` ADD CONSTRAINT `homeworks_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `homework_problems` ADD CONSTRAINT `homework_problems_homework_id_fkey` FOREIGN KEY (`homework_id`) REFERENCES `homeworks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `homework_problems` ADD CONSTRAINT `homework_problems_problem_id_fkey` FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
