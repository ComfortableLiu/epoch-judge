-- User judge preferences
ALTER TABLE `users`
  ADD COLUMN `preferred_language` ENUM('JAVASCRIPT', 'C', 'CPP', 'PYTHON', 'JAVA') NULL,
  ADD COLUMN `preferred_judge_mode` ENUM('OI', 'ACM') NULL;

-- Judge mode is defined on contest and user preference, not on problem
ALTER TABLE `problems` DROP COLUMN `default_judge_mode`;
