-- DONE 

-- =====================================================
-- 35HSI250 -- taping only
-- body_size axis: conversion 360min when body size changes (3x3/2x3/4x3)
-- no setup needed otherwise -- package/leadcount swaps within same body size are free
-- =====================================================

SET @m_35hsi250 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '35HSI250');

-- ---------------------------------------------------
-- States
-- ---------------------------------------------------

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F1', 'DFN', '3X3', 8, 8, 'taping', '35HSI250: F1 DFN 3X3, 8L');
SET @f1_dfn8 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F1', 'LFCSP', '3X3', 8, 8, 'taping', '35HSI250: F1 LFCSP 3X3, 8L');
SET @f1_lfcsp8 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F1', 'LFCSP', '3X3', 12, 12, 'taping', '35HSI250: F1 LFCSP 3X3, 12L');
SET @f1_lfcsp12 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F1', 'LFCSP', '3X3', 10, 10, 'taping', '35HSI250: F1 LFCSP 3X3, 10L');
SET @f1_lfcsp10 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F1', 'LFCSP', '3X3', 16, 16, 'taping', '35HSI250: F1 LFCSP 3X3, 16L');
SET @f1_lfcsp16 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F1', 'DFN', '3X3', 10, 10, 'taping', '35HSI250: F1 DFN 3X3, 10L');
SET @f1_dfn10 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F1', 'DFN', '3X3', 12, 12, 'taping', '35HSI250: F1 DFN 3X3, 12L');
SET @f1_dfn12 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F1', 'LGA', '3X3', 24, 24, 'taping', '35HSI250: F1 LGA 3X3, 24L');
SET @f1_lga24 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F2', 'QFN', '3X3', 16, 16, 'taping', '35HSI250: F2 QFN 3X3, 16L');
SET @f2_qfn16_3x3 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F2', 'DFN', '2X3', 3, 3, 'taping', '35HSI250: F2 DFN 2X3, 3L');
SET @f2_dfn3 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F2', 'QFN', '2X3', 10, 10, 'taping', '35HSI250: F2 QFN 2X3, 10L');
SET @f2_qfn10 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F2', 'DFN', '2X3', 12, 12, 'taping', '35HSI250: F2 DFN 2X3, 12L');
SET @f2_dfn12_2x3 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F2', 'DFN', '2X3', 6, 6, 'taping', '35HSI250: F2 DFN 2X3, 6L');
SET @f2_dfn6 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F2', 'DFN', '2X3', 10, 10, 'taping', '35HSI250: F2 DFN 2X3, 10L');
SET @f2_dfn10_2x3 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F2', 'LFCSP', '2X3', 10, 10, 'taping', '35HSI250: F2 LFCSP 2X3, 10L');
SET @f2_lfcsp10_2x3 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F2', 'DFN', '2X3', 8, 8, 'taping', '35HSI250: F2 DFN 2X3, 8L');
SET @f2_dfn8_2x3 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F2', 'LFCSP', '2X3', 8, 8, 'taping', '35HSI250: F2 LFCSP 2X3, 8L');
SET @f2_lfcsp8_2x3 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F2', 'LQFN', '2X3', 16, 16, 'taping', '35HSI250: F2 LQFN 2X3, 16L');
SET @f2_lqfn16 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F2', 'DFN', '4X3', 14, 14, 'taping', '35HSI250: F2 DFN 4X3, 14L');
SET @f2_dfn14 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F2', 'QFN', '4X3', 18, 18, 'taping', '35HSI250: F2 QFN 4X3, 18L');
SET @f2_qfn18 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F2', 'QFN', '4X3', 20, 20, 'taping', '35HSI250: F2 QFN 4X3, 20L');
SET @f2_qfn20 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F2', 'DFN', '4X3', 12, 12, 'taping', '35HSI250: F2 DFN 4X3, 12L');
SET @f2_dfn12_4x3 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F2', 'DFN', '4X3', 16, 16, 'taping', '35HSI250: F2 DFN 4X3, 16L');
SET @f2_dfn16 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_35hsi250, 'F2', 'QFN', '4X3', 17, 17, 'taping', '35HSI250: F2 QFN 4X3, 17L');
SET @f2_qfn17 = LAST_INSERT_ID();

-- ---------------------------------------------------
-- Axis rule: body_size only
-- ---------------------------------------------------

INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES (@m_35hsi250, 'body_size', 'conversion', 360, 'max');

-- ---------------------------------------------------
-- Bootstrap: first assignment on this machine (matches body_size axis cost)
-- ---------------------------------------------------

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_35hsi250, NULL, @f1_dfn8, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f1_lfcsp8, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f1_lfcsp12, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f1_lfcsp10, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f1_lfcsp16, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f1_dfn10, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f1_dfn12, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f1_lga24, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f2_qfn16_3x3, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f2_dfn3, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f2_qfn10, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f2_dfn12_2x3, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f2_dfn6, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f2_dfn10_2x3, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f2_lfcsp10_2x3, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f2_dfn8_2x3, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f2_lfcsp8_2x3, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f2_lqfn16, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f2_dfn14, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f2_qfn18, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f2_qfn20, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f2_dfn12_4x3, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f2_dfn16, 'conversion', 360, 'bootstrap: no prior state -> conversion'),
  (@m_35hsi250, NULL, @f2_qfn17, 'conversion', 360, 'bootstrap: no prior state -> conversion');

-- ---------------------------------------------------
-- Same-body-size swaps = free (package/leadcount change alone never costs)
-- ---------------------------------------------------

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_35hsi250, @f1_dfn8, @f1_lfcsp8, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp8, @f1_dfn8, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn8, @f1_lfcsp12, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp12, @f1_dfn8, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn8, @f1_lfcsp10, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp10, @f1_dfn8, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn8, @f1_lfcsp16, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp16, @f1_dfn8, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn8, @f1_dfn10, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn10, @f1_dfn8, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn8, @f1_dfn12, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn12, @f1_dfn8, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn8, @f1_lga24, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lga24, @f1_dfn8, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn8, @f2_qfn16_3x3, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn16_3x3, @f1_dfn8, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp8, @f1_lfcsp12, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp12, @f1_lfcsp8, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp8, @f1_lfcsp10, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp10, @f1_lfcsp8, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp8, @f1_lfcsp16, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp16, @f1_lfcsp8, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp8, @f1_dfn10, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn10, @f1_lfcsp8, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp8, @f1_dfn12, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn12, @f1_lfcsp8, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp8, @f1_lga24, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lga24, @f1_lfcsp8, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp8, @f2_qfn16_3x3, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn16_3x3, @f1_lfcsp8, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp12, @f1_lfcsp10, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp10, @f1_lfcsp12, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp12, @f1_lfcsp16, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp16, @f1_lfcsp12, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp12, @f1_dfn10, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn10, @f1_lfcsp12, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp12, @f1_dfn12, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn12, @f1_lfcsp12, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp12, @f1_lga24, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lga24, @f1_lfcsp12, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp12, @f2_qfn16_3x3, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn16_3x3, @f1_lfcsp12, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp10, @f1_lfcsp16, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp16, @f1_lfcsp10, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp10, @f1_dfn10, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn10, @f1_lfcsp10, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp10, @f1_dfn12, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn12, @f1_lfcsp10, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp10, @f1_lga24, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lga24, @f1_lfcsp10, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp10, @f2_qfn16_3x3, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn16_3x3, @f1_lfcsp10, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp16, @f1_dfn10, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn10, @f1_lfcsp16, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp16, @f1_dfn12, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn12, @f1_lfcsp16, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp16, @f1_lga24, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lga24, @f1_lfcsp16, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lfcsp16, @f2_qfn16_3x3, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn16_3x3, @f1_lfcsp16, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn10, @f1_dfn12, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn12, @f1_dfn10, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn10, @f1_lga24, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lga24, @f1_dfn10, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn10, @f2_qfn16_3x3, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn16_3x3, @f1_dfn10, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn12, @f1_lga24, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lga24, @f1_dfn12, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_dfn12, @f2_qfn16_3x3, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn16_3x3, @f1_dfn12, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f1_lga24, @f2_qfn16_3x3, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn16_3x3, @f1_lga24, 'none', 0, 'same body size 3X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn3, @f2_qfn10, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn10, @f2_dfn3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn3, @f2_dfn12_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn12_2x3, @f2_dfn3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn3, @f2_dfn6, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn6, @f2_dfn3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn3, @f2_dfn10_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn10_2x3, @f2_dfn3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn3, @f2_lfcsp10_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lfcsp10_2x3, @f2_dfn3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn3, @f2_dfn8_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn8_2x3, @f2_dfn3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn3, @f2_lfcsp8_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lfcsp8_2x3, @f2_dfn3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn3, @f2_lqfn16, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lqfn16, @f2_dfn3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn10, @f2_dfn12_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn12_2x3, @f2_qfn10, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn10, @f2_dfn6, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn6, @f2_qfn10, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn10, @f2_dfn10_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn10_2x3, @f2_qfn10, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn10, @f2_lfcsp10_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lfcsp10_2x3, @f2_qfn10, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn10, @f2_dfn8_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn8_2x3, @f2_qfn10, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn10, @f2_lfcsp8_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lfcsp8_2x3, @f2_qfn10, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn10, @f2_lqfn16, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lqfn16, @f2_qfn10, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn12_2x3, @f2_dfn6, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn6, @f2_dfn12_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn12_2x3, @f2_dfn10_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn10_2x3, @f2_dfn12_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn12_2x3, @f2_lfcsp10_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lfcsp10_2x3, @f2_dfn12_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn12_2x3, @f2_dfn8_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn8_2x3, @f2_dfn12_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn12_2x3, @f2_lfcsp8_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lfcsp8_2x3, @f2_dfn12_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn12_2x3, @f2_lqfn16, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lqfn16, @f2_dfn12_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn6, @f2_dfn10_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn10_2x3, @f2_dfn6, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn6, @f2_lfcsp10_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lfcsp10_2x3, @f2_dfn6, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn6, @f2_dfn8_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn8_2x3, @f2_dfn6, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn6, @f2_lfcsp8_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lfcsp8_2x3, @f2_dfn6, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn6, @f2_lqfn16, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lqfn16, @f2_dfn6, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn10_2x3, @f2_lfcsp10_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lfcsp10_2x3, @f2_dfn10_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn10_2x3, @f2_dfn8_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn8_2x3, @f2_dfn10_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn10_2x3, @f2_lfcsp8_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lfcsp8_2x3, @f2_dfn10_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn10_2x3, @f2_lqfn16, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lqfn16, @f2_dfn10_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lfcsp10_2x3, @f2_dfn8_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn8_2x3, @f2_lfcsp10_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lfcsp10_2x3, @f2_lfcsp8_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lfcsp8_2x3, @f2_lfcsp10_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lfcsp10_2x3, @f2_lqfn16, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lqfn16, @f2_lfcsp10_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn8_2x3, @f2_lfcsp8_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lfcsp8_2x3, @f2_dfn8_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn8_2x3, @f2_lqfn16, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lqfn16, @f2_dfn8_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lfcsp8_2x3, @f2_lqfn16, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_lqfn16, @f2_lfcsp8_2x3, 'none', 0, 'same body size 2X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn14, @f2_qfn18, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn18, @f2_dfn14, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn14, @f2_qfn20, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn20, @f2_dfn14, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn14, @f2_dfn12_4x3, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn12_4x3, @f2_dfn14, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn14, @f2_dfn16, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn16, @f2_dfn14, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn14, @f2_qfn17, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn17, @f2_dfn14, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn18, @f2_qfn20, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn20, @f2_qfn18, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn18, @f2_dfn12_4x3, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn12_4x3, @f2_qfn18, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn18, @f2_dfn16, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn16, @f2_qfn18, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn18, @f2_qfn17, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn17, @f2_qfn18, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn20, @f2_dfn12_4x3, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn12_4x3, @f2_qfn20, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn20, @f2_dfn16, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn16, @f2_qfn20, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn20, @f2_qfn17, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn17, @f2_qfn20, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn12_4x3, @f2_dfn16, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn16, @f2_dfn12_4x3, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn12_4x3, @f2_qfn17, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn17, @f2_dfn12_4x3, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_dfn16, @f2_qfn17, 'none', 0, 'same body size 4X3, package/leadcount swap only'),
  (@m_35hsi250, @f2_qfn17, @f2_dfn16, 'none', 0, 'same body size 4X3, package/leadcount swap only');

