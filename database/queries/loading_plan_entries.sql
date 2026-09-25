select * from ppc.loading_plan_entries where id = 3409;

select * from ppc.lot_quantities where lot_id = 'BB52463.4';

show create table ppc.lot_quantities;
show create table qdn_db.machine_setup_states;
show create table qdn_db.machine_part_exclusions;
show create table qdn_db.machine_auto_part_rules;
CREATE TABLE `loading_plan_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entry_type` enum('lot','block') NOT NULL DEFAULT 'lot',
  `lot_id` varchar(64) DEFAULT NULL,
  `part_name` varchar(255) DEFAULT NULL,
  `package_name` varchar(50) DEFAULT NULL,
  `scheduled_date` date NOT NULL,
  `machine_id` int unsigned DEFAULT NULL,
  `machine_snapshot` varchar(255) DEFAULT NULL,
  `doable_snapshot` int DEFAULT NULL,
  `finalized_at` timestamp NULL DEFAULT NULL,
  `sequence_order` decimal(14,4) DEFAULT NULL,
  `status` varchar(32) DEFAULT NULL,
  `tag` varchar(16) DEFAULT NULL,
  `is_manual_expedite` tinyint(1) NOT NULL DEFAULT '0',
  `remarks` text,
  `block_label` varchar(128) DEFAULT NULL,
  `resulting_setup_state_id` bigint unsigned DEFAULT NULL,
  `operation_type` enum('setup','conversion') DEFAULT NULL,
  `matched_rule_id` bigint unsigned DEFAULT NULL,
  `accu_time` int DEFAULT NULL,
  `time_start` datetime DEFAULT NULL,
  `time_end` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `lock_version` bigint unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_lot_per_day` (`lot_id`,`scheduled_date`),
  UNIQUE KEY `uniq_machine_sequence_per_day` (`machine_id`,`scheduled_date`,`sequence_order`),
  KEY `loading_plan_entries_finalized_at_index` (`finalized_at`),
  KEY `idx_loading_plan_machine_seq` (`machine_id`,`sequence_order`),
  KEY `idx_date_entry_type` (`scheduled_date`,`entry_type`),
  KEY `idx_machine_time_range` (`machine_id`,`time_start`,`time_end`),
  KEY `loading_plan_entries_resulting_setup_state_id_foreign` (`resulting_setup_state_id`),
  KEY `loading_plan_entries_matched_rule_id_foreign` (`matched_rule_id`),
  KEY `idx_lpe_machine_status_start` (`machine_id`,`status`,`time_start`),
  CONSTRAINT `loading_plan_entries_matched_rule_id_foreign` FOREIGN KEY (`matched_rule_id`) REFERENCES `qdn_db`.`machine_transition_rules` (`rule_id`) ON DELETE SET NULL,
  CONSTRAINT `loading_plan_entries_resulting_setup_state_id_foreign` FOREIGN KEY (`resulting_setup_state_id`) REFERENCES `qdn_db`.`machine_setup_states` (`setup_state_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=21497 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci


show create table ppc.ppc_pickupdb;
show create table ppc.loading_plan_entries;
show create table ppc.customer_data_wip;

select * from ppc.lot_quantity_history;
select distinct ramp_time from ppc.customer_data_wip;
select * from qdn_db.package_list where devicename = 'ADBMS2950WCCSZ-RL';
select * from qdn_db.package_list where devicename = 'LTC4286AUKM#TRPBF';
select * from qdn_db.package_list;
select * from qdn_db.machine_list;
select distinct machine_platform from qdn_db.machine_list;
select * from qdn_db.machine_capability_part_rules;
select * from qdn_db.machine_setup_groups;
select * from qdn_db.machine_setup_states;
select * from qdn_db.machine_capability_part_rules;
select * from qdn_db.machine_transition_rules;
select * from qdn_db.machine_platform_capacity_bands;

select * from loading_plan_entries where scheduled_date = '2026-09-15' limit 99999;
select * from loading_plan_entries where scheduled_date = '2026-09-15' limit 99999;
select * from ppc.loading_plan_entries where scheduled_date = '2026-09-23' and lot_id = 'G165626.6';
select * from ppc.loading_plan_entries where scheduled_date = '2026-09-23' and lot_id = 'G165626.6';
select * from ppc.loading_plan_entries where scheduled_date = '2026-09-23' and machine_id = 91 limit 1000;
select * from ppc.loading_plan_entries where scheduled_date = '2026-09-1' and machine_id = 91 limit 1000;

SELECT 
    MIN(time_start) AS earliest_time_start,
    MAX(time_start) AS latest_time_start
FROM ppc.loading_plan_entries 
WHERE scheduled_date = '2026-09-23';
SHOW TRIGGERS;

SHOW TRIGGERS FROM ppc;

select * from ppc.machine_day_starts;

select * from loading_plan_entries where time_start is null;
select * from loading_plan_entries where scheduled_date = '2026-09-24';
select * from machine_day_starts where machine_id = 97;
select * from machine_day_starts where machine_id = 55;
show create table machine_day_starts;
select * from loading_plan_entries where id = 16985;

show create table ppc.loading_plan_entries;
select * from customer_data_wip where `Lot_Id` = "BC88825.5" and import_date = '2026-09-17';
select * from customer_data_wip where `Lot_Id` = "BC88825.5";
select * from loading_plan_entries where `Lot_Id` = "BC88825.5";
-- select * from loading_plan_entries where ;
select * from customer_data_wip where `Lot_Id` = "BC88544.2";
select * from customer_data_wip where import_date = '2026-09-18';
select * from loading_plan_entries;

select * from ppc.loading_plan_entries where lot_id like '%BD17941%' and scheduled_date = '2026-09-18' limit 9999;
select * from ppc.loading_plan_entries where scheduled_date = '2026-09-18' limit 9999;

select * from loading_plan_entries where machine_id = 4 and scheduled_date = '2026-09-15' limit 999;

-- CREATE TABLE `x_lot_quantities` (
--   `x_id` bigint unsigned NOT NULL AUTO_INCREMENT,
--   `x_lot_id` varchar(255) NOT NULL,
--   `x_scheduled_date` date NOT NULL,
--   `x_part_name` varchar(255) NOT NULL,
--   `x_qty_base` int unsigned NOT NULL,
--   `x_split_adjustment` int NOT NULL DEFAULT '0',
--   `x_merge_adjustment` int NOT NULL DEFAULT '0',
--   `x_qty_override` int unsigned DEFAULT NULL,
--   `x_commit` int unsigned DEFAULT NULL,
--   `x_recipe_used` int unsigned DEFAULT NULL,
--   `x_recipe_source_id` bigint unsigned DEFAULT NULL,
--   `x_recipe_status` enum('ok','no_recipe','qty_below_recipe') NOT NULL DEFAULT 'no_recipe',
--   `x_capacity_uph_snapshot` int unsigned DEFAULT NULL,
--   `x_created_at` timestamp NULL DEFAULT NULL,
--   `x_updated_at` timestamp NULL DEFAULT NULL,
--   PRIMARY KEY (`id`),
--   UNIQUE KEY `x_lot_quantities_lot_id_scheduled_date_unique` (`lot_id`,`scheduled_date`)
-- ) ENGINE=InnoDB AUTO_INCREMENT=833158 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci