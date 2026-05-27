-- 修复 20260525210000_contest_guards_and_admin 部分执行后的库状态，便于重新 migrate deploy。
-- 用法（在项目根目录，先确保 DATABASE_URL 或 DB_* 可用）：
--   mysql -h HOST -u USER -p DATABASE < packages/db/scripts/repair-contest-guards-migration.sql
-- 然后：
--   cd packages/db && npx prisma migrate resolve --rolled-back 20260525210000_contest_guards_and_admin
--   npx prisma migrate deploy

-- ========== 回滚可能已部分应用的变更（可重复执行，忽略报错） ==========

-- problems.created_by_id
SET @fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'problems'
    AND CONSTRAINT_NAME = 'problems_created_by_id_fkey'
);
SET @sql := IF(@fk > 0, 'ALTER TABLE `problems` DROP FOREIGN KEY `problems_created_by_id_fkey`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'problems' AND COLUMN_NAME = 'created_by_id'
);
SET @sql := IF(@col > 0, 'ALTER TABLE `problems` DROP COLUMN `created_by_id`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- contests.number / access_password（保留 slug 若仍在）
SET @idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contests' AND INDEX_NAME = 'contests_number_key'
);
SET @sql := IF(@idx > 0, 'ALTER TABLE `contests` DROP INDEX `contests_number_key`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contests' AND COLUMN_NAME = 'number'
);
SET @sql := IF(@col > 0, 'ALTER TABLE `contests` DROP COLUMN `number`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contests' AND COLUMN_NAME = 'access_password'
);
SET @sql := IF(@col > 0, 'ALTER TABLE `contests` DROP COLUMN `access_password`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- contest_registrations.password_verified
SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contest_registrations' AND COLUMN_NAME = 'password_verified'
);
SET @sql := IF(@col > 0, 'ALTER TABLE `contest_registrations` DROP COLUMN `password_verified`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