-- DONE 

-- =====================================================
-- 04MV853A — F1, both taping+tubing, leadcount 8/14/16 (SOIC_N), 16 (SOIC_N_EP)
-- Leadcount change = 120min setup; no conversion
-- =====================================================

SET @m_04mv853a = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '04MV853A (ADGT)');

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_04mv853a, 'F1', 'SOIC_N', 8, 8, 'both', '04MV853A: F1 SOIC_N, 8L');
SET @s_04mv_sn8 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_04mv853a, 'F1', 'SOIC_N', 14, 14, 'both', '04MV853A: F1 SOIC_N, 14L');
SET @s_04mv_sn14 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_04mv853a, 'F1', 'SOIC_N', 16, 16, 'both', '04MV853A: F1 SOIC_N, 16L');
SET @s_04mv_sn16 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_04mv853a, 'F1', 'SOIC_N_EP', 16, 16, 'both', '04MV853A: F1 SOIC_N_EP, 16L');
SET @s_04mv_snep16 = LAST_INSERT_ID();

-- Axis rule: leadcount only
INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES (@m_04mv853a, 'leadcount', 'setup', 120, 'max');

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_04mv853a, NULL, @s_04mv_sn8, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04mv853a, NULL, @s_04mv_sn14, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04mv853a, NULL, @s_04mv_sn16, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04mv853a, NULL, @s_04mv_snep16, 'setup', 120, 'bootstrap: no prior state -> setup'),

  -- same leadcount 16L, package swap only = free (no package_group axis defined)
  (@m_04mv853a, @s_04mv_sn16, @s_04mv_snep16, 'none', 0, 'same leadcount 16L, package swap only'),
  (@m_04mv853a, @s_04mv_snep16, @s_04mv_sn16, 'none', 0, 'same leadcount 16L, package swap only');

-- DONE

-- =====================================================
-- Machine 230 -- restructure from 5 collapsed states to 60 granular states
-- (package x leadcount x taping/tubing), so leadcount/package/ramp changes
-- are each individually costable via axis rules
-- =====================================================

