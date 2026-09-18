-- DONE THIS IS DONE
-- BUT YOU MUST RECHECK
-- =====================================================================
-- 04HSI200: F1 LFCSP 4x4 / F1 LGA 4x4x.78 / F2 QFN,DFN 4x4 (no 12L)
-- Taping only. Setup on ANY package change (no same-factory exemption,
-- no LFCSP<->LGA exemption -- both differ from 06HSI400T). Setup on
-- factory change. Setup on leadcount change -- NOT encoded below, no
-- discrete leadcount values given; capability seeded leadcount-open.
-- =====================================================================

select * from qdn_db.machine_list where machine_num like '%04HSI2%';
SET @m_04hsi200 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '04HSI200');

SELECT DISTINCT Lead_Count
FROM customer_data_wip
WHERE Package_Name = 'LFCSP' AND Body_Size LIKE '4X4%';

INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, body_size, thickness, process_type, remarks)
VALUES (@m_04hsi200, 'F1', 'LFCSP', '4X4', NULL, 'taping', '04HSI200: F1 LFCSP 4x4');
select * from qdn_db.machine_setup_states where remarks = '04HSI200: F1 LFCSP 4x4';
SET @s_lfcsp = 710;

INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, body_size, thickness, process_type, remarks)
VALUES (@m_04hsi200, 'F1', 'LGA', '4X4', 0.78, 'taping', '04HSI200: F1 LGA 4x4x.78');
select * from qdn_db.machine_setup_states where remarks = '04HSI200: F1 LGA 4x4x.78';
SET @s_lga = 711;

INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, body_size, thickness, leadcount_exclude, process_type, remarks)
VALUES (@m_04hsi200, 'F2', 'QFN', '4X4', NULL, '12', 'taping', '04HSI200: F2 QFN 4x4, cannot cater 12L');
select * from qdn_db.machine_setup_states where remarks = '04HSI200: F2 QFN 4x4, cannot cater 12L';
SET @s_qfn = 712;

INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, body_size, thickness, leadcount_exclude, process_type, remarks)
VALUES (@m_04hsi200, 'F2', 'DFN', '4X4', NULL, '12', 'taping', '04HSI200: F2 DFN 4x4, cannot cater 12L');
select * from qdn_db.machine_setup_states where remarks = '04HSI200: F2 DFN 4x4, cannot cater 12L';

SET @s_dfn = 713;


select * from qdn_db.machine_setup_states where setup_state_id in (
    710,
    711,
    712,
    713
)

-- transitions: EVERY package/factory change costs a setup here --
-- no exceptions, unlike 06HSI400T
-- INSERT INTO qdn_db.machine_transition_rules (machine_id, from_state_id, to_state_id, operation_type, est_duration_minutes, notes)
-- VALUES
--   (@m_04hsi200, @s_lfcsp, @s_lga,  'setup', 120, 'package change, no exemption on this machine'),
--   (@m_04hsi200, @s_lga,   @s_lfcsp,'setup', 120, 'package change, no exemption on this machine'),
--   (@m_04hsi200, @s_lfcsp, @s_qfn,  'setup', 120, 'factory + package change'),
--   (@m_04hsi200, @s_qfn,   @s_lfcsp,'setup', 120, 'factory + package change'),
--   (@m_04hsi200, @s_lfcsp, @s_dfn,  'setup', 120, 'factory + package change'),
--   (@m_04hsi200, @s_dfn,   @s_lfcsp,'setup', 120, 'factory + package change'),
--   (@m_04hsi200, @s_lga,   @s_qfn,  'setup', 120, 'factory + package change'),
--   (@m_04hsi200, @s_qfn,   @s_lga,  'setup', 120, 'factory + package change'),
--   (@m_04hsi200, @s_lga,   @s_dfn,  'setup', 120, 'factory + package change'),
--   (@m_04hsi200, @s_dfn,   @s_lga,  'setup', 120, 'factory + package change'),
--   (@m_04hsi200, @s_qfn,   @s_dfn,  'setup', 120, 'same-factory package change -- still needs setup on THIS machine'),
--   (@m_04hsi200, @s_dfn,   @s_qfn,  'setup', 120, 'same-factory package change -- still needs setup on THIS machine');

