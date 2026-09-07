`machine_list` (
  `id` int NOT NULL AUTO_INCREMENT,
  `machine_num` varchar(45) DEFAULT NULL,
  `model` varchar(45) DEFAULT NULL,
  `machine_platform` varchar(45) DEFAULT NULL,
  `machine_feed_type` varchar(45) DEFAULT NULL,
  `location` varchar(45) DEFAULT NULL,
  `factory` varchar(45) DEFAULT NULL,
)
`machine_transition_rules` (
  `rule_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `machine_id` int NOT NULL,
  `from_state_id` bigint unsigned DEFAULT NULL,
  `to_state_id` bigint unsigned NOT NULL,
  `operation_type` enum('none','conversion','setup') NOT NULL,
  `est_duration_minutes` int DEFAULT NULL,
)
`machine_transition_rule_exceptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `machine_id` int NOT NULL,
  `part_name` varchar(100) NOT NULL,
  `from_state_id` bigint unsigned DEFAULT NULL,
  `to_state_id` bigint unsigned NOT NULL,
  `operation_type` enum('none','conversion','setup') NOT NULL,
  `est_duration_minutes` int DEFAULT NULL,
) 
`machine_setup_states` (
  `setup_state_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `machine_id` int NOT NULL,
  `group_id` bigint unsigned DEFAULT NULL,
  `factory` enum('F1','F2','F3') NOT NULL,
  `package_name` varchar(50) DEFAULT NULL,
  `body_size` varchar(20) DEFAULT NULL,
  `thickness` decimal(5,2) DEFAULT NULL,
  `leadcount_min` int DEFAULT NULL,
  `leadcount_max` int DEFAULT NULL,
  `leadcount_exclude` varchar(50) DEFAULT NULL,
  `process_type` enum('taping','tubing','both') NOT NULL,
  `capacity_daily` int DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
)
`machine_setup_groups` (
  `group_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `machine_id` int NOT NULL,
  `group_type` enum('convertible','standalone') NOT NULL,
  `notes` varchar(255) DEFAULT NULL,
)
`machine_capability_part_rules` (
  `rule_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `setup_state_id` bigint unsigned NOT NULL,
  `match_type` enum('exact','contains','dedicated_list') NOT NULL,
  `match_value` varchar(100) DEFAULT NULL,
)

-- show create table qdn_db.machine_capability_part_rules;
-- show create table qdn_db.machine_setup_groups;
-- show create table qdn_db.machine_setup_states;
-- show create table qdn_db.machine_transition_rule_exceptions;
-- show create table qdn_db.machine_transition_rules;
show create table qdn_db.machine_list;