-- Remove the 5 old collapsed states (leadcount_include + process_type='both')
-- Safe: no transition_rules reference these state ids yet
DELETE FROM `qdn_db`.`machine_setup_states` WHERE `setup_state_id` IN (563, 564, 565, 566, 567);
-- ---------------------------------------------------
-- 60 new states
-- ---------------------------------------------------

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP', 14, 14, 'taping', '230: F1 TSSOP, 14L, taping');
SET @s230_tssop_14_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP', 14, 14, 'tubing', '230: F1 TSSOP, 14L, tubing');
SET @s230_tssop_14_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP', 16, 16, 'taping', '230: F1 TSSOP, 16L, taping');
SET @s230_tssop_16_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP', 16, 16, 'tubing', '230: F1 TSSOP, 16L, tubing');
SET @s230_tssop_16_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP', 20, 20, 'taping', '230: F1 TSSOP, 20L, taping');
SET @s230_tssop_20_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP', 20, 20, 'tubing', '230: F1 TSSOP, 20L, tubing');
SET @s230_tssop_20_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP', 24, 24, 'taping', '230: F1 TSSOP, 24L, taping');
SET @s230_tssop_24_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP', 24, 24, 'tubing', '230: F1 TSSOP, 24L, tubing');
SET @s230_tssop_24_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP', 28, 28, 'taping', '230: F1 TSSOP, 28L, taping');
SET @s230_tssop_28_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP', 28, 28, 'tubing', '230: F1 TSSOP, 28L, tubing');
SET @s230_tssop_28_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP', 48, 48, 'taping', '230: F1 TSSOP, 48L, taping');
SET @s230_tssop_48_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP', 48, 48, 'tubing', '230: F1 TSSOP, 48L, tubing');
SET @s230_tssop_48_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4', 14, 14, 'taping', '230: F1 TSSOP_4.4, 14L, taping');
SET @s230_tssop44_14_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4', 14, 14, 'tubing', '230: F1 TSSOP_4.4, 14L, tubing');
SET @s230_tssop44_14_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4', 16, 16, 'taping', '230: F1 TSSOP_4.4, 16L, taping');
SET @s230_tssop44_16_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4', 16, 16, 'tubing', '230: F1 TSSOP_4.4, 16L, tubing');
SET @s230_tssop44_16_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4', 20, 20, 'taping', '230: F1 TSSOP_4.4, 20L, taping');
SET @s230_tssop44_20_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4', 20, 20, 'tubing', '230: F1 TSSOP_4.4, 20L, tubing');
SET @s230_tssop44_20_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4', 24, 24, 'taping', '230: F1 TSSOP_4.4, 24L, taping');
SET @s230_tssop44_24_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4', 24, 24, 'tubing', '230: F1 TSSOP_4.4, 24L, tubing');
SET @s230_tssop44_24_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4', 28, 28, 'taping', '230: F1 TSSOP_4.4, 28L, taping');
SET @s230_tssop44_28_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4', 28, 28, 'tubing', '230: F1 TSSOP_4.4, 28L, tubing');
SET @s230_tssop44_28_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4', 48, 48, 'taping', '230: F1 TSSOP_4.4, 48L, taping');
SET @s230_tssop44_48_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4', 48, 48, 'tubing', '230: F1 TSSOP_4.4, 48L, tubing');
SET @s230_tssop44_48_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4_EP', 14, 14, 'taping', '230: F1 TSSOP_4.4_EP, 14L, taping');
SET @s230_tssop44ep_14_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4_EP', 14, 14, 'tubing', '230: F1 TSSOP_4.4_EP, 14L, tubing');
SET @s230_tssop44ep_14_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4_EP', 16, 16, 'taping', '230: F1 TSSOP_4.4_EP, 16L, taping');
SET @s230_tssop44ep_16_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4_EP', 16, 16, 'tubing', '230: F1 TSSOP_4.4_EP, 16L, tubing');
SET @s230_tssop44ep_16_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4_EP', 20, 20, 'taping', '230: F1 TSSOP_4.4_EP, 20L, taping');
SET @s230_tssop44ep_20_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4_EP', 20, 20, 'tubing', '230: F1 TSSOP_4.4_EP, 20L, tubing');
SET @s230_tssop44ep_20_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4_EP', 24, 24, 'taping', '230: F1 TSSOP_4.4_EP, 24L, taping');
SET @s230_tssop44ep_24_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4_EP', 24, 24, 'tubing', '230: F1 TSSOP_4.4_EP, 24L, tubing');
SET @s230_tssop44ep_24_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4_EP', 28, 28, 'taping', '230: F1 TSSOP_4.4_EP, 28L, taping');
SET @s230_tssop44ep_28_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4_EP', 28, 28, 'tubing', '230: F1 TSSOP_4.4_EP, 28L, tubing');
SET @s230_tssop44ep_28_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4_EP', 48, 48, 'taping', '230: F1 TSSOP_4.4_EP, 48L, taping');
SET @s230_tssop44ep_48_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_4.4_EP', 48, 48, 'tubing', '230: F1 TSSOP_4.4_EP, 48L, tubing');
SET @s230_tssop44ep_48_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_6.1', 14, 14, 'taping', '230: F1 TSSOP_6.1, 14L, taping');
SET @s230_tssop61_14_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_6.1', 14, 14, 'tubing', '230: F1 TSSOP_6.1, 14L, tubing');
SET @s230_tssop61_14_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_6.1', 16, 16, 'taping', '230: F1 TSSOP_6.1, 16L, taping');
SET @s230_tssop61_16_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_6.1', 16, 16, 'tubing', '230: F1 TSSOP_6.1, 16L, tubing');
SET @s230_tssop61_16_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_6.1', 20, 20, 'taping', '230: F1 TSSOP_6.1, 20L, taping');
SET @s230_tssop61_20_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_6.1', 20, 20, 'tubing', '230: F1 TSSOP_6.1, 20L, tubing');
SET @s230_tssop61_20_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_6.1', 24, 24, 'taping', '230: F1 TSSOP_6.1, 24L, taping');
SET @s230_tssop61_24_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_6.1', 24, 24, 'tubing', '230: F1 TSSOP_6.1, 24L, tubing');
SET @s230_tssop61_24_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_6.1', 28, 28, 'taping', '230: F1 TSSOP_6.1, 28L, taping');
SET @s230_tssop61_28_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_6.1', 28, 28, 'tubing', '230: F1 TSSOP_6.1, 28L, tubing');
SET @s230_tssop61_28_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_6.1', 48, 48, 'taping', '230: F1 TSSOP_6.1, 48L, taping');
SET @s230_tssop61_48_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP_6.1', 48, 48, 'tubing', '230: F1 TSSOP_6.1, 48L, tubing');
SET @s230_tssop61_48_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP-W', 14, 14, 'taping', '230: F1 TSSOP-W, 14L, taping');
SET @s230_tssopw_14_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP-W', 14, 14, 'tubing', '230: F1 TSSOP-W, 14L, tubing');
SET @s230_tssopw_14_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP-W', 16, 16, 'taping', '230: F1 TSSOP-W, 16L, taping');
SET @s230_tssopw_16_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP-W', 16, 16, 'tubing', '230: F1 TSSOP-W, 16L, tubing');
SET @s230_tssopw_16_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP-W', 20, 20, 'taping', '230: F1 TSSOP-W, 20L, taping');
SET @s230_tssopw_20_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP-W', 20, 20, 'tubing', '230: F1 TSSOP-W, 20L, tubing');
SET @s230_tssopw_20_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP-W', 24, 24, 'taping', '230: F1 TSSOP-W, 24L, taping');
SET @s230_tssopw_24_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP-W', 24, 24, 'tubing', '230: F1 TSSOP-W, 24L, tubing');
SET @s230_tssopw_24_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP-W', 28, 28, 'taping', '230: F1 TSSOP-W, 28L, taping');
SET @s230_tssopw_28_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP-W', 28, 28, 'tubing', '230: F1 TSSOP-W, 28L, tubing');
SET @s230_tssopw_28_tub = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP-W', 48, 48, 'taping', '230: F1 TSSOP-W, 48L, taping');
SET @s230_tssopw_48_tap = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (230, 'F1', 'TSSOP-W', 48, 48, 'tubing', '230: F1 TSSOP-W, 48L, tubing');
SET @s230_tssopw_48_tub = LAST_INSERT_ID();

-- ---------------------------------------------------
-- Axis rules: leadcount, package_group, process_type -- all 120min setup, MAX combination
-- ---------------------------------------------------

INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES
  (230, 'leadcount', 'setup', 120, 'max'),
  (230, 'package_group', 'setup', 120, 'max'),
  (230, 'process_type', 'setup', 120, 'max');

-- ---------------------------------------------------
-- Bootstrap: first assignment on this machine, one row per state
-- ---------------------------------------------------

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (230, NULL, @s230_tssop_14_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop_14_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop_16_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop_16_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop_20_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop_20_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop_24_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop_24_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop_28_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop_28_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop_48_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop_48_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44_14_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44_14_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44_16_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44_16_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44_20_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44_20_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44_24_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44_24_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44_28_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44_28_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44_48_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44_48_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44ep_14_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44ep_14_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44ep_16_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44ep_16_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44ep_20_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44ep_20_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44ep_24_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44ep_24_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44ep_28_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44ep_28_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44ep_48_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop44ep_48_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop61_14_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop61_14_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop61_16_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop61_16_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop61_20_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop61_20_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop61_24_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop61_24_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop61_28_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop61_28_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop61_48_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssop61_48_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssopw_14_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssopw_14_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssopw_16_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssopw_16_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssopw_20_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssopw_20_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssopw_24_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssopw_24_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssopw_28_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssopw_28_tub, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssopw_48_tap, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (230, NULL, @s230_tssopw_48_tub, 'setup', 120, 'bootstrap: no prior state -> setup');

-- DONE

-- =====================================================
-- 29HSI400T — F2, body size 3x3, taping+tubing
-- Packages: DFN, QFN, LFCSP — leadcount change = 120min setup; package change alone = free
-- No conversion ever
-- =====================================================

SET @m_29hsi400t = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '29HSI400T');


