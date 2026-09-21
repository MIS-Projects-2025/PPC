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