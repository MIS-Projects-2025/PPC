-- done

-- =====================================================
-- 02AT268 — all body size 7x7, no setup/conversion ever
-- F1: LFCSP, LFCSP_SS only
-- F2: LFCSP, LFCSP_SS, QFN
-- Leadcount restricts ELIGIBILITY (via leadcount_include) but never costs anything
-- =====================================================

SET @m_02at268 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '02AT268');


-- ---------------------------------------------------
-- 1) States — one per (factory, package) combo, leadcount_include restricts eligibility
-- ---------------------------------------------------
INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_include`, `process_type`, `remarks`)
VALUES (@m_02at268, 'F1', 'LFCSP', '7X7', '48,32,64', 'taping', '02AT268: F1 LFCSP 7x7, leadcounts 48/32/64');
SET @s_f1_lfcsp = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_include`, `process_type`, `remarks`)
VALUES (@m_02at268, 'F1', 'LFCSP_SS', '7X7', '39,48,64', 'taping', '02AT268: F1 LFCSP_SS 7x7, leadcounts 39/48/64');
SET @s_f1_lfcsp_ss = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_include`, `process_type`, `remarks`)
VALUES (@m_02at268, 'F2', 'LFCSP', '7X7', '48,32,64', 'taping', '02AT268: F2 LFCSP 7x7, leadcounts 48/32/64');
SET @s_f2_lfcsp = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_include`, `process_type`, `remarks`)
VALUES (@m_02at268, 'F2', 'LFCSP_SS', '7X7', '39,48,64', 'taping', '02AT268: F2 LFCSP_SS 7x7, leadcounts 39/48/64');
SET @s_f2_lfcsp_ss = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `body_size`, `leadcount_include`, `process_type`, `remarks`)
VALUES (@m_02at268, 'F2', 'QFN', '7X7', '48,38', 'taping', '02AT268: F2 QFN 7x7, leadcounts 48/38');
SET @s_f2_qfn = LAST_INSERT_ID();


-- ---------------------------------------------------
-- 2) Transition rules — every incoming change is free (overrides the 240min default fallback)
-- ---------------------------------------------------

INSERT INTO qdn_db.machine_transition_rules (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_02at268, NULL, @s_f1_lfcsp,    'none', 0, 'no setup/conversion needed on anything'),
  (@m_02at268, NULL, @s_f1_lfcsp_ss, 'none', 0, 'no setup/conversion needed on anything'),
  (@m_02at268, NULL, @s_f2_lfcsp,    'none', 0, 'no setup/conversion needed on anything'),
  (@m_02at268, NULL, @s_f2_lfcsp_ss, 'none', 0, 'no setup/conversion needed on anything'),
  (@m_02at268, NULL, @s_f2_qfn,      'none', 0, 'no setup/conversion needed on anything');