-- ---------------------------------------------------
-- States (one per package+leadcount combo, per the list given)
-- ---------------------------------------------------

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_29hsi400t, 'F2', 'DFN', '3X3', 10, 10, 'both', '29HSI400T: DFN 3x3, 10L');
SET @s_dfn10 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_29hsi400t, 'F2', 'QFN', '3X3', 16, 16, 'both', '29HSI400T: QFN 3x3, 16L');
SET @s_qfn16 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_29hsi400t, 'F2', 'DFN', '3X3', 8, 8, 'both', '29HSI400T: DFN 3x3, 8L');
SET @s_dfn8 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_29hsi400t, 'F2', 'DFN', '3X3', 12, 12, 'both', '29HSI400T: DFN 3x3, 12L');
SET @s_dfn12 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_29hsi400t, 'F2', 'QFN', '3X3', 12, 12, 'both', '29HSI400T: QFN 3x3, 12L');
SET @s_qfn12 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_29hsi400t, 'F2', 'QFN', '3X3', 20, 20, 'both', '29HSI400T: QFN 3x3, 20L');
SET @s_qfn20 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_29hsi400t, 'F2', 'LFCSP', '3X3', 10, 10, 'both', '29HSI400T: LFCSP 3x3, 10L');
SET @s_lfcsp10 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_29hsi400t, 'F2', 'LFCSP', '3X3', 8, 8, 'both', '29HSI400T: LFCSP 3x3, 8L');
SET @s_lfcsp8 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_29hsi400t, 'F2', 'LFCSP', '3X3', 16, 16, 'both', '29HSI400T: LFCSP 3x3, 16L');
SET @s_lfcsp16 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_29hsi400t, 'F2', 'LFCSP', '3X3', 24, 24, 'both', '29HSI400T: LFCSP 3x3, 24L');
SET @s_lfcsp24 = LAST_INSERT_ID();


-- ---------------------------------------------------
-- Axis rule: leadcount only
-- ---------------------------------------------------

INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES (@m_29hsi400t, 'leadcount', 'setup', 120, 'max');


-- ---------------------------------------------------
-- Bootstrap: first assignment on this machine
-- ---------------------------------------------------

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_29hsi400t, NULL, @s_dfn10,   'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_29hsi400t, NULL, @s_qfn16,   'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_29hsi400t, NULL, @s_dfn8,    'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_29hsi400t, NULL, @s_dfn12,   'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_29hsi400t, NULL, @s_qfn12,   'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_29hsi400t, NULL, @s_qfn20,   'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_29hsi400t, NULL, @s_lfcsp10, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_29hsi400t, NULL, @s_lfcsp8,  'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_29hsi400t, NULL, @s_lfcsp16, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_29hsi400t, NULL, @s_lfcsp24, 'setup', 120, 'bootstrap: no prior state -> setup'),

  -- Same-leadcount package swaps = free (no package_group axis rule defined)
  (@m_29hsi400t, @s_dfn8,  @s_lfcsp8,  'none', 0, 'same leadcount 8L, package swap only'),
  (@m_29hsi400t, @s_lfcsp8, @s_dfn8,   'none', 0, 'same leadcount 8L, package swap only'),
  (@m_29hsi400t, @s_dfn10, @s_lfcsp10, 'none', 0, 'same leadcount 10L, package swap only'),
  (@m_29hsi400t, @s_lfcsp10, @s_dfn10, 'none', 0, 'same leadcount 10L, package swap only'),
  (@m_29hsi400t, @s_dfn12, @s_qfn12,   'none', 0, 'same leadcount 12L, package swap only'),
  (@m_29hsi400t, @s_qfn12, @s_dfn12,   'none', 0, 'same leadcount 12L, package swap only'),
  (@m_29hsi400t, @s_qfn16, @s_lfcsp16, 'none', 0, 'same leadcount 16L, package swap only'),
  (@m_29hsi400t, @s_lfcsp16, @s_qfn16, 'none', 0, 'same leadcount 16L, package swap only');


--DONE DONE 

-- =====================================================
-- 01V12 — F1, LFCSP, leadcount 4/6/8/10/16/40, taping only
-- Leadcount change = 120min setup; no conversion ever
-- =====================================================

SET @m_01v12 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '01V12');

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_01v12, 'F1', 'LFCSP', 4, 4, 'taping', '01V12: F1 LFCSP, 4L, reel');
SET @s_01v12_4 = LAST_INSERT_ID();


INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_01v12, 'F1', 'LFCSP', 6, 6, 'taping', '01V12: F1 LFCSP, 6L, reel');
SET @s_01v12_6 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_01v12, 'F1', 'LFCSP', 8, 8, 'taping', '01V12: F1 LFCSP, 8L, reel');
SET @s_01v12_8 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_01v12, 'F1', 'LFCSP', 10, 10, 'taping', '01V12: F1 LFCSP, 10L, reel');
SET @s_01v12_10 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_01v12, 'F1', 'LFCSP', 16, 16, 'taping', '01V12: F1 LFCSP, 16L, reel');
SET @s_01v12_16 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_01v12, 'F1', 'LFCSP', 40, 40, 'taping', '01V12: F1 LFCSP, 40L, reel');
SET @s_01v12_40 = LAST_INSERT_ID();

-- Axis rule: leadcount only
INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES (@m_01v12, 'leadcount', 'setup', 120, 'max');

-- Bootstrap: first assignment on this machine
INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_01v12, NULL, @s_01v12_4, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_01v12, NULL, @s_01v12_6, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_01v12, NULL, @s_01v12_8, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_01v12, NULL, @s_01v12_10, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_01v12, NULL, @s_01v12_16, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_01v12, NULL, @s_01v12_40, 'setup', 120, 'bootstrap: no prior state -> setup');

-- DONE 

-- =====================================================
-- 05HSI200 — F1, SOT-89, leadcount 3 or 4, no setup/conversion ever
-- =====================================================

SET @m_05hsi200 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '05HSI200');

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (@m_05hsi200, 'F1', 'SOT-89', '3,4', 'both', '05HSI200: F1 SOT-89, leadcounts 3/4, no setup/conversion needed');
SET @s_05hsi200 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES (@m_05hsi200, NULL, @s_05hsi200, 'none', 0, 'no setup/conversion needed on anything');

-- DONE DONE

