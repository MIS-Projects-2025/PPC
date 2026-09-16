-- ALL DONE HERE

-- ===== 21AT128 (machine_num='21AT128', F1, tubing only) =====

SET @m_21at128 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '21AT128');

-- 1) States: one row per package/leadcount group, tubing only (no taping split needed)


INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (@m_21at128, 'F1', 'SOIC_N', '8', 'tubing', '21AT128: SOIC_N, 8L, tube');
SET @soicn8_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (@m_21at128, 'F1', 'SOIC_N', '14', 'tubing', '21AT128: SOIC_N, 14L, tube');
SET @soicn14_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (@m_21at128, 'F1', 'SSOP', '16', 'tubing', '21AT128: SSOP, 16L, tube');
SET @ssop16_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (@m_21at128, 'F1', 'SSOP', '20', 'tubing', '21AT128: SSOP, 20L, tube');
SET @ssop20_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (@m_21at128, 'F1', 'SSOP', '24', 'tubing', '21AT128: SSOP, 24L, tube');
SET @ssop24_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (@m_21at128, 'F1', 'SSOP', '28', 'tubing', '21AT128: SSOP, 28L, tube');
SET @ssop28_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (@m_21at128, 'F1', 'SSOP', '36', 'tubing', '21AT128: SSOP, 36L, tube');
SET @ssop36_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (@m_21at128, 'F1', 'SSOP', '48', 'tubing', '21AT128: SSOP, 48L, tube');
SET @ssop48_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 8 states costs 120min (2hrs)

--    (covers package change and leadcount change uniformly, tubing only)

INSERT INTO qdn_db.machine_transition_rules
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_21at128, NULL, @soicn8_tubing, 'setup', 120, 'any change (package/leadcount) -> setup'),
  (@m_21at128, NULL, @soicn14_tubing, 'setup', 120, 'any change (package/leadcount) -> setup'),
  (@m_21at128, NULL, @ssop16_tubing, 'setup', 120, 'any change (package/leadcount) -> setup'),
  (@m_21at128, NULL, @ssop20_tubing, 'setup', 120, 'any change (package/leadcount) -> setup'),
  (@m_21at128, NULL, @ssop24_tubing, 'setup', 120, 'any change (package/leadcount) -> setup'),
  (@m_21at128, NULL, @ssop28_tubing, 'setup', 120, 'any change (package/leadcount) -> setup'),
  (@m_21at128, NULL, @ssop36_tubing, 'setup', 120, 'any change (package/leadcount) -> setup'),
  (@m_21at128, NULL, @ssop48_tubing, 'setup', 120, 'any change (package/leadcount) -> setup');


  -- ===== 48AT28 (machine_num='48AT28', F1) =====

SET @m_48at28 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '48AT28');

-- 1) States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_48at28, 'F1', 'SOIC_N_EP', 8, 8, 'taping', '48AT28: SOIC_N_EP, 8L, reel');
SET @soicnep8_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_48at28, 'F1', 'SOIC_N_EP', 8, 8, 'tubing', '48AT28: SOIC_N_EP, 8L, tube');
SET @soicnep8_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_48at28, 'F1', 'QSOP', 16, 16, 'taping', '48AT28: QSOP, 16L, reel');
SET @qsop16_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_48at28, 'F1', 'QSOP', 16, 16, 'tubing', '48AT28: QSOP, 16L, tube');
SET @qsop16_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_48at28, 'F1', 'QSOP_EP', 16, 16, 'taping', '48AT28: QSOP_EP, 16L, reel');
SET @qsopep16_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_48at28, 'F1', 'QSOP_EP', 16, 16, 'tubing', '48AT28: QSOP_EP, 16L, tube');
SET @qsopep16_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_48at28, 'F1', 'SOIC_N', 8, 8, 'taping', '48AT28: SOIC_N, 8L, reel');
SET @soicn8_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_48at28, 'F1', 'SOIC_N', 8, 8, 'tubing', '48AT28: SOIC_N, 8L, tube');
SET @soicn8_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_48at28, 'F1', 'SOIC_N', 14, 14, 'taping', '48AT28: SOIC_N, 14L, reel');
SET @soicn14_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_48at28, 'F1', 'SOIC_N', 14, 14, 'tubing', '48AT28: SOIC_N, 14L, tube');
SET @soicn14_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_48at28, 'F1', 'SOIC_N', 16, 16, 'taping', '48AT28: SOIC_N, 16L, reel');
SET @soicn16_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_48at28, 'F1', 'SOIC_N', 16, 16, 'tubing', '48AT28: SOIC_N, 16L, tube');
SET @soicn16_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_48at28, 'F1', 'SOIC_N_EP', 16, 16, 'taping', '48AT28: SOIC_N_EP, 16L, reel');
SET @soicnep16_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_48at28, 'F1', 'SOIC_N_EP', 16, 16, 'tubing', '48AT28: SOIC_N_EP, 16L, tube');
SET @soicnep16_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 14 states costs 120min (2hrs)

