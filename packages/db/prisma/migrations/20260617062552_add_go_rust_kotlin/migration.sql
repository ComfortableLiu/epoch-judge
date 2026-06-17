-- AlterTable
ALTER TABLE `submissions` MODIFY `language` ENUM('JAVASCRIPT', 'C', 'CPP', 'PYTHON', 'JAVA', 'GO', 'RUST', 'KOTLIN') NOT NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `preferred_language` ENUM('JAVASCRIPT', 'C', 'CPP', 'PYTHON', 'JAVA', 'GO', 'RUST', 'KOTLIN') NULL;