-- =====================================================
-- 31HSI250 — F1 SC70 (leadcount 4/5/6/8), F2 TSOT (leadcount 5/6/8)
-- Leadcount change = 120min setup; package change = 360min conversion
-- Package and factory always change together here (SC70=F1 only, TSOT=F2 only),
-- so MAX combination rule handles cross-package transitions correctly with no overrides
-- =====================================================

SET @m_31hsi250 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '31HSI250');

-- F1 SC70 states
INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_31hsi250, 'F1', 'SC70', 4, 4, 'taping', '31HSI250: F1 SC70, 4L, reel');
SET @s_31_sc70_4 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_31hsi250, 'F1', 'SC70', 5, 5, 'taping', '31HSI250: F1 SC70, 5L, reel');
SET @s_31_sc70_5 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_31hsi250, 'F1', 'SC70', 6, 6, 'taping', '31HSI250: F1 SC70, 6L, reel');
SET @s_31_sc70_6 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_31hsi250, 'F1', 'SC70', 8, 8, 'taping', '31HSI250: F1 SC70, 8L, reel');
SET @s_31_sc70_8 = LAST_INSERT_ID();

-- F2 TSOT states
INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_31hsi250, 'F2', 'TSOT', 5, 5, 'taping', '31HSI250: F2 TSOT, 5L, reel');
SET @s_31_tsot_5 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_31hsi250, 'F2', 'TSOT', 6, 6, 'taping', '31HSI250: F2 TSOT, 6L, reel');
SET @s_31_tsot_6 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_31hsi250, 'F2', 'TSOT', 8, 8, 'taping', '31HSI250: F2 TSOT, 8L, reel');
SET @s_31_tsot_8 = LAST_INSERT_ID();

-- Axis rules
INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES
  (@m_31hsi250, 'leadcount', 'setup', 120, 'max'),
  (@m_31hsi250, 'package_group', 'conversion', 360, 'max');

-- Bootstrap: first assignment on this machine
INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_31hsi250, NULL, @s_31_sc70_4, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_31hsi250, NULL, @s_31_sc70_5, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_31hsi250, NULL, @s_31_sc70_6, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_31hsi250, NULL, @s_31_sc70_8, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_31hsi250, NULL, @s_31_tsot_5, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_31hsi250, NULL, @s_31_tsot_6, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_31hsi250, NULL, @s_31_tsot_8, 'setup', 120, 'bootstrap: no prior state -> setup');


-- =====================================================
-- 32HSI250 — SC70, F1 or F2, leadcount 4/5/6/8
-- Leadcount change = 120min setup; no conversion ever
-- Factory swap must be explicitly free (no factory axis rule defined)
-- =====================================================

SET @m_32hsi250 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '32HSI250');

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_32hsi250, 'F1', 'SC70', 4, 4, 'taping', '32HSI250: F1 SC70, 4L, reel');
SET @s_32_f1_4 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_32hsi250, 'F1', 'SC70', 5, 5, 'taping', '32HSI250: F1 SC70, 5L, reel');
SET @s_32_f1_5 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_32hsi250, 'F1', 'SC70', 6, 6, 'taping', '32HSI250: F1 SC70, 6L, reel');
SET @s_32_f1_6 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_32hsi250, 'F1', 'SC70', 8, 8, 'taping', '32HSI250: F1 SC70, 8L, reel');
SET @s_32_f1_8 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_32hsi250, 'F2', 'SC70', 4, 4, 'taping', '32HSI250: F2 SC70, 4L, reel');
SET @s_32_f2_4 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_32hsi250, 'F2', 'SC70', 5, 5, 'taping', '32HSI250: F2 SC70, 5L, reel');
SET @s_32_f2_5 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_32hsi250, 'F2', 'SC70', 6, 6, 'taping', '32HSI250: F2 SC70, 6L, reel');
SET @s_32_f2_6 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_32hsi250, 'F2', 'SC70', 8, 8, 'taping', '32HSI250: F2 SC70, 8L, reel');
SET @s_32_f2_8 = LAST_INSERT_ID();

-- Axis rule: leadcount only
INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES (@m_32hsi250, 'leadcount', 'setup', 120, 'max');

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_32hsi250, NULL, @s_32_f1_4, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_32hsi250, NULL, @s_32_f1_5, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_32hsi250, NULL, @s_32_f1_6, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_32hsi250, NULL, @s_32_f1_8, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_32hsi250, NULL, @s_32_f2_4, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_32hsi250, NULL, @s_32_f2_5, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_32hsi250, NULL, @s_32_f2_6, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_32hsi250, NULL, @s_32_f2_8, 'setup', 120, 'bootstrap: no prior state -> setup'),

  (@m_32hsi250, @s_32_f1_4, @s_32_f2_4, 'none', 0, 'same leadcount, factory swap only'),
  (@m_32hsi250, @s_32_f2_4, @s_32_f1_4, 'none', 0, 'same leadcount, factory swap only'),
  (@m_32hsi250, @s_32_f1_5, @s_32_f2_5, 'none', 0, 'same leadcount, factory swap only'),
  (@m_32hsi250, @s_32_f2_5, @s_32_f1_5, 'none', 0, 'same leadcount, factory swap only'),
  (@m_32hsi250, @s_32_f1_6, @s_32_f2_6, 'none', 0, 'same leadcount, factory swap only'),
  (@m_32hsi250, @s_32_f2_6, @s_32_f1_6, 'none', 0, 'same leadcount, factory swap only'),
  (@m_32hsi250, @s_32_f1_8, @s_32_f2_8, 'none', 0, 'same leadcount, factory swap only'),
  (@m_32hsi250, @s_32_f2_8, @s_32_f1_8, 'none', 0, 'same leadcount, factory swap only');


-- DONE

-- =====================================================
-- 37HSI250 — taping only, no conversion (setup only)
-- Group A (leadcount 3): factory change = 120min; package swap within same factory = free
-- Group B (F1, SOT_23, leadcount 8/6/5): leadcount change = 120min
-- Crossing Group A <-> Group B = always free, regardless of factory/leadcount diff
-- =====================================================

SET @m_37hsi250 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '37HSI250');


-- ---------------------------------------------------
-- States
-- ---------------------------------------------------

