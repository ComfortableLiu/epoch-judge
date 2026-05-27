-- Problem numeric id; drop slug
ALTER TABLE `problems` ADD COLUMN `number` INT NULL;

UPDATE `problems` AS `p`
INNER JOIN (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY `created_at` ASC, `id` ASC) AS `rn`
  FROM `problems`
) AS `ordered` ON `p`.`id` = `ordered`.`id`
SET `p`.`number` = `ordered`.`rn`;

ALTER TABLE `problems` MODIFY `number` INT NOT NULL;
CREATE UNIQUE INDEX `problems_number_key` ON `problems`(`number`);
ALTER TABLE `problems` MODIFY `number` INT NOT NULL AUTO_INCREMENT;

ALTER TABLE `problems` DROP INDEX IF EXISTS `problems_slug_key`;
ALTER TABLE `problems` DROP COLUMN `slug`;
