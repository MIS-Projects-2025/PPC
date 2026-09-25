-- =====================================================
-- 30G6L
-- =====================================================

SET @m_30g6l = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '30G6L');

-- Preserve part-routed states; wipe everything else for this machine and rebuild
DELETE FROM `qdn_db`.`machine_setup_states`
WHERE `machine_id` = @m_30g6l
  AND `setup_state_id` NOT IN (SELECT DISTINCT `setup_state_id` FROM `qdn_db`.`machine_capability_part_rules`);
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_30g6l;

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_30g6l, 'F2', 'TSSOP_4.4', 20, 20, 'both', '30G6L: F2 TSSOP_4.4, 20L');
SET @s_30g6l_tssop44_20_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_30g6l, 'F2', 'TSSOP_4.4', 28, 28, 'both', '30G6L: F2 TSSOP_4.4, 28L');
SET @s_30g6l_tssop44_28_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_30g6l, 'F2', 'TSSOP_4.4_EP', 38, 38, 'both', '30G6L: F2 TSSOP_4.4_EP, 38L');
SET @s_30g6l_tssop44ep_38_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_30g6l, 'F2', 'TSSOP_4.4_EP', 24, 24, 'both', '30G6L: F2 TSSOP_4.4_EP, 24L');
SET @s_30g6l_tssop44ep_24_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_30g6l, 'F2', 'TSSOP_4.4_EP', 28, 28, 'both', '30G6L: F2 TSSOP_4.4_EP, 28L');
SET @s_30g6l_tssop44ep_28_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_30g6l, 'F2', 'TSSOP_4.4_EP', 20, 20, 'both', '30G6L: F2 TSSOP_4.4_EP, 20L');
SET @s_30g6l_tssop44ep_20_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_30g6l, 'F2', 'TSSOP_4.4_EP', 31, 31, 'both', '30G6L: F2 TSSOP_4.4_EP, 31L');
SET @s_30g6l_tssop44ep_31_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_30g6l, 'F2', 'TSSOP_4.4_EP', 16, 16, 'both', '30G6L: F2 TSSOP_4.4_EP, 16L');
SET @s_30g6l_tssop44ep_16_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_30g6l, 'F2', 'TSSOP', 14, 14, 'both', '30G6L: F2 TSSOP, 14L');
SET @s_30g6l_tssop_14_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_30g6l, 'F2', 'TSSOP', 20, 20, 'both', '30G6L: F2 TSSOP, 20L');
SET @s_30g6l_tssop_20_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES
  (@m_30g6l, 'leadcount', 'setup', 120, 'max'),
  (@m_30g6l, 'package_group', 'setup', 120, 'max');

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_30g6l, NULL, @s_30g6l_tssop44_20_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_30g6l, NULL, @s_30g6l_tssop44_28_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_30g6l, NULL, @s_30g6l_tssop44ep_38_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_30g6l, NULL, @s_30g6l_tssop44ep_24_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_30g6l, NULL, @s_30g6l_tssop44ep_28_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_30g6l, NULL, @s_30g6l_tssop44ep_20_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_30g6l, NULL, @s_30g6l_tssop44ep_31_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_30g6l, NULL, @s_30g6l_tssop44ep_16_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_30g6l, NULL, @s_30g6l_tssop_14_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_30g6l, NULL, @s_30g6l_tssop_20_f2, 'setup', 120, 'bootstrap: no prior state -> setup');

-- 30G6L TOTALS: 10 states, 2 axis rule(s), 0 override rows


-- =====================================================
-- 51G6L
-- =====================================================

SET @m_51g6l = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '51G6L');