-- Group A (leadcount 3)
INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_37hsi250, 'F2', 'SOT-23', 3, 3, 'taping', '37HSI250: F2 SOT-23, 3L, reel');
SET @s_a1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_37hsi250, 'F1', 'SOT_23_3', 3, 3, 'taping', '37HSI250: F1 SOT_23_3, 3L, reel');
SET @s_a2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_37hsi250, 'F2', 'SOT_23_3', 3, 3, 'taping', '37HSI250: F2 SOT_23_3, 3L, reel');
SET @s_a3 = LAST_INSERT_ID();

-- Group B (F1, SOT_23, leadcount 8/6/5)
INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_37hsi250, 'F1', 'SOT_23', 8, 8, 'taping', '37HSI250: F1 SOT_23, 8L, reel');
SET @s_b1 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_37hsi250, 'F1', 'SOT_23', 6, 6, 'taping', '37HSI250: F1 SOT_23, 6L, reel');
SET @s_b2 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_37hsi250, 'F1', 'SOT_23', 5, 5, 'taping', '37HSI250: F1 SOT_23, 5L, reel');
SET @s_b3 = LAST_INSERT_ID();


-- ---------------------------------------------------
-- Bootstrap: first assignment on this machine
-- ---------------------------------------------------

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_37hsi250, NULL, @s_a1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_37hsi250, NULL, @s_a2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_37hsi250, NULL, @s_a3, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_37hsi250, NULL, @s_b1, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_37hsi250, NULL, @s_b2, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_37hsi250, NULL, @s_b3, 'setup', 120, 'bootstrap: no prior state -> setup'),

  (@m_37hsi250, @s_a1, @s_a2, 'setup', 120, 'group A: factory change F2->F1'),
  (@m_37hsi250, @s_a2, @s_a1, 'setup', 120, 'group A: factory change F1->F2'),
  (@m_37hsi250, @s_a1, @s_a3, 'none', 0, 'group A: same factory F2, package swap only'),
  (@m_37hsi250, @s_a3, @s_a1, 'none', 0, 'group A: same factory F2, package swap only'),
  (@m_37hsi250, @s_a2, @s_a3, 'setup', 120, 'group A: factory change F1->F2'),
  (@m_37hsi250, @s_a3, @s_a2, 'setup', 120, 'group A: factory change F2->F1'),

  (@m_37hsi250, @s_b1, @s_b2, 'setup', 120, 'group B: leadcount change'),
  (@m_37hsi250, @s_b2, @s_b1, 'setup', 120, 'group B: leadcount change'),
  (@m_37hsi250, @s_b1, @s_b3, 'setup', 120, 'group B: leadcount change'),
  (@m_37hsi250, @s_b3, @s_b1, 'setup', 120, 'group B: leadcount change'),
  (@m_37hsi250, @s_b2, @s_b3, 'setup', 120, 'group B: leadcount change'),
  (@m_37hsi250, @s_b3, @s_b2, 'setup', 120, 'group B: leadcount change'),

  (@m_37hsi250, @s_a1, @s_b1, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_b1, @s_a1, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_a1, @s_b2, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_b2, @s_a1, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_a1, @s_b3, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_b3, @s_a1, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_a2, @s_b1, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_b1, @s_a2, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_a2, @s_b2, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_b2, @s_a2, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_a2, @s_b3, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_b3, @s_a2, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_a3, @s_b1, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_b1, @s_a3, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_a3, @s_b2, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_b2, @s_a3, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_a3, @s_b3, 'none', 0, 'crossing group A<->B, always free'),
  (@m_37hsi250, @s_b3, @s_a3, 'none', 0, 'crossing group A<->B, always free');


-- DONE

-- =====================================================
-- 01HSTNR — F2, TO-92, taping only, no setup/conversion ever
-- =====================================================

SET @m_01hstnr = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '01HSTNR');

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `process_type`, `remarks`)
VALUES (@m_01hstnr, 'F2', 'TO-92', 'taping', '01HSTNR: F2 TO-92, reel, no setup/conversion needed');
SET @s_01hstnr = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_transition_rules (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES (@m_01hstnr, NULL, @s_01hstnr, 'none', 0, 'no setup/conversion needed on anything');

-- DONE
-- DONE
-- DONE

-- =====================================================
-- 04HSI400T & 12HSI400i
-- Setup 120min (2hrs) ONLY on factory change. Taping only.
-- 04HSI400T also has an LGA state on F1, reachable only by parts
-- whose name contains ADRF, ADG1, or ADG2 (via machine_capability_part_rules)
-- =====================================================
select * from qdn_db.package_list where package_type = 'TO-92';
select * from qdn_db.package_list where package_type like '%SOT_23%';
select * from qdn_db.package_list where package_type like '%SOT_23%';
select * from qdn_db.package_list where devicename like '%ADR5041WARTZ-R7%';
select * from qdn_db.package_list where devicename like '%ADR381ARTZ-R2%';


SET @m_04hsi400t = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '04HSI400T');
SET @m_12hsi400i = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '12HSI400i');


-- ---------------------------------------------------
-- 04HSI400T
-- ---------------------------------------------------

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `process_type`, `remarks`)
VALUES (@m_04hsi400t, 'F1', 'LFCSP', '3X3', 0.75, 'taping', '04HSI400T: F1 LFCSP 3x3x.75, reel');
SET @s_04_lfcsp75 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `process_type`, `remarks`)
VALUES (@m_04hsi400t, 'F1', 'LFCSP', '3X3', 0.85, 'taping', '04HSI400T: F1 LFCSP 3x3x.85, reel');
SET @s_04_lfcsp85 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `process_type`, `remarks`)
VALUES (@m_04hsi400t, 'F1', 'LFCSP', '3X3', 0.95, 'taping', '04HSI400T: F1 LFCSP 3x3x.95, reel');
SET @s_04_lfcsp95 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `body_size`, `process_type`, `remarks`)
VALUES (@m_04hsi400t, 'F1', 'LGA', '3X3', 'taping', '04HSI400T: F1 LGA 3x3, ADRF/ADG1/ADG2 parts only (override)');
SET @s_04_lga = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `body_size`, `process_type`, `remarks`)
VALUES (@m_04hsi400t, 'F2', 'QFN', '3X3', 'taping', '04HSI400T: F2 QFN 3x3, reel');
SET @s_04_qfn = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `body_size`, `process_type`, `remarks`)
VALUES (@m_04hsi400t, 'F2', 'DFN', '3X3', 'taping', '04HSI400T: F2 DFN 3x3, reel');
SET @s_04_dfn = LAST_INSERT_ID();