select * from qdn_db.machine_transition_rules;

-- show create table qdn_db.machine_setup_states;
-- show create table qdn_db.machine_transition_rule_exceptions;
-- show create table qdn_db.machine_capability_part_rules;
-- show create table qdn_db.machine_transition_rules;

------------

-- =====================================================================
-- 04HSI200: F1 LFCSP 4x4 (leadcount-differentiated: 16/20/24) /
-- F1 LGA 4x4x.78 / F2 QFN,DFN 4x4 (no 12L). Taping only.
--
-- CONSOLIDATION: this machine requires 'setup' for ANY change at all --
-- package, factory, OR leadcount, no exceptions. Rather than writing
-- pairwise rules per (from,to) combination, every transition collapses
-- to one wildcard-per-destination rule: "from ANY state -> this
-- specific state = setup". The fromStateId===toStateId short-circuit
-- already built into transitionCost() handles the one free case
-- (staying on the exact same state) with no rule needed at all.
-- =====================================================================

SET @m_04hsi200 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '04HSI200');

-- F1 LFCSP 4x4, split into 3 leadcount-specific states (real values
-- pulled from customer_data_wip, per the last check)
INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, body_size, thickness, leadcount_min, leadcount_max, process_type, remarks)
VALUES (@m_04hsi200, 'F1', 'LFCSP', '4X4', NULL, 16, 16, 'taping', '04HSI200: F1 LFCSP 4x4, 16-lead');
select * from qdn_db.machine_setup_states where remarks = '04HSI200: F1 LFCSP 4x4, 16-lead';

SET @s_lfcsp_16 = 714;

INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, body_size, thickness, leadcount_min, leadcount_max, process_type, remarks)
VALUES (@m_04hsi200, 'F1', 'LFCSP', '4X4', NULL, 20, 20, 'taping', '04HSI200: F1 LFCSP 4x4, 20-lead');
select * from qdn_db.machine_setup_states where remarks = '04HSI200: F1 LFCSP 4x4, 20-lead';

SET @s_lfcsp_20 = 715;

INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, body_size, thickness, leadcount_min, leadcount_max, process_type, remarks)
VALUES (@m_04hsi200, 'F1', 'LFCSP', '4X4', NULL, 24, 24, 'taping', '04HSI200: F1 LFCSP 4x4, 24-lead');
SET @s_lfcsp_24 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, body_size, thickness, process_type, remarks)
VALUES (@m_04hsi200, 'F1', 'LGA', '4X4', 0.78, 'taping', '04HSI200: F1 LGA 4x4x.78');
SET @s_lga = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, body_size, thickness, leadcount_exclude, process_type, remarks)
VALUES (@m_04hsi200, 'F2', 'QFN', '4X4', NULL, '12', 'taping', '04HSI200: F2 QFN 4x4, cannot cater 12L');
SET @s_qfn = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, body_size, thickness, leadcount_exclude, process_type, remarks)
VALUES (@m_04hsi200, 'F2', 'DFN', '4X4', NULL, '12', 'taping', '04HSI200: F2 DFN 4x4, cannot cater 12L');
SET @s_dfn = LAST_INSERT_ID();

-- one wildcard rule per destination state -- covers every possible
-- incoming state uniformly, since the cost is always 'setup' regardless
-- of what it's coming from
INSERT INTO qdn_db.machine_transition_rules (machine_id, from_state_id, to_state_id, operation_type, est_duration_minutes, notes)
VALUES
  (@m_04hsi200, NULL, @s_lfcsp_16, 'setup', 120, 'any change (package/factory/leadcount) -> setup'),
  (@m_04hsi200, NULL, @s_lfcsp_20, 'setup', 120, 'any change (package/factory/leadcount) -> setup'),
  (@m_04hsi200, NULL, @s_lfcsp_24, 'setup', 120, 'any change (package/factory/leadcount) -> setup'),
  (@m_04hsi200, NULL, @s_lga,      'setup', 120, 'any change (package/factory/leadcount) -> setup'),
  (@m_04hsi200, NULL, @s_qfn,      'setup', 120, 'any change (package/factory/leadcount) -> setup'),
  (@m_04hsi200, NULL, @s_dfn,      'setup', 120, 'any change (package/factory/leadcount) -> setup');