--    (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO qdn_db.machine_transition_rules
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_48at28, NULL, @soicnep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_48at28, NULL, @soicnep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_48at28, NULL, @qsop16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_48at28, NULL, @qsop16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_48at28, NULL, @qsopep16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_48at28, NULL, @qsopep16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_48at28, NULL, @soicn8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_48at28, NULL, @soicn8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_48at28, NULL, @soicn14_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_48at28, NULL, @soicn14_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_48at28, NULL, @soicn16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_48at28, NULL, @soicn16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_48at28, NULL, @soicnep16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_48at28, NULL, @soicnep16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');

  -------------------------------------

-- ===== 25AT128 (machine_num='25AT128', F1) =====

SET @m_25at128 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '25AT128');

-- 1) States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_25at128, 'F1', 'SOIC_N_EP', 8, 8, 'taping', '25AT128: SOIC_N_EP, 8L, reel');
SET @soicnep8_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_25at128, 'F1', 'SOIC_N_EP', 8, 8, 'tubing', '25AT128: SOIC_N_EP, 8L, tube');
SET @soicnep8_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_25at128, 'F1', 'SOIC_N', 8, 8, 'taping', '25AT128: SOIC_N, 8L, reel');
SET @soicn8_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_25at128, 'F1', 'SOIC_N', 8, 8, 'tubing', '25AT128: SOIC_N, 8L, tube');
SET @soicn8_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_25at128, 'F1', 'SOIC_N', 14, 14, 'taping', '25AT128: SOIC_N, 14L, reel');
SET @soicn14_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_25at128, 'F1', 'SOIC_N', 14, 14, 'tubing', '25AT128: SOIC_N, 14L, tube');
SET @soicn14_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_25at128, 'F1', 'SOIC_N', 16, 16, 'taping', '25AT128: SOIC_N, 16L, reel');
SET @soicn16_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_25at128, 'F1', 'SOIC_N', 16, 16, 'tubing', '25AT128: SOIC_N, 16L, tube');
SET @soicn16_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 8 states costs 120min (2hrs)