-- Preserve part-routed states; wipe everything else for this machine and rebuild
DELETE FROM `qdn_db`.`machine_setup_states`
WHERE `machine_id` = @m_51g6l
  AND `setup_state_id` NOT IN (SELECT DISTINCT `setup_state_id` FROM `qdn_db`.`machine_capability_part_rules`);
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_51g6l;

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_51g6l, 'F2', 'TSSOP_4.4_EP', 16, 16, 'both', '51G6L: F2 TSSOP_4.4_EP, 16L');
SET @s_51g6l_tssop44ep_16_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_51g6l, 'F2', 'TSSOP_4.4_EP', 28, 28, 'both', '51G6L: F2 TSSOP_4.4_EP, 28L');
SET @s_51g6l_tssop44ep_28_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_51g6l, 'F2', 'TSSOP_4.4_EP', 24, 24, 'both', '51G6L: F2 TSSOP_4.4_EP, 24L');
SET @s_51g6l_tssop44ep_24_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_51g6l, 'F2', 'TSSOP_4.4_EP', 20, 20, 'both', '51G6L: F2 TSSOP_4.4_EP, 20L');
SET @s_51g6l_tssop44ep_20_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_51g6l, 'F2', 'TSSOP_4.4_EP', 38, 38, 'both', '51G6L: F2 TSSOP_4.4_EP, 38L');
SET @s_51g6l_tssop44ep_38_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_51g6l, 'F2', 'TSSOP_4.4_EP', 31, 31, 'both', '51G6L: F2 TSSOP_4.4_EP, 31L');
SET @s_51g6l_tssop44ep_31_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES
  (@m_51g6l, 'leadcount', 'setup', 120, 'max');

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_51g6l, NULL, @s_51g6l_tssop44ep_16_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_51g6l, NULL, @s_51g6l_tssop44ep_28_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_51g6l, NULL, @s_51g6l_tssop44ep_24_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_51g6l, NULL, @s_51g6l_tssop44ep_20_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_51g6l, NULL, @s_51g6l_tssop44ep_38_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_51g6l, NULL, @s_51g6l_tssop44ep_31_f2, 'setup', 120, 'bootstrap: no prior state -> setup');

-- 51G6L TOTALS: 6 states, 1 axis rule(s), 0 override rows


-- =====================================================
-- 34AT28
-- =====================================================

SET @m_34at28 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '34AT28');

-- Preserve part-routed states; wipe everything else for this machine and rebuild
DELETE FROM `qdn_db`.`machine_setup_states`
WHERE `machine_id` = @m_34at28
  AND `setup_state_id` NOT IN (SELECT DISTINCT `setup_state_id` FROM `qdn_db`.`machine_capability_part_rules`);
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_34at28;

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34at28, 'F1', 'TSSOP_4.4', 16, 16, 'tubing', '34AT28: F1 TSSOP_4.4, 16L');
SET @s_34at28_tssop44_16_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34at28, 'F1', 'TSSOP_4.4', 28, 28, 'tubing', '34AT28: F1 TSSOP_4.4, 28L');
SET @s_34at28_tssop44_28_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34at28, 'F1', 'TSSOP_4.4', 14, 14, 'tubing', '34AT28: F1 TSSOP_4.4, 14L');
SET @s_34at28_tssop44_14_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34at28, 'F1', 'TSSOP_4.4', 24, 24, 'tubing', '34AT28: F1 TSSOP_4.4, 24L');
SET @s_34at28_tssop44_24_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34at28, 'F1', 'TSSOP_4.4', 20, 20, 'tubing', '34AT28: F1 TSSOP_4.4, 20L');
SET @s_34at28_tssop44_20_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34at28, 'F1', 'TSSOP_4.4', 38, 38, 'tubing', '34AT28: F1 TSSOP_4.4, 38L');
SET @s_34at28_tssop44_38_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34at28, 'F1', 'TSSOP_4.4_EP', 28, 28, 'tubing', '34AT28: F1 TSSOP_4.4_EP, 28L');
SET @s_34at28_tssop44ep_28_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34at28, 'F1', 'TSSOP_4.4_EP', 20, 20, 'tubing', '34AT28: F1 TSSOP_4.4_EP, 20L');
SET @s_34at28_tssop44ep_20_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34at28, 'F1', 'TSSOP_4.4_EP', 24, 24, 'tubing', '34AT28: F1 TSSOP_4.4_EP, 24L');
SET @s_34at28_tssop44ep_24_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES
  (@m_34at28, 'leadcount', 'setup', 120, 'max'),
  (@m_34at28, 'package_group', 'setup', 120, 'max');

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_34at28, NULL, @s_34at28_tssop44_16_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34at28, NULL, @s_34at28_tssop44_28_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34at28, NULL, @s_34at28_tssop44_14_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34at28, NULL, @s_34at28_tssop44_24_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34at28, NULL, @s_34at28_tssop44_20_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34at28, NULL, @s_34at28_tssop44_38_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34at28, NULL, @s_34at28_tssop44ep_28_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34at28, NULL, @s_34at28_tssop44ep_20_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34at28, NULL, @s_34at28_tssop44ep_24_f1, 'setup', 120, 'bootstrap: no prior state -> setup');

