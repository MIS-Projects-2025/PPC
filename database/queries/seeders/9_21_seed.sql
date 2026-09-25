-- =====================================================
-- 02LEDCON — SOIC_N, Lot_Type='LC', taping+tubing, no setup/conversion ever
-- Leadcount 8: F1 and F2. Leadcount 16, 14: F1 only.
-- =====================================================

SET @m_02ledcon = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '02LEDCON');
INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `lot_type`, `process_type`, `remarks`)
VALUES (@m_02ledcon, 'F1', 'SOIC_N', 8, 8, 'LC', 'both', '02LEDCON: F1 SOIC_N, 8L, LC lot type');
SET @s_02led_f1_8 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `lot_type`, `process_type`, `remarks`)
VALUES (@m_02ledcon, 'F2', 'SOIC_N', 8, 8, 'LC', 'both', '02LEDCON: F2 SOIC_N, 8L, LC lot type');
SET @s_02led_f2_8 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `lot_type`, `process_type`, `remarks`)
VALUES (@m_02ledcon, 'F1', 'SOIC_N', 16, 16, 'LC', 'both', '02LEDCON: F1 SOIC_N, 16L, LC lot type');
SET @s_02led_f1_16 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `lot_type`, `process_type`, `remarks`)
VALUES (@m_02ledcon, 'F1', 'SOIC_N', 14, 14, 'LC', 'both', '02LEDCON: F1 SOIC_N, 14L, LC lot type');
SET @s_02led_f1_14 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_02ledcon, NULL, @s_02led_f1_8,  'none', 0, 'no setup/conversion needed on anything'),
  (@m_02ledcon, NULL, @s_02led_f2_8,  'none', 0, 'no setup/conversion needed on anything'),
  (@m_02ledcon, NULL, @s_02led_f1_16, 'none', 0, 'no setup/conversion needed on anything'),
  (@m_02ledcon, NULL, @s_02led_f1_14, 'none', 0, 'no setup/conversion needed on anything');

  -- =====================================================
-- 50G6L — SSOP, leadcount 16/20/24/28/36/44/48, F1 and F2, taping+tubing
-- Leadcount change = 120min setup; factory/package never cost
-- =====================================================

SET @m_50g6l = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '50G6L');

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_50g6l, 'F1', 'SSOP', 16, 16, 'both', '50G6L: F1 SSOP, 16L');
SET @s_50_f1_16 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_50g6l, 'F1', 'SSOP', 20, 20, 'both', '50G6L: F1 SSOP, 20L');
SET @s_50_f1_20 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_50g6l, 'F1', 'SSOP', 24, 24, 'both', '50G6L: F1 SSOP, 24L');
SET @s_50_f1_24 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_50g6l, 'F1', 'SSOP', 28, 28, 'both', '50G6L: F1 SSOP, 28L');
SET @s_50_f1_28 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_50g6l, 'F1', 'SSOP', 36, 36, 'both', '50G6L: F1 SSOP, 36L');
SET @s_50_f1_36 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_50g6l, 'F1', 'SSOP', 44, 44, 'both', '50G6L: F1 SSOP, 44L');
SET @s_50_f1_44 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_50g6l, 'F1', 'SSOP', 48, 48, 'both', '50G6L: F1 SSOP, 48L');
SET @s_50_f1_48 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_50g6l, 'F2', 'SSOP', 16, 16, 'both', '50G6L: F2 SSOP, 16L');
SET @s_50_f2_16 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_50g6l, 'F2', 'SSOP', 20, 20, 'both', '50G6L: F2 SSOP, 20L');
SET @s_50_f2_20 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_50g6l, 'F2', 'SSOP', 24, 24, 'both', '50G6L: F2 SSOP, 24L');
SET @s_50_f2_24 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_50g6l, 'F2', 'SSOP', 28, 28, 'both', '50G6L: F2 SSOP, 28L');
SET @s_50_f2_28 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_50g6l, 'F2', 'SSOP', 36, 36, 'both', '50G6L: F2 SSOP, 36L');
SET @s_50_f2_36 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_50g6l, 'F2', 'SSOP', 44, 44, 'both', '50G6L: F2 SSOP, 44L');
SET @s_50_f2_44 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_50g6l, 'F2', 'SSOP', 48, 48, 'both', '50G6L: F2 SSOP, 48L');
SET @s_50_f2_48 = LAST_INSERT_ID();