--    (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO qdn_db.machine_transition_rules
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_25at128, NULL, @soicnep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_25at128, NULL, @soicnep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_25at128, NULL, @soicn8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_25at128, NULL, @soicn8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_25at128, NULL, @soicn14_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_25at128, NULL, @soicn14_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_25at128, NULL, @soicn16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (@m_25at128, NULL, @soicn16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');

-- DONE ALL ABOVE

select * from qdn_db.machine_transition_rules where notes like '%any change %';


  -- =====================================================
-- 26HSI250 (F2, taping only)
-- Packages: QFN, DFN, LQFN, LQFN_EP
-- Body sizes: 3x4, 2x3, 2x2 — but LQFN/LQFN_EP ONLY exist at 2x2
-- Rule: leadcount and thickness never matter (not modeled as states)
--       package swap at the SAME body size = free
--       body size change (regardless of package on either end) = 360min (6hrs)
-- =====================================================

SET @m_26hsi250 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '26HSI250');


-- ---------------------------------------------------
-- 1) STATES — one per (package, body_size) combo
-- ---------------------------------------------------

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `body_size`, `process_type`, `remarks`)
VALUES (@m_26hsi250, 'F2', 'QFN', '3X4', 'taping', '26HSI250: QFN 3x4, any leadcount/thickness, reel');
SET @qfn3x4 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `body_size`, `process_type`, `remarks`)
VALUES (@m_26hsi250, 'F2', 'QFN', '2X3', 'taping', '26HSI250: QFN 2x3, any leadcount/thickness, reel');
SET @qfn2x3 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `body_size`, `process_type`, `remarks`)
VALUES (@m_26hsi250, 'F2', 'QFN', '2X2', 'taping', '26HSI250: QFN 2x2, any leadcount/thickness, reel');
SET @qfn2x2 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `body_size`, `process_type`, `remarks`)
VALUES (@m_26hsi250, 'F2', 'DFN', '3X4', 'taping', '26HSI250: DFN 3x4, any leadcount/thickness, reel');
SET @dfn3x4 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `body_size`, `process_type`, `remarks`)
VALUES (@m_26hsi250, 'F2', 'DFN', '2X3', 'taping', '26HSI250: DFN 2x3, any leadcount/thickness, reel');
SET @dfn2x3 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `body_size`, `process_type`, `remarks`)
VALUES (@m_26hsi250, 'F2', 'DFN', '2X2', 'taping', '26HSI250: DFN 2x2, any leadcount/thickness, reel');
SET @dfn2x2 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `body_size`, `process_type`, `remarks`)
VALUES (@m_26hsi250, 'F2', 'LQFN', '2X2', 'taping', '26HSI250: LQFN 2x2, any leadcount/thickness, reel');
SET @lqfn2x2 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `body_size`, `process_type`, `remarks`)
VALUES (@m_26hsi250, 'F2', 'LQFN_EP', '2X2', 'taping', '26HSI250: LQFN_EP 2x2, any leadcount/thickness, reel');
SET @lqfnep2x2 = LAST_INSERT_ID();


-- ---------------------------------------------------
-- 2) BLANKET RULE — any incoming change costs 360min (6hrs)
--    This is the default; step 3 below overrides it to 0 for
--    same-body-size package swaps.
-- ---------------------------------------------------

INSERT INTO qdn_db.machine_transition_rules
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_26hsi250, NULL, @qfn3x4,    'conversion', 360, 'body size change -> convertible setup, any leadcount/thickness'),
  (@m_26hsi250, NULL, @qfn2x3,    'conversion', 360, 'body size change -> convertible setup, any leadcount/thickness'),
  (@m_26hsi250, NULL, @qfn2x2,    'conversion', 360, 'body size change -> convertible setup, any leadcount/thickness'),
  (@m_26hsi250, NULL, @dfn3x4,    'conversion', 360, 'body size change -> convertible setup, any leadcount/thickness'),
  (@m_26hsi250, NULL, @dfn2x3,    'conversion', 360, 'body size change -> convertible setup, any leadcount/thickness'),
  (@m_26hsi250, NULL, @dfn2x2,    'conversion', 360, 'body size change -> convertible setup, any leadcount/thickness'),
  (@m_26hsi250, NULL, @lqfn2x2,   'conversion', 360, 'body size change -> convertible setup, any leadcount/thickness'),
  (@m_26hsi250, NULL, @lqfnep2x2,'conversion', 360, 'body size change -> convertible setup, any leadcount/thickness');


-- ---------------------------------------------------
-- 3) EXCEPTIONS — same body size, package swap only = FREE
--    3x4 group: QFN <-> DFN
--    2x3 group: QFN <-> DFN
--    2x2 group: QFN, DFN, LQFN, LQFN_EP all interchangeable
-- ---------------------------------------------------

