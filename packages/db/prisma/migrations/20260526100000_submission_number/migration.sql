ALTER TABLE `submissions` ADD COLUMN `number` INT NULL;

UPDATE `submissions` AS `s`
INNER JOIN (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY `created_at` ASC, `id` ASC) AS `rn`
  FROM `submissions`
) AS `ordered` ON `s`.`id` = `ordered`.`id`
SET `s`.`number` = `ordered`.`rn`;

ALTER TABLE `submissions` MODIFY `number` INT NOT NULL;
CREATE UNIQUE INDEX `submissions_number_key` ON `submissions`(`number`);
ALTER TABLE `submissions` MODIFY `number` INT NOT NULL AUTO_INCREMENT;
