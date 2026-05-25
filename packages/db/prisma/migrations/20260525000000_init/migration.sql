-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NULL,
    `role` ENUM('USER', 'ADMIN', 'PROBLEM_EDITOR') NOT NULL DEFAULT 'USER',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `problems` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `statement` TEXT NOT NULL,
    `difficulty` INTEGER NOT NULL DEFAULT 1,
    `visibility` ENUM('PUBLIC', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `default_judge_mode` ENUM('OI', 'ACM') NOT NULL DEFAULT 'ACM',
    `time_limit_ms` INTEGER NOT NULL DEFAULT 1000,
    `memory_limit_kb` INTEGER NOT NULL DEFAULT 262144,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `problems_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `problem_testcases` (
    `id` VARCHAR(191) NOT NULL,
    `problem_id` VARCHAR(191) NOT NULL,
    `ordinal` INTEGER NOT NULL,
    `input_key` VARCHAR(191) NOT NULL,
    `output_key` VARCHAR(191) NOT NULL,
    `input_size` INTEGER NOT NULL DEFAULT 0,
    `output_size` INTEGER NOT NULL DEFAULT 0,
    `checksum` VARCHAR(191) NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `is_sample` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `problem_testcases_problem_id_ordinal_key`(`problem_id`, `ordinal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `submissions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `problem_id` VARCHAR(191) NOT NULL,
    `contest_id` VARCHAR(191) NULL,
    `language` ENUM('JAVASCRIPT', 'C', 'CPP', 'PYTHON', 'JAVA') NOT NULL,
    `judge_mode` ENUM('OI', 'ACM') NOT NULL,
    `source_code` TEXT NOT NULL,
    `status` ENUM('PENDING', 'QUEUED', 'JUDGING', 'COMPILING', 'RUNNING', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILE_ERROR', 'SECURITY_ERROR', 'SYSTEM_ERROR') NOT NULL DEFAULT 'PENDING',
    `score` INTEGER NULL,
    `time_ms` INTEGER NULL,
    `memory_kb` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `submissions_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `submissions_problem_id_created_at_idx`(`problem_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `submission_testcase_results` (
    `id` VARCHAR(191) NOT NULL,
    `submission_id` VARCHAR(191) NOT NULL,
    `testcase_id` VARCHAR(191) NOT NULL,
    `verdict` ENUM('PENDING', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILE_ERROR', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `score` INTEGER NOT NULL DEFAULT 0,
    `time_ms` INTEGER NULL,
    `memory_kb` INTEGER NULL,
    `message` TEXT NULL,

    UNIQUE INDEX `submission_testcase_results_submission_id_testcase_id_key`(`submission_id`, `testcase_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contests` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `visibility` ENUM('PUBLIC', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `judge_mode` ENUM('OI', 'ACM') NOT NULL,
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NOT NULL,
    `freeze_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contests_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contest_problems` (
    `id` VARCHAR(191) NOT NULL,
    `contest_id` VARCHAR(191) NOT NULL,
    `problem_id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `ordinal` INTEGER NOT NULL,

    UNIQUE INDEX `contest_problems_contest_id_problem_id_key`(`contest_id`, `problem_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contest_registrations` (
    `id` VARCHAR(191) NOT NULL,
    `contest_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `contest_registrations_contest_id_user_id_key`(`contest_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `judge_nodes` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `host` VARCHAR(191) NULL,
    `last_heartbeat` DATETIME(3) NOT NULL,
    `concurrency` INTEGER NOT NULL DEFAULT 1,
    `is_online` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_config` (
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `problem_testcases` ADD CONSTRAINT `problem_testcases_problem_id_fkey` FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_problem_id_fkey` FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_contest_id_fkey` FOREIGN KEY (`contest_id`) REFERENCES `contests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission_testcase_results` ADD CONSTRAINT `submission_testcase_results_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission_testcase_results` ADD CONSTRAINT `submission_testcase_results_testcase_id_fkey` FOREIGN KEY (`testcase_id`) REFERENCES `problem_testcases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contest_problems` ADD CONSTRAINT `contest_problems_contest_id_fkey` FOREIGN KEY (`contest_id`) REFERENCES `contests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contest_problems` ADD CONSTRAINT `contest_problems_problem_id_fkey` FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contest_registrations` ADD CONSTRAINT `contest_registrations_contest_id_fkey` FOREIGN KEY (`contest_id`) REFERENCES `contests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contest_registrations` ADD CONSTRAINT `contest_registrations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