-- Axis rule: leadcount only
INSERT INTO `qdn_db`.`machine_transition_axis_rules` (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES (@m_50g6l, 'leadcount', 'setup', 120, 'max');

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_50g6l, NULL, @s_50_f1_16, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_50g6l, NULL, @s_50_f1_20, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_50g6l, NULL, @s_50_f1_24, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_50g6l, NULL, @s_50_f1_28, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_50g6l, NULL, @s_50_f1_36, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_50g6l, NULL, @s_50_f1_44, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_50g6l, NULL, @s_50_f1_48, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_50g6l, NULL, @s_50_f2_16, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_50g6l, NULL, @s_50_f2_20, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_50g6l, NULL, @s_50_f2_24, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_50g6l, NULL, @s_50_f2_28, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_50g6l, NULL, @s_50_f2_36, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_50g6l, NULL, @s_50_f2_44, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_50g6l, NULL, @s_50_f2_48, 'setup', 120, 'bootstrap: no prior state -> setup'),

  -- Same-leadcount factory swap = free (no factory axis rule defined for this machine)
  (@m_50g6l, @s_50_f1_16, @s_50_f2_16, 'none', 0, 'same leadcount, factory swap only'),
  (@m_50g6l, @s_50_f2_16, @s_50_f1_16, 'none', 0, 'same leadcount, factory swap only'),
  (@m_50g6l, @s_50_f1_20, @s_50_f2_20, 'none', 0, 'same leadcount, factory swap only'),
  (@m_50g6l, @s_50_f2_20, @s_50_f1_20, 'none', 0, 'same leadcount, factory swap only'),
  (@m_50g6l, @s_50_f1_24, @s_50_f2_24, 'none', 0, 'same leadcount, factory swap only'),
  (@m_50g6l, @s_50_f2_24, @s_50_f1_24, 'none', 0, 'same leadcount, factory swap only'),
  (@m_50g6l, @s_50_f1_28, @s_50_f2_28, 'none', 0, 'same leadcount, factory swap only'),
  (@m_50g6l, @s_50_f2_28, @s_50_f1_28, 'none', 0, 'same leadcount, factory swap only'),
  (@m_50g6l, @s_50_f1_36, @s_50_f2_36, 'none', 0, 'same leadcount, factory swap only'),
  (@m_50g6l, @s_50_f2_36, @s_50_f1_36, 'none', 0, 'same leadcount, factory swap only'),
  (@m_50g6l, @s_50_f1_44, @s_50_f2_44, 'none', 0, 'same leadcount, factory swap only'),
  (@m_50g6l, @s_50_f2_44, @s_50_f1_44, 'none', 0, 'same leadcount, factory swap only'),
  (@m_50g6l, @s_50_f1_48, @s_50_f2_48, 'none', 0, 'same leadcount, factory swap only'),
  (@m_50g6l, @s_50_f2_48, @s_50_f1_48, 'none', 0, 'same leadcount, factory swap only');

  -- =====================================================
-- 01SRM — F1, SOIC_N, 8L, taping+tubing, no setup/conversion ever
-- =====================================================

SET @m_01srm = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '01SRMXD244');
INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_01srm, 'F1', 'SOIC_N', 8, 8, 'both', '01SRM: F1 SOIC_N, 8L, no setup/conversion needed');
SET @s_01srm = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES (@m_01srm, NULL, @s_01srm, 'none', 0, 'no setup/conversion needed on anything');

select * from qdn_db.machine_list where machine_num = '58at28';

select * from qdn_db.machine_setup_states where machine_id = 260;
select * from qdn_db.machine_transition_axis_rules where machine_id = 260;

-- =====================================================
-- 58AT28 — REDO: delete legacy F1-only/taping-only/costed states, reseed clean
-- New spec: QSOP 20/16/28, SOIC_N_EP 8, SOIC_N 16/8/14 — all F1/F2, reel+tube, no setup/conversion ever
-- =====================================================

SET @m_58at28 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '58AT28');

-- Cascades to machine_transition_rules, machine_transition_rule_exceptions, machine_capability_part_rules
DELETE FROM `qdn_db`.`machine_setup_states` WHERE `machine_id` = @m_58at28;
-- Not FK-linked to setup_states, needs its own delete
DELETE FROM `qdn_db`.`machine_transition_axis_rules` WHERE `machine_id` = @m_58at28;