-- 34AT28 TOTALS: 9 states, 2 axis rule(s), 0 override rows


-- =====================================================
-- 52AT28
-- =====================================================

SET @m_52at28 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '52AT28');

-- Preserve part-routed states; wipe everything else for this machine and rebuild
DELETE FROM `qdn_db`.`machine_setup_states`
WHERE `machine_id` = @m_52at28
  AND `setup_state_id` NOT IN (SELECT DISTINCT `setup_state_id` FROM `qdn_db`.`machine_capability_part_rules`);
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_52at28;

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_52at28, 'F1', 'TSSOP_4.4', 14, 14, 'both', '52AT28: F1 TSSOP_4.4, 14L');
SET @s_52at28_tssop44_14_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_52at28, 'F1', 'TSSOP_4.4', 24, 24, 'both', '52AT28: F1 TSSOP_4.4, 24L');
SET @s_52at28_tssop44_24_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_52at28, 'F1', 'TSSOP_4.4', 20, 20, 'both', '52AT28: F1 TSSOP_4.4, 20L');
SET @s_52at28_tssop44_20_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_52at28, 'F1', 'TSSOP_4.4', 16, 16, 'both', '52AT28: F1 TSSOP_4.4, 16L');
SET @s_52at28_tssop44_16_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_52at28, 'F1', 'TSSOP_4.4', 28, 28, 'both', '52AT28: F1 TSSOP_4.4, 28L');
SET @s_52at28_tssop44_28_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_52at28, 'F1', 'TSSOP_4.4', 38, 38, 'both', '52AT28: F1 TSSOP_4.4, 38L');
SET @s_52at28_tssop44_38_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_52at28, 'F1', 'TSSOP_4.4_EP', 20, 20, 'both', '52AT28: F1 TSSOP_4.4_EP, 20L');
SET @s_52at28_tssop44ep_20_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_52at28, 'F2', 'TSSOP_4.4_EP', 20, 20, 'both', '52AT28: F2 TSSOP_4.4_EP, 20L');
SET @s_52at28_tssop44ep_20_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_52at28, 'F1', 'TSSOP_4.4_EP', 24, 24, 'both', '52AT28: F1 TSSOP_4.4_EP, 24L');
SET @s_52at28_tssop44ep_24_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_52at28, 'F2', 'TSSOP_4.4_EP', 24, 24, 'both', '52AT28: F2 TSSOP_4.4_EP, 24L');
SET @s_52at28_tssop44ep_24_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_52at28, 'F1', 'TSSOP_4.4_EP', 16, 16, 'both', '52AT28: F1 TSSOP_4.4_EP, 16L');
SET @s_52at28_tssop44ep_16_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_52at28, 'F2', 'TSSOP_4.4_EP', 16, 16, 'both', '52AT28: F2 TSSOP_4.4_EP, 16L');
SET @s_52at28_tssop44ep_16_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_52at28, 'F1', 'TSSOP_4.4_EP', 28, 28, 'both', '52AT28: F1 TSSOP_4.4_EP, 28L');
SET @s_52at28_tssop44ep_28_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_52at28, 'F2', 'TSSOP_4.4_EP', 28, 28, 'both', '52AT28: F2 TSSOP_4.4_EP, 28L');
SET @s_52at28_tssop44ep_28_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_52at28, 'F1', 'TSSOP_4.4_EP', 38, 38, 'both', '52AT28: F1 TSSOP_4.4_EP, 38L');
SET @s_52at28_tssop44ep_38_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_52at28, 'F2', 'TSSOP_4.4_EP', 38, 38, 'both', '52AT28: F2 TSSOP_4.4_EP, 38L');
SET @s_52at28_tssop44ep_38_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES
  (@m_52at28, 'leadcount', 'setup', 120, 'max'),
  (@m_52at28, 'package_group', 'setup', 120, 'max');

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_52at28, NULL, @s_52at28_tssop44_14_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_52at28, NULL, @s_52at28_tssop44_24_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_52at28, NULL, @s_52at28_tssop44_20_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_52at28, NULL, @s_52at28_tssop44_16_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_52at28, NULL, @s_52at28_tssop44_28_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_52at28, NULL, @s_52at28_tssop44_38_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_52at28, NULL, @s_52at28_tssop44ep_20_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_52at28, NULL, @s_52at28_tssop44ep_20_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_52at28, NULL, @s_52at28_tssop44ep_24_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_52at28, NULL, @s_52at28_tssop44ep_24_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_52at28, NULL, @s_52at28_tssop44ep_16_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_52at28, NULL, @s_52at28_tssop44ep_16_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_52at28, NULL, @s_52at28_tssop44ep_28_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_52at28, NULL, @s_52at28_tssop44ep_28_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_52at28, NULL, @s_52at28_tssop44ep_38_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_52at28, NULL, @s_52at28_tssop44ep_38_f2, 'setup', 120, 'bootstrap: no prior state -> setup');

