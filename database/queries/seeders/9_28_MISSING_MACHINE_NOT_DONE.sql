-- ===================================================== 
-- 05ST60 (axis-based)
-- =====================================================

SET @m_05st60 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '05ST60');

DELETE FROM `qdn_db`.`machine_setup_states` WHERE `machine_id` = @m_05st60 AND `setup_state_id` NOT IN (SELECT DISTINCT `setup_state_id` FROM `qdn_db`.`machine_capability_part_rules`);
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_05st60;

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'QFN', '5X7', NULL, 38, 38, 'taping', '05ST60: F2 QFN 38 5X7');
SET @s_05st60_qfn_38_5x7_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'LFCSP', '7X5', 0.75, 32, 32, 'taping', '05ST60: F2 LFCSP 32 7X5');
SET @s_05st60_lfcsp_32_7x5_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'QFN', '5X8', NULL, 52, 52, 'taping', '05ST60: F2 QFN 52 5X8');
SET @s_05st60_qfn_52_5x8_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'QFN', '5X8', NULL, 44, 44, 'taping', '05ST60: F2 QFN 44 5X8');
SET @s_05st60_qfn_44_5x8_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'QFN', '5X8', NULL, 40, 40, 'taping', '05ST60: F2 QFN 40 5X8');
SET @s_05st60_qfn_40_5x8_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'LFCSP_SS', '5X8', NULL, 40, 40, 'taping', '05ST60: F2 LFCSP_SS 40 5X8');
SET @s_05st60_lfcspss_40_5x8_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F1', 'LFCSP', '2X2.6', NULL, 14, 14, 'taping', '05ST60: F1 LFCSP 14 2X2.6');
SET @s_05st60_lfcsp_14_2x26_f1_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'LFCSP', '7X11', 0.75, 64, 64, 'taping', '05ST60: F2 LFCSP 64 7X11');
SET @s_05st60_lfcsp_64_7x11_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F1', 'LFCSP_RT', '2X2', 0.58, 12, 12, 'taping', '05ST60: F1 LFCSP_RT 12 2X2');
SET @s_05st60_lfcsprt_12_2x2_f1_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'QFN', '7X11', NULL, 64, 64, 'taping', '05ST60: F2 QFN 64 7X11');
SET @s_05st60_qfn_64_7x11_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'QFN', '7X11', NULL, 58, 58, 'taping', '05ST60: F2 QFN 58 7X11');
SET @s_05st60_qfn_58_7x11_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'QFN', '5X9', NULL, 38, 38, 'taping', '05ST60: F2 QFN 38 5X9');
SET @s_05st60_qfn_38_5x9_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'QFN', '7X8', NULL, 52, 52, 'taping', '05ST60: F2 QFN 52 7X8');
SET @s_05st60_qfn_52_7x8_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'QFN', '7X8', NULL, 46, 46, 'taping', '05ST60: F2 QFN 46 7X8');
SET @s_05st60_qfn_46_7x8_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'QFN', '4X7', NULL, 44, 44, 'taping', '05ST60: F2 QFN 44 4X7');
SET @s_05st60_qfn_44_4x7_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'QFN', '4X6', NULL, 26, 26, 'taping', '05ST60: F2 QFN 26 4X6');
SET @s_05st60_qfn_26_4x6_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'DFN', '7X4', NULL, 24, 24, 'taping', '05ST60: F2 DFN 24 7X4');
SET @s_05st60_dfn_24_7x4_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'DFN', '7X4', NULL, 32, 32, 'taping', '05ST60: F2 DFN 32 7X4');
SET @s_05st60_dfn_32_7x4_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_05st60, 'F2', 'QFN', '3X6', NULL, 28, 28, 'taping', '05ST60: F2 QFN 28 3X6');
SET @s_05st60_qfn_28_3x6_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES
  (@m_05st60, 'body_size', 'setup', 120, 'max'),
  (@m_05st60, 'factory', 'setup', 120, 'max');

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_05st60, NULL, @s_05st60_qfn_38_5x7_f2_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_lfcsp_32_7x5_f2_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_qfn_52_5x8_f2_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_qfn_44_5x8_f2_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_qfn_40_5x8_f2_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_lfcspss_40_5x8_f2_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_lfcsp_14_2x26_f1_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_lfcsp_64_7x11_f2_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_lfcsprt_12_2x2_f1_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_qfn_64_7x11_f2_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_qfn_58_7x11_f2_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_qfn_38_5x9_f2_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_qfn_52_7x8_f2_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_qfn_46_7x8_f2_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_qfn_44_4x7_f2_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_qfn_26_4x6_f2_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_dfn_24_7x4_f2_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_dfn_32_7x4_f2_tap, 'setup', 120, 'bootstrap'),
  (@m_05st60, NULL, @s_05st60_qfn_28_3x6_f2_tap, 'setup', 120, 'bootstrap');



