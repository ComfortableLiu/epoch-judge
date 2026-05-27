-- Problem creator and default private visibility
ALTER TABLE `problems` ADD COLUMN `created_by_id` VARCHAR(191) NULL;
ALTER TABLE `problems` ADD CONSTRAINT `problems_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `problems` MODIFY `visibility` ENUM('PUBLIC', 'PRIVATE') NOT NULL DEFAULT 'PRIVATE';

-- Contest numeric id, password; drop slug
ALTER TABLE `contests` ADD COLUMN `number` INT NULL;

UPDATE `contests` AS `c`
INNER JOIN (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY `created_at` ASC, `id` ASC) AS `rn`
  FROM `contests`
) AS `ordered` ON `c`.`id` = `ordered`.`id`
SET `c`.`number` = `ordered`.`rn`;

ALTER TABLE `contests` MODIFY `number` INT NOT NULL;
CREATE UNIQUE INDEX `contests_number_key` ON `contests`(`number`);
ALTER TABLE `contests` MODIFY `number` INT NOT NULL AUTO_INCREMENT;

ALTER TABLE `contests` DROP INDEX IF EXISTS `contests_slug_key`;
ALTER TABLE `contests` DROP COLUMN `slug`;
ALTER TABLE `contests` ADD COLUMN `access_password` VARCHAR(191) NULL;

-- Password verification on registration
ALTER TABLE `contest_registrations` ADD COLUMN `password_verified` BOOLEAN NOT NULL DEFAULT false;
UPDATE `contest_registrations` SET `password_verified` = true;