-- Same package+leadcount, factory swap only = free (no factory axis defined)
INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_52at28, @s_52at28_tssop44ep_20_f1, @s_52at28_tssop44ep_20_f2, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_52at28, @s_52at28_tssop44ep_20_f2, @s_52at28_tssop44ep_20_f1, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_52at28, @s_52at28_tssop44ep_24_f1, @s_52at28_tssop44ep_24_f2, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_52at28, @s_52at28_tssop44ep_24_f2, @s_52at28_tssop44ep_24_f1, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_52at28, @s_52at28_tssop44ep_16_f1, @s_52at28_tssop44ep_16_f2, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_52at28, @s_52at28_tssop44ep_16_f2, @s_52at28_tssop44ep_16_f1, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_52at28, @s_52at28_tssop44ep_28_f1, @s_52at28_tssop44ep_28_f2, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_52at28, @s_52at28_tssop44ep_28_f2, @s_52at28_tssop44ep_28_f1, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_52at28, @s_52at28_tssop44ep_38_f1, @s_52at28_tssop44ep_38_f2, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_52at28, @s_52at28_tssop44ep_38_f2, @s_52at28_tssop44ep_38_f1, 'none', 0, 'same package/leadcount, factory swap only');

-- 52AT28 TOTALS: 16 states, 2 axis rule(s), 10 override rows


-- =====================================================
-- 04STI
-- =====================================================

SET @m_04sti = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '04STI');

-- Preserve part-routed states; wipe everything else for this machine and rebuild
DELETE FROM `qdn_db`.`machine_setup_states`
WHERE `machine_id` = @m_04sti
  AND `setup_state_id` NOT IN (SELECT DISTINCT `setup_state_id` FROM `qdn_db`.`machine_capability_part_rules`);
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_04sti;

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_04sti, 'F1', 'TSSOP_4.4_EP', 24, 24, 'both', '04STI: F1 TSSOP_4.4_EP, 24L');
SET @s_04sti_tssop44ep_24_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_04sti, 'F1', 'TSSOP_4.4_EP', 28, 28, 'both', '04STI: F1 TSSOP_4.4_EP, 28L');
SET @s_04sti_tssop44ep_28_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_04sti, 'F1', 'TSSOP_4.4_EP', 20, 20, 'both', '04STI: F1 TSSOP_4.4_EP, 20L');
SET @s_04sti_tssop44ep_20_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_04sti, 'F1', 'TSSOP_4.4_EP', 16, 16, 'both', '04STI: F1 TSSOP_4.4_EP, 16L');
SET @s_04sti_tssop44ep_16_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_04sti, 'F1', 'TSSOP_4.4', 28, 28, 'both', '04STI: F1 TSSOP_4.4, 28L');
SET @s_04sti_tssop44_28_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_04sti, 'F1', 'TSSOP_4.4', 8, 8, 'both', '04STI: F1 TSSOP_4.4, 8L');
SET @s_04sti_tssop44_8_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_04sti, 'F1', 'TSSOP_4.4', 20, 20, 'both', '04STI: F1 TSSOP_4.4, 20L');
SET @s_04sti_tssop44_20_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_04sti, 'F1', 'TSSOP_4.4', 14, 14, 'both', '04STI: F1 TSSOP_4.4, 14L');
SET @s_04sti_tssop44_14_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_04sti, 'F1', 'TSSOP_4.4', 24, 24, 'both', '04STI: F1 TSSOP_4.4, 24L');
SET @s_04sti_tssop44_24_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_04sti, 'F1', 'TSSOP_4.4', 16, 16, 'both', '04STI: F1 TSSOP_4.4, 16L');
SET @s_04sti_tssop44_16_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_04sti, 'F1', 'TSSOP_4.4', 38, 38, 'both', '04STI: F1 TSSOP_4.4, 38L');
SET @s_04sti_tssop44_38_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES
  (@m_04sti, 'leadcount', 'setup', 120, 'max'),
  (@m_04sti, 'package_group', 'setup', 120, 'max');

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_04sti, NULL, @s_04sti_tssop44ep_24_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04sti, NULL, @s_04sti_tssop44ep_28_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04sti, NULL, @s_04sti_tssop44ep_20_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04sti, NULL, @s_04sti_tssop44ep_16_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04sti, NULL, @s_04sti_tssop44_28_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04sti, NULL, @s_04sti_tssop44_8_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04sti, NULL, @s_04sti_tssop44_20_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04sti, NULL, @s_04sti_tssop44_14_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04sti, NULL, @s_04sti_tssop44_24_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04sti, NULL, @s_04sti_tssop44_16_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04sti, NULL, @s_04sti_tssop44_38_f1, 'setup', 120, 'bootstrap: no prior state -> setup');

