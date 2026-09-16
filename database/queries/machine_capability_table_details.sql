XX CREATE X_TABLE `machine_list` (
  `id` int NOT NULL AUTO_INCREMENT,
  `machine_num` varchar(45) DEFAULT NULL,
  `model` varchar(45) DEFAULT NULL,
  `machine_platform` varchar(45) DEFAULT NULL,
  `machine_feed_type` varchar(45) DEFAULT NULL,
  `pmnt_no` varchar(45) DEFAULT NULL,
  `cn_no` varchar(45) DEFAULT NULL,
  `serial` varchar(45) DEFAULT NULL,
  `machine_manufacturer` varchar(45) DEFAULT NULL,
  `status` varchar(45) DEFAULT NULL,
  `manufactured_date` varchar(45) DEFAULT NULL,
  `location` varchar(45) DEFAULT NULL,
  `factory` varchar(45) DEFAULT NULL,
  `oem` varchar(45) DEFAULT NULL,
  `dimension` varchar(45) DEFAULT NULL,
  `input_voltage` varchar(45) DEFAULT NULL,
  `phase` varchar(45) DEFAULT NULL,
  `hz` varchar(45) DEFAULT NULL,
  `amp` varchar(45) DEFAULT NULL,
  `age` varchar(45) DEFAULT NULL,
  `ownership` varchar(45) DEFAULT NULL,
  `created_by` varchar(45) DEFAULT NULL,
  `date_created` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(45) DEFAULT NULL,
  `date_updated` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=344 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
XX CREATE X_TABLE `machine_capability_part_rules` (
  `rule_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `setup_state_id` bigint unsigned NOT NULL,
  `match_type` enum('exact','contains','dedicated_list') NOT NULL,
  `match_value` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`rule_id`),
  KEY `machine_capability_part_rules_setup_state_id_index` (`setup_state_id`),
  CONSTRAINT `machine_capability_part_rules_setup_state_id_foreign` FOREIGN KEY (`setup_state_id`) REFERENCES `machine_setup_states` (`setup_state_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1087 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
XX CREATE X_TABLE `machine_setup_states` (
  `setup_state_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `machine_id` int NOT NULL,
  `factory` enum('F1','F2','F3') NOT NULL,
  `focus_group` varchar(10) DEFAULT NULL,
  `package_name` varchar(50) DEFAULT NULL,
  `body_size` varchar(20) DEFAULT NULL,
  `thickness` decimal(5,2) DEFAULT NULL,
  `leadcount_min` int DEFAULT NULL,
  `leadcount_max` int DEFAULT NULL,
  `leadcount_exclude` varchar(50) DEFAULT NULL,
  `leadcount_include` varchar(255) DEFAULT NULL,
  `process_type` enum('taping','tubing','both','tray') NOT NULL,
  `capacity_daily` int DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setup_state_id`),
  KEY `idx_mss_machine_factory_pkg` (`machine_id`,`factory`,`package_name`),
  KEY `idx_mss_pkg_body` (`package_name`,`body_size`),
  CONSTRAINT `machine_setup_states_machine_id_foreign` FOREIGN KEY (`machine_id`) REFERENCES `machine_list` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1167 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
XX CREATE X_TABLE `machine_transition_rule_exceptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `machine_id` int NOT NULL,
  `part_name` varchar(100) NOT NULL,
  `from_state_id` bigint unsigned DEFAULT NULL,
  `to_state_id` bigint unsigned NOT NULL,
  `operation_type` enum('none','conversion','setup') NOT NULL,
  `est_duration_minutes` int DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `machine_transition_rule_exceptions_from_state_id_foreign` (`from_state_id`),
  KEY `machine_transition_rule_exceptions_to_state_id_foreign` (`to_state_id`),
  KEY `idx_mtre_lookup` (`machine_id`,`part_name`,`from_state_id`,`to_state_id`),
  CONSTRAINT `machine_transition_rule_exceptions_from_state_id_foreign` FOREIGN KEY (`from_state_id`) REFERENCES `machine_setup_states` (`setup_state_id`) ON DELETE CASCADE,
  CONSTRAINT `machine_transition_rule_exceptions_machine_id_foreign` FOREIGN KEY (`machine_id`) REFERENCES `machine_list` (`id`) ON DELETE CASCADE,
  CONSTRAINT `machine_transition_rule_exceptions_to_state_id_foreign` FOREIGN KEY (`to_state_id`) REFERENCES `machine_setup_states` (`setup_state_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=350 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
XX CREATE X_TABLE `machine_transition_rules` (
  `rule_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `machine_id` int NOT NULL,
  `from_state_id` bigint unsigned DEFAULT NULL,
  `to_state_id` bigint unsigned NOT NULL,
  `operation_type` enum('none','conversion','setup') NOT NULL,
  `est_duration_minutes` int DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`rule_id`),
  KEY `machine_transition_rules_from_state_id_foreign` (`from_state_id`),
  KEY `machine_transition_rules_to_state_id_foreign` (`to_state_id`),
  KEY `idx_mtr_lookup` (`machine_id`,`from_state_id`,`to_state_id`),
  CONSTRAINT `machine_transition_rules_from_state_id_foreign` FOREIGN KEY (`from_state_id`) REFERENCES `machine_setup_states` (`setup_state_id`) ON DELETE CASCADE,
  CONSTRAINT `machine_transition_rules_machine_id_foreign` FOREIGN KEY (`machine_id`) REFERENCES `machine_list` (`id`) ON DELETE CASCADE,
  CONSTRAINT `machine_transition_rules_to_state_id_foreign` FOREIGN KEY (`to_state_id`) REFERENCES `machine_setup_states` (`setup_state_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
show create table qdn_db.machine_list;
show create table qdn_db.machine_capability_part_rules;
show create table qdn_db.machine_setup_states;
show create table qdn_db.machine_transition_rule_exceptions;
show create table qdn_db.machine_transition_rules;

select * from qdn_db.machine_setup_states limit 9999;


select * from qdn_db.machine_transition_rules;

select * from qdn_db.machine_list where id = 121;


select distinct `Focus_Group` 
from ppc.customer_data_wip where `Package_Name` = 'LFCSP' and `Lead_Count` = 24;