INSERT INTO qdn_db.machine_transition_rules
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_26hsi250, @qfn3x4, @dfn3x4, 'none', 0, 'same body size 3x4, package swap only'),
  (@m_26hsi250, @dfn3x4, @qfn3x4, 'none', 0, 'same body size 3x4, package swap only'),

  (@m_26hsi250, @qfn2x3, @dfn2x3, 'none', 0, 'same body size 2x3, package swap only'),
  (@m_26hsi250, @dfn2x3, @qfn2x3, 'none', 0, 'same body size 2x3, package swap only'),

  (@m_26hsi250, @qfn2x2,    @dfn2x2,    'none', 0, 'same body size 2x2, package swap only'),
  (@m_26hsi250, @dfn2x2,    @qfn2x2,    'none', 0, 'same body size 2x2, package swap only'),
  (@m_26hsi250, @qfn2x2,    @lqfn2x2,   'none', 0, 'same body size 2x2, package swap only'),
  (@m_26hsi250, @lqfn2x2,   @qfn2x2,    'none', 0, 'same body size 2x2, package swap only'),
  (@m_26hsi250, @qfn2x2,    @lqfnep2x2,'none', 0, 'same body size 2x2, package swap only'),
  (@m_26hsi250, @lqfnep2x2,@qfn2x2,    'none', 0, 'same body size 2x2, package swap only'),
  (@m_26hsi250, @dfn2x2,    @lqfn2x2,   'none', 0, 'same body size 2x2, package swap only'),
  (@m_26hsi250, @lqfn2x2,   @dfn2x2,    'none', 0, 'same body size 2x2, package swap only'),
  (@m_26hsi250, @dfn2x2,    @lqfnep2x2,'none', 0, 'same body size 2x2, package swap only'),
  (@m_26hsi250, @lqfnep2x2,@dfn2x2,    'none', 0, 'same body size 2x2, package swap only'),
  (@m_26hsi250, @lqfn2x2,   @lqfnep2x2,'none', 0, 'same body size 2x2, package swap only'),
  (@m_26hsi250, @lqfnep2x2,@lqfn2x2,   'none', 0, 'same body size 2x2, package swap only');


select distinct lead_count from qdn_db.package_list where package_type = 'TSOT';
select * from qdn_db.package_list where devicename = 'ADR381ARTZ-R2';

show create table qdn_db.machine_transition_axis_rules;
select * from qdn_db.machine_transition_axis_rules;

-- DONE 26HSI


-- =====================================================
-- TSOT machines: leadcounts 5, 6, 8 — setup 120min on any leadcount change
-- Machines: 34HSI250, 28HSI250, 30HSI250, 03HSI200, 21HSI250, 15HSI250
-- =====================================================

SET @m_34hsi250 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '34HSI250');
SET @m_28hsi250 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '28HSI250');
SET @m_30hsi250 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '30HSI250');
SET @m_03hsi200 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '03HSI200');
SET @m_21hsi250 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '21HSI250');
SET @m_15hsi250 = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '15HSI250');