-- 04STI TOTALS: 11 states, 2 axis rule(s), 0 override rows


-- =====================================================
-- 27AT28
-- =====================================================

SET @m_27at28 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '27AT28');

-- Preserve part-routed states; wipe everything else for this machine and rebuild
DELETE FROM `qdn_db`.`machine_setup_states`
WHERE `machine_id` = @m_27at28
  AND `setup_state_id` NOT IN (SELECT DISTINCT `setup_state_id` FROM `qdn_db`.`machine_capability_part_rules`);
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_27at28;

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_27at28, 'F1', 'TSSOP_4.4', 14, 14, 'taping', '27AT28: F1 TSSOP_4.4, 14L');
SET @s_27at28_tssop44_14_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_27at28, 'F1', 'TSSOP_4.4', 16, 16, 'taping', '27AT28: F1 TSSOP_4.4, 16L');
SET @s_27at28_tssop44_16_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_27at28, 'F1', 'TSSOP_4.4_EP', 16, 16, 'taping', '27AT28: F1 TSSOP_4.4_EP, 16L');
SET @s_27at28_tssop44ep_16_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES
  (@m_27at28, 'leadcount', 'setup', 120, 'max'),
  (@m_27at28, 'package_group', 'setup', 120, 'max');

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_27at28, NULL, @s_27at28_tssop44_14_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_27at28, NULL, @s_27at28_tssop44_16_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_27at28, NULL, @s_27at28_tssop44ep_16_f1, 'setup', 120, 'bootstrap: no prior state -> setup');

-- 27AT28 TOTALS: 3 states, 2 axis rule(s), 0 override rows


-- =====================================================
-- 29AT28
-- =====================================================

SET @m_29at28 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '29AT28');

-- Preserve part-routed states; wipe everything else for this machine and rebuild
DELETE FROM `qdn_db`.`machine_setup_states`
WHERE `machine_id` = @m_29at28
  AND `setup_state_id` NOT IN (SELECT DISTINCT `setup_state_id` FROM `qdn_db`.`machine_capability_part_rules`);
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_29at28;

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_29at28, 'F1', 'TSSOP_4.4', 16, 16, 'taping', '29AT28: F1 TSSOP_4.4, 16L');
SET @s_29at28_tssop44_16_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_29at28, 'F1', 'TSSOP_4.4', 14, 14, 'taping', '29AT28: F1 TSSOP_4.4, 14L');
SET @s_29at28_tssop44_14_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_29at28, 'F1', 'TSSOP_4.4', 24, 24, 'taping', '29AT28: F1 TSSOP_4.4, 24L');
SET @s_29at28_tssop44_24_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_29at28, 'F1', 'TSSOP_4.4_EP', 16, 16, 'taping', '29AT28: F1 TSSOP_4.4_EP, 16L');
SET @s_29at28_tssop44ep_16_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_29at28, 'F2', 'TSSOP_4.4_EP', 16, 16, 'taping', '29AT28: F2 TSSOP_4.4_EP, 16L');
SET @s_29at28_tssop44ep_16_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES
  (@m_29at28, 'leadcount', 'setup', 120, 'max'),
  (@m_29at28, 'package_group', 'setup', 120, 'max');

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_29at28, NULL, @s_29at28_tssop44_16_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_29at28, NULL, @s_29at28_tssop44_14_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_29at28, NULL, @s_29at28_tssop44_24_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_29at28, NULL, @s_29at28_tssop44ep_16_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_29at28, NULL, @s_29at28_tssop44ep_16_f2, 'setup', 120, 'bootstrap: no prior state -> setup');