-- =====================================================
-- 38HSI400i (fully free)
-- =====================================================

SET @m_38hsi400i = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '38HSI400i');

DELETE FROM `qdn_db`.`machine_setup_states` WHERE `machine_id` = @m_38hsi400i AND `setup_state_id` NOT IN (SELECT DISTINCT `setup_state_id` FROM `qdn_db`.`machine_capability_part_rules`);
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_38hsi400i;

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_38hsi400i, 'F2', 'LQFN', '2X2', NULL, 12, 12, 'taping', '38HSI400i: F2 LQFN 12 2X2');
SET @s_38hsi400i_lqfn_12_2x2_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_38hsi400i, 'F2', 'DFN', '2X2', NULL, 6, 6, 'taping', '38HSI400i: F2 DFN 6 2X2');
SET @s_38hsi400i_dfn_6_2x2_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_38hsi400i, NULL, @s_38hsi400i_lqfn_12_2x2_f2_tap, 'none', 0, 'free'),
  (@m_38hsi400i, NULL, @s_38hsi400i_dfn_6_2x2_f2_tap, 'none', 0, 'free');

-- 38HSI400i TOTALS: 2 states, free


-- =====================================================
-- 39HSI400i (fully free)
-- =====================================================

SET @m_39hsi400i = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '39HSI400i');

DELETE FROM `qdn_db`.`machine_setup_states` WHERE `machine_id` = @m_39hsi400i AND `setup_state_id` NOT IN (SELECT DISTINCT `setup_state_id` FROM `qdn_db`.`machine_capability_part_rules`);
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_39hsi400i;

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_39hsi400i, 'F2', 'DFN', '3X2', NULL, 10, 10, 'taping', '39HSI400i: F2 DFN 10 3X2');
SET @s_39hsi400i_dfn_10_3x2_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_39hsi400i, 'F2', 'LFCSP', '3X2', 0.75, 15, 15, 'taping', '39HSI400i: F2 LFCSP 15 3X2');
SET @s_39hsi400i_lfcsp_15_3x2_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_39hsi400i, 'F2', 'DFN', '2X3', NULL, 6, 6, 'taping', '39HSI400i: F2 DFN 6 2X3');
SET @s_39hsi400i_dfn_6_2x3_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_39hsi400i, 'F2', 'DFN', '2X3', NULL, 8, 8, 'taping', '39HSI400i: F2 DFN 8 2X3');
SET @s_39hsi400i_dfn_8_2x3_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_39hsi400i, NULL, @s_39hsi400i_dfn_10_3x2_f2_tap, 'none', 0, 'free'),
  (@m_39hsi400i, NULL, @s_39hsi400i_lfcsp_15_3x2_f2_tap, 'none', 0, 'free'),
  (@m_39hsi400i, NULL, @s_39hsi400i_dfn_6_2x3_f2_tap, 'none', 0, 'free'),
  (@m_39hsi400i, NULL, @s_39hsi400i_dfn_8_2x3_f2_tap, 'none', 0, 'free');

-- 39HSI400i TOTALS: 4 states, free


-- =====================================================
-- 38HSI400i (fully free)
-- =====================================================

SET @m_38hsi400i = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '38HSI400i');

DELETE FROM `qdn_db`.`machine_setup_states` WHERE `machine_id` = @m_38hsi400i AND `setup_state_id` NOT IN (SELECT DISTINCT `setup_state_id` FROM `qdn_db`.`machine_capability_part_rules`);
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_38hsi400i;

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_38hsi400i, 'F2', 'LQFN', '2X2', NULL, 12, 12, 'taping', '38HSI400i: F2 LQFN 12 2X2');
SET @s_38hsi400i_lqfn_12_2x2_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_38hsi400i, 'F2', 'DFN', '2X2', NULL, 6, 6, 'taping', '38HSI400i: F2 DFN 6 2X2');
SET @s_38hsi400i_dfn_6_2x2_f2_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_38hsi400i, NULL, @s_38hsi400i_lqfn_12_2x2_f2_tap, 'none', 0, 'free'),
  (@m_38hsi400i, NULL, @s_38hsi400i_dfn_6_2x2_f2_tap, 'none', 0, 'free');

-- 38HSI400i TOTALS: 2 states, free