-- ---------------------------------------------------
-- States: 7 package/leadcount combos x F1/F2 = 14 states
-- ---------------------------------------------------

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_58at28, 'F1', 'QSOP', 20, 20, 'both', '58AT28: F1 QSOP, 20L');
SET @s_f1_qsop20 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_58at28, 'F1', 'QSOP', 16, 16, 'both', '58AT28: F1 QSOP, 16L');
SET @s_f1_qsop16 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_58at28, 'F1', 'QSOP', 28, 28, 'both', '58AT28: F1 QSOP, 28L');
SET @s_f1_qsop28 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_58at28, 'F1', 'SOIC_N_EP', 8, 8, 'both', '58AT28: F1 SOIC_N_EP, 8L');
SET @s_f1_snep8 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_58at28, 'F1', 'SOIC_N', 16, 16, 'both', '58AT28: F1 SOIC_N, 16L');
SET @s_f1_sn16 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_58at28, 'F1', 'SOIC_N', 8, 8, 'both', '58AT28: F1 SOIC_N, 8L');
SET @s_f1_sn8 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_58at28, 'F1', 'SOIC_N', 14, 14, 'both', '58AT28: F1 SOIC_N, 14L');
SET @s_f1_sn14 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_58at28, 'F2', 'QSOP', 20, 20, 'both', '58AT28: F2 QSOP, 20L');
SET @s_f2_qsop20 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_58at28, 'F2', 'QSOP', 16, 16, 'both', '58AT28: F2 QSOP, 16L');
SET @s_f2_qsop16 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_58at28, 'F2', 'QSOP', 28, 28, 'both', '58AT28: F2 QSOP, 28L');
SET @s_f2_qsop28 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_58at28, 'F2', 'SOIC_N_EP', 8, 8, 'both', '58AT28: F2 SOIC_N_EP, 8L');
SET @s_f2_snep8 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_58at28, 'F2', 'SOIC_N', 16, 16, 'both', '58AT28: F2 SOIC_N, 16L');
SET @s_f2_sn16 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_58at28, 'F2', 'SOIC_N', 8, 8, 'both', '58AT28: F2 SOIC_N, 8L');
SET @s_f2_sn8 = LAST_INSERT_ID();

INSERT INTO `qdn_db`.`machine_setup_states` (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_58at28, 'F2', 'SOIC_N', 14, 14, 'both', '58AT28: F2 SOIC_N, 14L');
SET @s_f2_sn14 = LAST_INSERT_ID();


-- ---------------------------------------------------
-- No setup/conversion ever, on anything
-- ---------------------------------------------------

INSERT INTO `qdn_db`.`machine_transition_rules` (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_58at28, NULL, @s_f1_qsop20, 'none', 0, 'no setup/conversion needed on anything'),
  (@m_58at28, NULL, @s_f1_qsop16, 'none', 0, 'no setup/conversion needed on anything'),
  (@m_58at28, NULL, @s_f1_qsop28, 'none', 0, 'no setup/conversion needed on anything'),
  (@m_58at28, NULL, @s_f1_snep8,  'none', 0, 'no setup/conversion needed on anything'),
  (@m_58at28, NULL, @s_f1_sn16,   'none', 0, 'no setup/conversion needed on anything'),
  (@m_58at28, NULL, @s_f1_sn8,    'none', 0, 'no setup/conversion needed on anything'),
  (@m_58at28, NULL, @s_f1_sn14,   'none', 0, 'no setup/conversion needed on anything'),
  (@m_58at28, NULL, @s_f2_qsop20, 'none', 0, 'no setup/conversion needed on anything'),
  (@m_58at28, NULL, @s_f2_qsop16, 'none', 0, 'no setup/conversion needed on anything'),
  (@m_58at28, NULL, @s_f2_qsop28, 'none', 0, 'no setup/conversion needed on anything'),
  (@m_58at28, NULL, @s_f2_snep8,  'none', 0, 'no setup/conversion needed on anything'),
  (@m_58at28, NULL, @s_f2_sn16,   'none', 0, 'no setup/conversion needed on anything'),
  (@m_58at28, NULL, @s_f2_sn8,    'none', 0, 'no setup/conversion needed on anything'),
  (@m_58at28, NULL, @s_f2_sn14,   'none', 0, 'no setup/conversion needed on anything');