-- Same package+leadcount, factory swap only = free (no factory axis defined)
INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_29at28, @s_29at28_tssop44ep_16_f1, @s_29at28_tssop44ep_16_f2, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_29at28, @s_29at28_tssop44ep_16_f2, @s_29at28_tssop44ep_16_f1, 'none', 0, 'same package/leadcount, factory swap only');

-- 29AT28 TOTALS: 5 states, 2 axis rule(s), 2 override rows


-- =====================================================
-- 02G6L
-- =====================================================

SET @m_02g6l = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '02G6L');

-- Preserve part-routed states; wipe everything else for this machine and rebuild
DELETE FROM `qdn_db`.`machine_setup_states`
WHERE `machine_id` = @m_02g6l
  AND `setup_state_id` NOT IN (SELECT DISTINCT `setup_state_id` FROM `qdn_db`.`machine_capability_part_rules`);
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_02g6l;

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_02g6l, 'F1', 'TSSOP_4.4', 16, 16, 'both', '02G6L: F1 TSSOP_4.4, 16L');
SET @s_02g6l_tssop44_16_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_02g6l, 'F1', 'TSSOP_4.4', 14, 14, 'both', '02G6L: F1 TSSOP_4.4, 14L');
SET @s_02g6l_tssop44_14_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_02g6l, 'F1', 'TSSOP_4.4', 20, 20, 'both', '02G6L: F1 TSSOP_4.4, 20L');
SET @s_02g6l_tssop44_20_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_02g6l, 'F1', 'TSSOP_4.4', 28, 28, 'both', '02G6L: F1 TSSOP_4.4, 28L');
SET @s_02g6l_tssop44_28_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_02g6l, 'F1', 'TSSOP_4.4', 24, 24, 'both', '02G6L: F1 TSSOP_4.4, 24L');
SET @s_02g6l_tssop44_24_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_02g6l, 'F1', 'TSSOP_4.4', 38, 38, 'both', '02G6L: F1 TSSOP_4.4, 38L');
SET @s_02g6l_tssop44_38_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_02g6l, 'F2', 'TSSOP_4.4_EP', 16, 16, 'both', '02G6L: F2 TSSOP_4.4_EP, 16L');
SET @s_02g6l_tssop44ep_16_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_02g6l, 'F2', 'TSSOP_4.4_EP', 24, 24, 'both', '02G6L: F2 TSSOP_4.4_EP, 24L');
SET @s_02g6l_tssop44ep_24_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_02g6l, 'F2', 'TSSOP_4.4_EP', 38, 38, 'both', '02G6L: F2 TSSOP_4.4_EP, 38L');
SET @s_02g6l_tssop44ep_38_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_02g6l, 'F2', 'TSSOP_4.4_EP', 31, 31, 'both', '02G6L: F2 TSSOP_4.4_EP, 31L');
SET @s_02g6l_tssop44ep_31_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_02g6l, 'F2', 'TSSOP_4.4_EP', 28, 28, 'both', '02G6L: F2 TSSOP_4.4_EP, 28L');
SET @s_02g6l_tssop44ep_28_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES
  (@m_02g6l, 'leadcount', 'setup', 120, 'max'),
  (@m_02g6l, 'package_group', 'setup', 120, 'max');

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_02g6l, NULL, @s_02g6l_tssop44_16_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_02g6l, NULL, @s_02g6l_tssop44_14_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_02g6l, NULL, @s_02g6l_tssop44_20_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_02g6l, NULL, @s_02g6l_tssop44_28_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_02g6l, NULL, @s_02g6l_tssop44_24_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_02g6l, NULL, @s_02g6l_tssop44_38_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_02g6l, NULL, @s_02g6l_tssop44ep_16_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_02g6l, NULL, @s_02g6l_tssop44ep_24_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_02g6l, NULL, @s_02g6l_tssop44ep_38_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_02g6l, NULL, @s_02g6l_tssop44ep_31_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_02g6l, NULL, @s_02g6l_tssop44ep_28_f2, 'setup', 120, 'bootstrap: no prior state -> setup');

-- 02G6L TOTALS: 11 states, 2 axis rule(s), 0 override rows