-- Part-name override: only ADRF/ADG1/ADG2-prefixed parts route to the LGA state
INSERT INTO qdn_db.machine_capability_part_rules (`setup_state_id`, `match_type`, `match_value`)
VALUES
  (@s_04_lga, 'contains', 'ADRF'),
  (@s_04_lga, 'contains', 'ADG1'),
  (@s_04_lga, 'contains', 'ADG2');

-- Axis rule: factory change = 120min
INSERT INTO qdn_db.machine_transition_axis_rules (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES (@m_04hsi400t, 'factory', 'setup', 120, 'max');

-- Bootstrap: first assignment on this machine
INSERT INTO qdn_db.machine_transition_rules (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_04hsi400t, NULL, @s_04_lfcsp75, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04hsi400t, NULL, @s_04_lfcsp85, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04hsi400t, NULL, @s_04_lfcsp95, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04hsi400t, NULL, @s_04_lga,     'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04hsi400t, NULL, @s_04_qfn,     'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_04hsi400t, NULL, @s_04_dfn,     'setup', 120, 'bootstrap: no prior state -> setup'),

  (@m_04hsi400t, @s_04_lfcsp75, @s_04_lfcsp85, 'none', 0, 'same factory F1, package/thickness swap only'),
  (@m_04hsi400t, @s_04_lfcsp85, @s_04_lfcsp75, 'none', 0, 'same factory F1, package/thickness swap only'),
  (@m_04hsi400t, @s_04_lfcsp75, @s_04_lfcsp95, 'none', 0, 'same factory F1, package/thickness swap only'),
  (@m_04hsi400t, @s_04_lfcsp95, @s_04_lfcsp75, 'none', 0, 'same factory F1, package/thickness swap only'),
  (@m_04hsi400t, @s_04_lfcsp85, @s_04_lfcsp95, 'none', 0, 'same factory F1, package/thickness swap only'),
  (@m_04hsi400t, @s_04_lfcsp95, @s_04_lfcsp85, 'none', 0, 'same factory F1, package/thickness swap only'),
  (@m_04hsi400t, @s_04_lfcsp75, @s_04_lga,     'none', 0, 'same factory F1, package/thickness swap only'),
  (@m_04hsi400t, @s_04_lga,     @s_04_lfcsp75, 'none', 0, 'same factory F1, package/thickness swap only'),
  (@m_04hsi400t, @s_04_lfcsp85, @s_04_lga,     'none', 0, 'same factory F1, package/thickness swap only'),
  (@m_04hsi400t, @s_04_lga,     @s_04_lfcsp85, 'none', 0, 'same factory F1, package/thickness swap only'),
  (@m_04hsi400t, @s_04_lfcsp95, @s_04_lga,     'none', 0, 'same factory F1, package/thickness swap only'),
  (@m_04hsi400t, @s_04_lga,     @s_04_lfcsp95, 'none', 0, 'same factory F1, package/thickness swap only'),

  (@m_04hsi400t, @s_04_qfn, @s_04_dfn, 'none', 0, 'same factory F2, package swap only'),
  (@m_04hsi400t, @s_04_dfn, @s_04_qfn, 'none', 0, 'same factory F2, package swap only');


-- ---------------------------------------------------
-- 12HSI400i (no LGA state — F1 LFCSP thickness variants only)
-- ---------------------------------------------------

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `process_type`, `remarks`)
VALUES (@m_12hsi400i, 'F1', 'LFCSP', '3X3', 0.75, 'taping', '12HSI400i: F1 LFCSP 3x3x.75, reel');
SET @s_12_lfcsp75 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `process_type`, `remarks`)
VALUES (@m_12hsi400i, 'F1', 'LFCSP', '3X3', 0.85, 'taping', '12HSI400i: F1 LFCSP 3x3x.85, reel');
SET @s_12_lfcsp85 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`, `process_type`, `remarks`)
VALUES (@m_12hsi400i, 'F1', 'LFCSP', '3X3', 0.95, 'taping', '12HSI400i: F1 LFCSP 3x3x.95, reel');
SET @s_12_lfcsp95 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `body_size`, `process_type`, `remarks`)
VALUES (@m_12hsi400i, 'F2', 'QFN', '3X3', 'taping', '12HSI400i: F2 QFN 3x3, reel');
SET @s_12_qfn = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `body_size`, `process_type`, `remarks`)
VALUES (@m_12hsi400i, 'F2', 'DFN', '3X3', 'taping', '12HSI400i: F2 DFN 3x3, reel');
SET @s_12_dfn = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_transition_axis_rules (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES (@m_12hsi400i, 'factory', 'setup', 120, 'max');

INSERT INTO qdn_db.machine_transition_rules (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_12hsi400i, NULL, @s_12_lfcsp75, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_12hsi400i, NULL, @s_12_lfcsp85, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_12hsi400i, NULL, @s_12_lfcsp95, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_12hsi400i, NULL, @s_12_qfn,     'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_12hsi400i, NULL, @s_12_dfn,     'setup', 120, 'bootstrap: no prior state -> setup'),

  (@m_12hsi400i, @s_12_lfcsp75, @s_12_lfcsp85, 'none', 0, 'same factory F1, thickness swap only'),
  (@m_12hsi400i, @s_12_lfcsp85, @s_12_lfcsp75, 'none', 0, 'same factory F1, thickness swap only'),
  (@m_12hsi400i, @s_12_lfcsp75, @s_12_lfcsp95, 'none', 0, 'same factory F1, thickness swap only'),
  (@m_12hsi400i, @s_12_lfcsp95, @s_12_lfcsp75, 'none', 0, 'same factory F1, thickness swap only'),
  (@m_12hsi400i, @s_12_lfcsp85, @s_12_lfcsp95, 'none', 0, 'same factory F1, thickness swap only'),
  (@m_12hsi400i, @s_12_lfcsp95, @s_12_lfcsp85, 'none', 0, 'same factory F1, thickness swap only'),

  (@m_12hsi400i, @s_12_qfn, @s_12_dfn, 'none', 0, 'same factory F2, package swap only'),
  (@m_12hsi400i, @s_12_dfn, @s_12_qfn, 'none', 0, 'same factory F2, package swap only');