-- ---------------------------------------------------
-- 34HSI250 (F2)
-- ---------------------------------------------------
INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34hsi250, 'F2', 'TSOT', 5, 5, 'taping', '34HSI250: TSOT, 5L, reel');
SET @s_34_5 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34hsi250, 'F2', 'TSOT', 6, 6, 'taping', '34HSI250: TSOT, 6L, reel');
SET @s_34_6 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_34hsi250, 'F2', 'TSOT', 8, 8, 'taping', '34HSI250: TSOT, 8L, reel');
SET @s_34_8 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_transition_axis_rules (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES (@m_34hsi250, 'leadcount', 'setup', 120, 'max');

INSERT INTO qdn_db.machine_transition_rules (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_34hsi250, NULL, @s_34_5, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34hsi250, NULL, @s_34_6, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_34hsi250, NULL, @s_34_8, 'setup', 120, 'bootstrap: no prior state -> setup');


-- ---------------------------------------------------
-- 28HSI250 (F2)
-- ---------------------------------------------------
INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_28hsi250, 'F2', 'TSOT', 5, 5, 'taping', '28HSI250: TSOT, 5L, reel');
SET @s_28_5 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_28hsi250, 'F2', 'TSOT', 6, 6, 'taping', '28HSI250: TSOT, 6L, reel');
SET @s_28_6 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_28hsi250, 'F2', 'TSOT', 8, 8, 'taping', '28HSI250: TSOT, 8L, reel');
SET @s_28_8 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_transition_axis_rules (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES (@m_28hsi250, 'leadcount', 'setup', 120, 'max');

INSERT INTO qdn_db.machine_transition_rules (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_28hsi250, NULL, @s_28_5, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_28hsi250, NULL, @s_28_6, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_28hsi250, NULL, @s_28_8, 'setup', 120, 'bootstrap: no prior state -> setup');


-- ---------------------------------------------------
-- 30HSI250 (F2)
-- ---------------------------------------------------
INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_30hsi250, 'F2', 'TSOT', 5, 5, 'taping', '30HSI250: TSOT, 5L, reel');
SET @s_30_5 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_30hsi250, 'F2', 'TSOT', 6, 6, 'taping', '30HSI250: TSOT, 6L, reel');
SET @s_30_6 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_30hsi250, 'F2', 'TSOT', 8, 8, 'taping', '30HSI250: TSOT, 8L, reel');
SET @s_30_8 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_transition_axis_rules (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES (@m_30hsi250, 'leadcount', 'setup', 120, 'max');

INSERT INTO qdn_db.machine_transition_rules (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_30hsi250, NULL, @s_30_5, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_30hsi250, NULL, @s_30_6, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_30hsi250, NULL, @s_30_8, 'setup', 120, 'bootstrap: no prior state -> setup');


-- ---------------------------------------------------
-- 03HSI200 (F1)
-- ---------------------------------------------------
INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_03hsi200, 'F1', 'TSOT', 5, 5, 'taping', '03HSI200: TSOT, 5L, reel');
SET @s_03_5 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_03hsi200, 'F1', 'TSOT', 6, 6, 'taping', '03HSI200: TSOT, 6L, reel');
SET @s_03_6 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_03hsi200, 'F1', 'TSOT', 8, 8, 'taping', '03HSI200: TSOT, 8L, reel');
SET @s_03_8 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_transition_axis_rules (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES (@m_03hsi200, 'leadcount', 'setup', 120, 'max');

INSERT INTO qdn_db.machine_transition_rules (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_03hsi200, NULL, @s_03_5, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_03hsi200, NULL, @s_03_6, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_03hsi200, NULL, @s_03_8, 'setup', 120, 'bootstrap: no prior state -> setup');


-- ---------------------------------------------------
-- 21HSI250 (F2)
-- ---------------------------------------------------
INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_21hsi250, 'F2', 'TSOT', 5, 5, 'taping', '21HSI250: TSOT, 5L, reel');
SET @s_21_5 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_21hsi250, 'F2', 'TSOT', 6, 6, 'taping', '21HSI250: TSOT, 6L, reel');
SET @s_21_6 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_21hsi250, 'F2', 'TSOT', 8, 8, 'taping', '21HSI250: TSOT, 8L, reel');
SET @s_21_8 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_transition_axis_rules (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES (@m_21hsi250, 'leadcount', 'setup', 120, 'max');

INSERT INTO qdn_db.machine_transition_rules (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_21hsi250, NULL, @s_21_5, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_21hsi250, NULL, @s_21_6, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_21hsi250, NULL, @s_21_8, 'setup', 120, 'bootstrap: no prior state -> setup');


-- ---------------------------------------------------
-- 15HSI250 (F2)
-- ---------------------------------------------------
INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_15hsi250, 'F2', 'TSOT', 5, 5, 'taping', '15HSI250: TSOT, 5L, reel');
SET @s_15_5 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_15hsi250, 'F2', 'TSOT', 6, 6, 'taping', '15HSI250: TSOT, 6L, reel');
SET @s_15_6 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (@m_15hsi250, 'F2', 'TSOT', 8, 8, 'taping', '15HSI250: TSOT, 8L, reel');
SET @s_15_8 = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_transition_axis_rules (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `combination_rule`)
VALUES (@m_15hsi250, 'leadcount', 'setup', 120, 'max');

INSERT INTO qdn_db.machine_transition_rules (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_15hsi250, NULL, @s_15_5, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_15hsi250, NULL, @s_15_6, 'setup', 120, 'bootstrap: no prior state -> setup'),
  (@m_15hsi250, NULL, @s_15_8, 'setup', 120, 'bootstrap: no prior state -> setup');