-- =====================================================
-- 34G6L
-- =====================================================

SET @m_34g6l = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '34G6L');

-- Preserve part-routed states; wipe everything else for this machine and rebuild
DELETE FROM `qdn_db`.`machine_setup_states`
WHERE `machine_id` = @m_34g6l
  AND `setup_state_id` NOT IN (SELECT DISTINCT `setup_state_id` FROM `qdn_db`.`machine_capability_part_rules`);
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_34g6l;

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34g6l, 'F1', 'TSSOP_4.4', 14, 14, 'both', '34G6L: F1 TSSOP_4.4, 14L');
SET @s_34g6l_tssop44_14_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34g6l, 'F1', 'TSSOP_4.4', 16, 16, 'both', '34G6L: F1 TSSOP_4.4, 16L');
SET @s_34g6l_tssop44_16_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34g6l, 'F1', 'TSSOP_4.4', 20, 20, 'both', '34G6L: F1 TSSOP_4.4, 20L');
SET @s_34g6l_tssop44_20_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34g6l, 'F1', 'TSSOP_4.4', 38, 38, 'both', '34G6L: F1 TSSOP_4.4, 38L');
SET @s_34g6l_tssop44_38_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34g6l, 'F1', 'TSSOP_4.4', 24, 24, 'both', '34G6L: F1 TSSOP_4.4, 24L');
SET @s_34g6l_tssop44_24_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34g6l, 'F1', 'TSSOP_4.4', 28, 28, 'both', '34G6L: F1 TSSOP_4.4, 28L');
SET @s_34g6l_tssop44_28_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34g6l, 'F1', 'TSSOP_4.4_EP', 20, 20, 'both', '34G6L: F1 TSSOP_4.4_EP, 20L');
SET @s_34g6l_tssop44ep_20_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34g6l, 'F2', 'TSSOP_4.4_EP', 20, 20, 'both', '34G6L: F2 TSSOP_4.4_EP, 20L');
SET @s_34g6l_tssop44ep_20_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34g6l, 'F1', 'TSSOP_4.4_EP', 16, 16, 'both', '34G6L: F1 TSSOP_4.4_EP, 16L');
SET @s_34g6l_tssop44ep_16_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34g6l, 'F2', 'TSSOP_4.4_EP', 16, 16, 'both', '34G6L: F2 TSSOP_4.4_EP, 16L');
SET @s_34g6l_tssop44ep_16_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34g6l, 'F1', 'TSSOP_4.4_EP', 24, 24, 'both', '34G6L: F1 TSSOP_4.4_EP, 24L');
SET @s_34g6l_tssop44ep_24_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34g6l, 'F2', 'TSSOP_4.4_EP', 24, 24, 'both', '34G6L: F2 TSSOP_4.4_EP, 24L');
SET @s_34g6l_tssop44ep_24_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34g6l, 'F1', 'TSSOP_4.4_EP', 28, 28, 'both', '34G6L: F1 TSSOP_4.4_EP, 28L');
SET @s_34g6l_tssop44ep_28_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34g6l, 'F2', 'TSSOP_4.4_EP', 28, 28, 'both', '34G6L: F2 TSSOP_4.4_EP, 28L');
SET @s_34g6l_tssop44ep_28_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES
  (@m_34g6l, 'leadcount', 'setup', 120, 'max'),
  (@m_34g6l, 'package_group', 'setup', 120, 'max');

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_34g6l, NULL, @s_34g6l_tssop44_14_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34g6l, NULL, @s_34g6l_tssop44_16_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34g6l, NULL, @s_34g6l_tssop44_20_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34g6l, NULL, @s_34g6l_tssop44_38_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34g6l, NULL, @s_34g6l_tssop44_24_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34g6l, NULL, @s_34g6l_tssop44_28_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34g6l, NULL, @s_34g6l_tssop44ep_20_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34g6l, NULL, @s_34g6l_tssop44ep_20_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34g6l, NULL, @s_34g6l_tssop44ep_16_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34g6l, NULL, @s_34g6l_tssop44ep_16_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34g6l, NULL, @s_34g6l_tssop44ep_24_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34g6l, NULL, @s_34g6l_tssop44ep_24_f2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34g6l, NULL, @s_34g6l_tssop44ep_28_f1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34g6l, NULL, @s_34g6l_tssop44ep_28_f2, 'setup', 120, 'bootstrap: no prior state -> setup');

