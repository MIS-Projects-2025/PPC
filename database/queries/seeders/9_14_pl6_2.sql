-- DONE NA ITO
-- DONE NA ITO
-- DONE NA ITO
-- DONE NA ITO
-- DONE NA ITO

-- =====================================================
-- 02HSI200 & 11HSI250
-- Package: SOT-23, all leadcounts except 3L (leadcounts seeded: 5, 6, 8)
-- Both F1 and F2 — factory never costs, leadcount change = 120min
-- Taping only
-- =====================================================

SET @m_02hsi200 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '02HSI200');
SET @m_11hsi250 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '11HSI250');


-- ---------------------------------------------------
-- 02HSI200
-- ---------------------------------------------------
INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `leadcount_exclude`, `process_type`, `remarks`)
VALUES (@m_02hsi200, 'F1', 'SOT-23', 5, 5, '3', 'taping', '02HSI200: F1 SOT-23, 5L, reel');
SET @s_02_f1_5 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `leadcount_exclude`, `process_type`, `remarks`)
VALUES (@m_02hsi200, 'F1', 'SOT-23', 6, 6, '3', 'taping', '02HSI200: F1 SOT-23, 6L, reel');
SET @s_02_f1_6 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `leadcount_exclude`, `process_type`, `remarks`)
VALUES (@m_02hsi200, 'F1', 'SOT-23', 8, 8, '3', 'taping', '02HSI200: F1 SOT-23, 8L, reel');
SET @s_02_f1_8 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `leadcount_exclude`, `process_type`, `remarks`)
VALUES (@m_02hsi200, 'F2', 'SOT-23', 5, 5, '3', 'taping', '02HSI200: F2 SOT-23, 5L, reel');
SET @s_02_f2_5 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `leadcount_exclude`, `process_type`, `remarks`)
VALUES (@m_02hsi200, 'F2', 'SOT-23', 6, 6, '3', 'taping', '02HSI200: F2 SOT-23, 6L, reel');
SET @s_02_f2_6 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `leadcount_exclude`, `process_type`, `remarks`)
VALUES (@m_02hsi200, 'F2', 'SOT-23', 8, 8, '3', 'taping', '02HSI200: F2 SOT-23, 8L, reel');
SET @s_02_f2_8 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_transition_axis_rules (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES (@m_02hsi200, 'leadcount', 'setup', 120, 'max');

INSERT INTO qdn_db.machine_transition_rules (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_02hsi200, NULL, @s_02_f1_5, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_02hsi200, NULL, @s_02_f1_6, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_02hsi200, NULL, @s_02_f1_8, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_02hsi200, NULL, @s_02_f2_5, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_02hsi200, NULL, @s_02_f2_6, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_02hsi200, NULL, @s_02_f2_8, 'setup', 120, 'bootstrap: no prior state -> setup'),
  -- same-leadcount factory swap = free (overrides 120min NULL fallback, no factory axis rule exists)
  (@m_02hsi200, @s_02_f1_5, @s_02_f2_5, 'none', 0, 'same leadcount, factory swap only'),
  (@m_02hsi200, @s_02_f2_5, @s_02_f1_5, 'none', 0, 'same leadcount, factory swap only'),
  (@m_02hsi200, @s_02_f1_6, @s_02_f2_6, 'none', 0, 'same leadcount, factory swap only'),
  (@m_02hsi200, @s_02_f2_6, @s_02_f1_6, 'none', 0, 'same leadcount, factory swap only'),
  (@m_02hsi200, @s_02_f1_8, @s_02_f2_8, 'none', 0, 'same leadcount, factory swap only'),
  (@m_02hsi200, @s_02_f2_8, @s_02_f1_8, 'none', 0, 'same leadcount, factory swap only');


-- ---------------------------------------------------
-- 11HSI250
-- ---------------------------------------------------
INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `leadcount_exclude`, `process_type`, `remarks`)
VALUES (@m_11hsi250, 'F1', 'SOT-23', 5, 5, '3', 'taping', '11HSI250: F1 SOT-23, 5L, reel');
SET @s_11_f1_5 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `leadcount_exclude`, `process_type`, `remarks`)
VALUES (@m_11hsi250, 'F1', 'SOT-23', 6, 6, '3', 'taping', '11HSI250: F1 SOT-23, 6L, reel');
SET @s_11_f1_6 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `leadcount_exclude`, `process_type`, `remarks`)
VALUES (@m_11hsi250, 'F1', 'SOT-23', 8, 8, '3', 'taping', '11HSI250: F1 SOT-23, 8L, reel');
SET @s_11_f1_8 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `leadcount_exclude`, `process_type`, `remarks`)
VALUES (@m_11hsi250, 'F2', 'SOT-23', 5, 5, '3', 'taping', '11HSI250: F2 SOT-23, 5L, reel');
SET @s_11_f2_5 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `leadcount_exclude`, `process_type`, `remarks`)
VALUES (@m_11hsi250, 'F2', 'SOT-23', 6, 6, '3', 'taping', '11HSI250: F2 SOT-23, 6L, reel');
SET @s_11_f2_6 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `leadcount_exclude`, `process_type`, `remarks`)
VALUES (@m_11hsi250, 'F2', 'SOT-23', 8, 8, '3', 'taping', '11HSI250: F2 SOT-23, 8L, reel');
SET @s_11_f2_8 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_transition_axis_rules (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES (@m_11hsi250, 'leadcount', 'setup', 120, 'max');

INSERT INTO qdn_db.machine_transition_rules (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_11hsi250, NULL, @s_11_f1_5, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_11hsi250, NULL, @s_11_f1_6, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_11hsi250, NULL, @s_11_f1_8, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_11hsi250, NULL, @s_11_f2_5, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_11hsi250, NULL, @s_11_f2_6, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_11hsi250, NULL, @s_11_f2_8, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_11hsi250, @s_11_f1_5, @s_11_f2_5, 'none', 0, 'same leadcount, factory swap only'),
  (@m_11hsi250, @s_11_f2_5, @s_11_f1_5, 'none', 0, 'same leadcount, factory swap only'),
  (@m_11hsi250, @s_11_f1_6, @s_11_f2_6, 'none', 0, 'same leadcount, factory swap only'),
  (@m_11hsi250, @s_11_f2_6, @s_11_f1_6, 'none', 0, 'same leadcount, factory swap only'),
  (@m_11hsi250, @s_11_f1_8, @s_11_f2_8, 'none', 0, 'same leadcount, factory swap only'),
  (@m_11hsi250, @s_11_f2_8, @s_11_f1_8, 'none', 0, 'same leadcount, factory swap only');