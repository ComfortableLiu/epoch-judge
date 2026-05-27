-- AlterTable
ALTER TABLE `contest_registrations` ADD COLUMN `display_name_snapshot` VARCHAR(191) NULL,
    ADD COLUMN `is_star_team` BOOLEAN NOT NULL DEFAULT false;

-- Backfill snapshot from current user profile (frozen from this point for existing rows)
UPDATE `contest_registrations` cr
INNER JOIN `users` u ON u.id = cr.user_id
SET cr.display_name_snapshot = COALESCE(NULLIF(TRIM(u.display_name), ''), u.username)
WHERE cr.display_name_snapshot IS NULL;

ALTER TABLE `contest_registrations` MODIFY `display_name_snapshot` VARCHAR(191) NOT NULL;