-- Same package+leadcount, factory swap only = free (no factory axis defined)
INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_34g6l, @s_34g6l_tssop44ep_20_f1, @s_34g6l_tssop44ep_20_f2, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_34g6l, @s_34g6l_tssop44ep_20_f2, @s_34g6l_tssop44ep_20_f1, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_34g6l, @s_34g6l_tssop44ep_16_f1, @s_34g6l_tssop44ep_16_f2, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_34g6l, @s_34g6l_tssop44ep_16_f2, @s_34g6l_tssop44ep_16_f1, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_34g6l, @s_34g6l_tssop44ep_24_f1, @s_34g6l_tssop44ep_24_f2, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_34g6l, @s_34g6l_tssop44ep_24_f2, @s_34g6l_tssop44ep_24_f1, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_34g6l, @s_34g6l_tssop44ep_28_f1, @s_34g6l_tssop44ep_28_f2, 'none', 0, 'same package/leadcount, factory swap only'),
  (@m_34g6l, @s_34g6l_tssop44ep_28_f2, @s_34g6l_tssop44ep_28_f1, 'none', 0, 'same package/leadcount, factory swap only');

-- 34G6L TOTALS: 14 states, 2 axis rule(s), 8 override rows


-- =====================================================
-- 16G6L
-- =====================================================

SET @m_16g6l = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '16G6L');

-- Preserve part-routed states; wipe everything else for this machine and rebuild
DELETE FROM `qdn_db`.`machine_setup_states`
WHERE `machine_id` = @m_16g6l
  AND `setup_state_id` NOT IN (SELECT DISTINCT `setup_state_id` FROM `qdn_db`.`machine_capability_part_rules`);
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_16g6l;

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_16g6l, 'F2', 'TSSOP-W', 48, 48, 'both', '16G6L: F2 TSSOP-W, 48L');
SET @s_16g6l_tssop-w_48_f2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_16g6l, NULL, @s_16g6l_tssop-w_48_f2, 'none', 0, 'no setup/conversion needed on anything');

-- 16G6L TOTALS: 1 states, no cost


-- =====================================================
-- 16STI
-- =====================================================

SET @m_16sti = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '16STI');

-- Preserve part-routed states; wipe everything else for this machine and rebuild
DELETE FROM `qdn_db`.`machine_setup_states`
WHERE `machine_id` = @m_16sti
  AND `setup_state_id` NOT IN (SELECT DISTINCT `setup_state_id` FROM `qdn_db`.`machine_capability_part_rules`);
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_16sti;

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_16sti, 'F1', 'TSSOP_4.4', 24, 24, 'tubing', '16STI: F1 TSSOP_4.4, 24L');
SET @s_16sti_tssop44_24_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_16sti, 'F1', 'TSSOP_4.4', 16, 16, 'tubing', '16STI: F1 TSSOP_4.4, 16L');
SET @s_16sti_tssop44_16_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_16sti, 'F1', 'TSSOP_4.4', 20, 20, 'tubing', '16STI: F1 TSSOP_4.4, 20L');
SET @s_16sti_tssop44_20_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_16sti, NULL, @s_16sti_tssop44_24_f1, 'none', 0, 'no setup/conversion needed on anything'),
  (@m_16sti, NULL, @s_16sti_tssop44_16_f1, 'none', 0, 'no setup/conversion needed on anything'),
  (@m_16sti, NULL, @s_16sti_tssop44_20_f1, 'none', 0, 'no setup/conversion needed on anything');

-- 16STI TOTALS: 3 states, no cost


-- =====================================================
-- 70AT28
-- =====================================================

SET @m_70at28 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '70AT28');

-- Preserve part-routed states; wipe everything else for this machine and rebuild
DELETE FROM `qdn_db`.`machine_setup_states`
WHERE `machine_id` = @m_70at28
  AND `setup_state_id` NOT IN (SELECT DISTINCT `setup_state_id` FROM `qdn_db`.`machine_capability_part_rules`);
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_70at28;

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_70at28, 'F1', 'LCC', 8, 8, 'taping', '70AT28: F1 LCC, 8L');
SET @s_70at28_lcc_8_f1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_70at28, NULL, @s_70at28_lcc_8_f1, 'none', 0, 'no setup/conversion needed on anything');

-- 70AT28 TOTALS: 1 states, no cost