select * from qdn_db.machine_capability_part_rules;
show create table qdn_db.machine_capability_part_rules;
show create table qdn_db.machine_setup_states;
show create table qdn_db.machine_setup_groups;
select * from qdn_db.machine_capability_part_rules;

select * from ppc.machine_dedicated_parts;

-- x_CREATE TABLE `x_machine_capability_part_rules` (
--   `x_rule_id` bigint unsigned NOT NULL AUTO_INCREMENT,
--   `x_setup_state_id` bigint unsigned NOT NULL,
--   `x_match_type` enum('exact','contains','dedicated_list') NOT NULL,
--   `x_match_value` varchar(100) DEFAULT NULL,
--   `x_created_at` timestamp NULL DEFAULT NULL,
--   `x_updated_at` timestamp NULL DEFAULT NULL,
--   PRIMARY KEY (`rule_id`),
--   KEY `x_machine_capability_part_rules_setup_state_id_index` (`setup_state_id`),
--   CONSTRAINT `x_machine_capability_part_rules_setup_state_id_foreign` FOREIGN KEY (`setup_state_id`) REFERENCES `machine_setup_states` (`setup_state_id`) ON DELETE CASCADE
-- ) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

-- x_CREATE TABLE `x_machine_setup_states` (
--   `x_setup_state_id` bigint unsigned NOT NULL AUTO_INCREMENT,
--   `x_machine_id` int NOT NULL,
--   `x_group_id` bigint unsigned DEFAULT NULL,
--   `x_factory` enum('F1','F2','F3') NOT NULL,
--   `x_package_name` varchar(50) DEFAULT NULL,
--   `x_body_size` varchar(20) DEFAULT NULL,
--   `x_thickness` decimal(5,2) DEFAULT NULL,
--   `x_leadcount_min` int DEFAULT NULL,
--   `x_leadcount_max` int DEFAULT NULL,
--   `x_leadcount_exclude` varchar(50) DEFAULT NULL,
--   `x_process_type` enum('taping','tubing','both') NOT NULL,
--   `x_capacity_daily` int DEFAULT NULL,
--   `x_remarks` varchar(255) DEFAULT NULL,
--   `x_created_at` timestamp NULL DEFAULT NULL,
--   `x_updated_at` timestamp NULL DEFAULT NULL,
--   PRIMARY KEY (`setup_state_id`),
--   KEY `x_machine_setup_states_group_id_foreign` (`group_id`),
--   KEY `x_idx_mss_machine_factory_pkg` (`machine_id`,`factory`,`package_name`),
--   KEY `x_idx_mss_pkg_body` (`package_name`,`body_size`),
--   CONSTRAINT `x_machine_setup_states_group_id_foreign` FOREIGN KEY (`group_id`) REFERENCES `x_machine_setup_groups` (`group_id`) ON DELETE SET NULL,
--   CONSTRAINT `x_machine_setup_states_machine_id_foreign` FOREIGN KEY (`machine_id`) REFERENCES `x_machine_list` (`id`) ON DELETE CASCADE
-- ) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

-- x_CREATE TABLE `x_machine_setup_groups` (
--   `x_group_id` bigint unsigned NOT NULL AUTO_INCREMENT,
--   `x_machine_id` int NOT NULL,
--   `x_group_type` enum('convertible','standalone') NOT NULL,
--   `x_notes` varchar(255) DEFAULT NULL,
--   `x_created_at` timestamp NULL DEFAULT NULL,
--   `x_updated_at` timestamp NULL DEFAULT NULL,
--   PRIMARY KEY (`group_id`),
--   KEY `x_machine_setup_groups_machine_id_index` (`machine_id`),
--   CONSTRAINT `x_machine_setup_groups_machine_id_foreign` FOREIGN KEY (`machine_id`) REFERENCES `machine_list` (`id`) ON DELETE CASCADE
-- ) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

select * from qdn_db.machine_list where machine_num = '03VItrox';