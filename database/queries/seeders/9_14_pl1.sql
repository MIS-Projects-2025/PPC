-- ===== 08G6L (machine_id=55, F1) =====

-- 1) States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_IC', 6, 6, 'taping', '08G6L: SOIC_IC, 6L, reel');
SET @soicic6_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_IC', 6, 6, 'tubing', '08G6L: SOIC_IC, 6L, tube');
SET @soicic6_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_IC', 8, 8, 'taping', '08G6L: SOIC_IC, 8L, reel');
SET @soicic8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_IC', 8, 8, 'tubing', '08G6L: SOIC_IC, 8L, tube');
SET @soicic8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_IC', 16, 16, 'taping', '08G6L: SOIC_IC, 16L, reel');
SET @soicic16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_IC', 16, 16, 'tubing', '08G6L: SOIC_IC, 16L, tube');
SET @soicic16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_IC', 20, 20, 'taping', '08G6L: SOIC_IC, 20L, reel');
SET @soicic20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_IC', 20, 20, 'tubing', '08G6L: SOIC_IC, 20L, tube');
SET @soicic20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_W', 16, 16, 'taping', '08G6L: SOIC_W, 16L, reel');
SET @soicw16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_W', 16, 16, 'tubing', '08G6L: SOIC_W, 16L, tube');
SET @soicw16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_W', 18, 18, 'taping', '08G6L: SOIC_W, 18L, reel');
SET @soicw18_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_W', 18, 18, 'tubing', '08G6L: SOIC_W, 18L, tube');
SET @soicw18_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_W', 20, 20, 'taping', '08G6L: SOIC_W, 20L, reel');
SET @soicw20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_W', 20, 20, 'tubing', '08G6L: SOIC_W, 20L, tube');
SET @soicw20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_W', 24, 24, 'taping', '08G6L: SOIC_W, 24L, reel');
SET @soicw24_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_W', 24, 24, 'tubing', '08G6L: SOIC_W, 24L, tube');
SET @soicw24_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_W', 28, 28, 'taping', '08G6L: SOIC_W, 28L, reel');
SET @soicw28_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_W', 28, 28, 'tubing', '08G6L: SOIC_W, 28L, tube');
SET @soicw28_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_W_FP', 28, 28, 'taping', '08G6L: SOIC_W_FP, 28L, reel');
SET @soicwfp28_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (55, 'F1', 'SOIC_W_FP', 28, 28, 'tubing', '08G6L: SOIC_W_FP, 28L, tube');
SET @soicwfp28_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 20 states costs 120min

--    (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (55, NULL, @soicic6_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicic6_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicic8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicic8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicic16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicic16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicic20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicic20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicw16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicw16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicw18_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicw18_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicw20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicw20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicw24_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicw24_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicw28_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicw28_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicwfp28_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (55, NULL, @soicwfp28_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');



-- ===== 11G6L (machine_id=58, F1) =====

-- 1) States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'SOIC_W', 16, 16, 'taping', '11G6L: SOIC_W, 16L, reel');
SET @soicw16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'SOIC_W', 16, 16, 'tubing', '11G6L: SOIC_W, 16L, tube');
SET @soicw16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'SOIC_W', 20, 20, 'taping', '11G6L: SOIC_W, 20L, reel');
SET @soicw20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'SOIC_W', 20, 20, 'tubing', '11G6L: SOIC_W, 20L, tube');
SET @soicw20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'SOIC_W', 24, 24, 'taping', '11G6L: SOIC_W, 24L, reel');
SET @soicw24_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'SOIC_W', 24, 24, 'tubing', '11G6L: SOIC_W, 24L, tube');
SET @soicw24_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'SOIC_W', 28, 28, 'taping', '11G6L: SOIC_W, 28L, reel');
SET @soicw28_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'SOIC_W', 28, 28, 'tubing', '11G6L: SOIC_W, 28L, tube');
SET @soicw28_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'SOIC_IC', 8, 8, 'taping', '11G6L: SOIC_IC, 8L, reel');
SET @soicic8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'SOIC_IC', 8, 8, 'tubing', '11G6L: SOIC_IC, 8L, tube');
SET @soicic8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'SOIC_IC', 16, 16, 'taping', '11G6L: SOIC_IC, 16L, reel');
SET @soicic16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'SOIC_IC', 16, 16, 'tubing', '11G6L: SOIC_IC, 16L, tube');
SET @soicic16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'SOIC_IC', 20, 20, 'taping', '11G6L: SOIC_IC, 20L, reel');
SET @soicic20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'SOIC_IC', 20, 20, 'tubing', '11G6L: SOIC_IC, 20L, tube');
SET @soicic20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'SOIC_W_FP', 28, 28, 'taping', '11G6L: SOIC_W_FP, 28L, reel');
SET @soicwfp28_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'SOIC_W_FP', 28, 28, 'tubing', '11G6L: SOIC_W_FP, 28L, tube');
SET @soicwfp28_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'QSOP', 16, 16, 'taping', '11G6L: QSOP, 16L, reel');
SET @qsop16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (58, 'F1', 'QSOP', 16, 16, 'tubing', '11G6L: QSOP, 16L, tube');
SET @qsop16_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 18 states costs 120min

--    (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (58, NULL, @soicw16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @soicw16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @soicw20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @soicw20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @soicw24_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @soicw24_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @soicw28_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @soicw28_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @soicic8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @soicic8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @soicic16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @soicic16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @soicic20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @soicic20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @soicwfp28_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @soicwfp28_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @qsop16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (58, NULL, @qsop16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');



-- ===== 48G6L (machine_id=95, F1) =====

-- 1) States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_W', 16, 16, 'taping', '48G6L: SOIC_W, 16L, reel');
SET @soicw16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_W', 16, 16, 'tubing', '48G6L: SOIC_W, 16L, tube');
SET @soicw16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_W', 18, 18, 'taping', '48G6L: SOIC_W, 18L, reel');
SET @soicw18_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_W', 18, 18, 'tubing', '48G6L: SOIC_W, 18L, tube');
SET @soicw18_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_W', 20, 20, 'taping', '48G6L: SOIC_W, 20L, reel');
SET @soicw20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_W', 20, 20, 'tubing', '48G6L: SOIC_W, 20L, tube');
SET @soicw20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_W', 24, 24, 'taping', '48G6L: SOIC_W, 24L, reel');
SET @soicw24_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_W', 24, 24, 'tubing', '48G6L: SOIC_W, 24L, tube');
SET @soicw24_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_W', 28, 28, 'taping', '48G6L: SOIC_W, 28L, reel');
SET @soicw28_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_W', 28, 28, 'tubing', '48G6L: SOIC_W, 28L, tube');
SET @soicw28_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_IC', 8, 8, 'taping', '48G6L: SOIC_IC, 8L, reel');
SET @soicic8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_IC', 8, 8, 'tubing', '48G6L: SOIC_IC, 8L, tube');
SET @soicic8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_IC', 16, 16, 'taping', '48G6L: SOIC_IC, 16L, reel');
SET @soicic16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_IC', 16, 16, 'tubing', '48G6L: SOIC_IC, 16L, tube');
SET @soicic16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_IC', 20, 20, 'taping', '48G6L: SOIC_IC, 20L, reel');
SET @soicic20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_IC', 20, 20, 'tubing', '48G6L: SOIC_IC, 20L, tube');
SET @soicic20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_W_FP', 28, 28, 'taping', '48G6L: SOIC_W_FP, 28L, reel');
SET @soicwfp28_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_W_FP', 28, 28, 'tubing', '48G6L: SOIC_W_FP, 28L, tube');
SET @soicwfp28_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_N', 16, 16, 'taping', '48G6L: SOIC_N, 16L, reel');
SET @soicn16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (95, 'F1', 'SOIC_N', 16, 16, 'tubing', '48G6L: SOIC_N, 16L, tube');
SET @soicn16_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 20 states costs 120min

--    (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (95, NULL, @soicw16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicw16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicw18_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicw18_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicw20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicw20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicw24_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicw24_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicw28_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicw28_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicic8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicic8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicic16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicic16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicic20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicic20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicwfp28_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicwfp28_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicn16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (95, NULL, @soicn16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');



-- ===== 53G6L (machine_id=100, F1) =====

-- 1) States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (100, 'F1', 'SOIC_W', 16, 16, 'taping', '53G6L: SOIC_W, 16L, reel');
SET @soicw16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (100, 'F1', 'SOIC_W', 16, 16, 'tubing', '53G6L: SOIC_W, 16L, tube');
SET @soicw16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (100, 'F1', 'SOIC_W', 20, 20, 'taping', '53G6L: SOIC_W, 20L, reel');
SET @soicw20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (100, 'F1', 'SOIC_W', 20, 20, 'tubing', '53G6L: SOIC_W, 20L, tube');
SET @soicw20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (100, 'F1', 'SOIC_W', 24, 24, 'taping', '53G6L: SOIC_W, 24L, reel');
SET @soicw24_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (100, 'F1', 'SOIC_W', 24, 24, 'tubing', '53G6L: SOIC_W, 24L, tube');
SET @soicw24_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (100, 'F1', 'SOIC_W', 28, 28, 'taping', '53G6L: SOIC_W, 28L, reel');
SET @soicw28_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (100, 'F1', 'SOIC_W', 28, 28, 'tubing', '53G6L: SOIC_W, 28L, tube');
SET @soicw28_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (100, 'F1', 'SOIC_W_FP', 28, 28, 'taping', '53G6L: SOIC_W_FP, 28L, reel');
SET @soicwfp28_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (100, 'F1', 'SOIC_W_FP', 28, 28, 'tubing', '53G6L: SOIC_W_FP, 28L, tube');
SET @soicwfp28_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (100, 'F1', 'SOIC_IC', 8, 8, 'taping', '53G6L: SOIC_IC, 8L, reel');
SET @soicic8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (100, 'F1', 'SOIC_IC', 8, 8, 'tubing', '53G6L: SOIC_IC, 8L, tube');
SET @soicic8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (100, 'F1', 'SOIC_IC', 16, 16, 'taping', '53G6L: SOIC_IC, 16L, reel');
SET @soicic16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (100, 'F1', 'SOIC_IC', 16, 16, 'tubing', '53G6L: SOIC_IC, 16L, tube');
SET @soicic16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (100, 'F1', 'SOIC_IC', 20, 20, 'taping', '53G6L: SOIC_IC, 20L, reel');
SET @soicic20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (100, 'F1', 'SOIC_IC', 20, 20, 'tubing', '53G6L: SOIC_IC, 20L, tube');
SET @soicic20_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 16 states costs 120min

--    (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (100, NULL, @soicw16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (100, NULL, @soicw16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (100, NULL, @soicw20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (100, NULL, @soicw20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (100, NULL, @soicw24_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (100, NULL, @soicw24_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (100, NULL, @soicw28_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (100, NULL, @soicw28_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (100, NULL, @soicwfp28_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (100, NULL, @soicwfp28_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (100, NULL, @soicic8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (100, NULL, @soicic8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (100, NULL, @soicic16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (100, NULL, @soicic16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (100, NULL, @soicic20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (100, NULL, @soicic20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');



-- ===== 36G6L (machine_id=83, F1) =====

-- 1) States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_W', 16, 16, 'taping', '36G6L: SOIC_W, 16L, reel');
SET @soicw16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_W', 16, 16, 'tubing', '36G6L: SOIC_W, 16L, tube');
SET @soicw16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_W', 18, 18, 'taping', '36G6L: SOIC_W, 18L, reel');
SET @soicw18_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_W', 18, 18, 'tubing', '36G6L: SOIC_W, 18L, tube');
SET @soicw18_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_W', 20, 20, 'taping', '36G6L: SOIC_W, 20L, reel');
SET @soicw20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_W', 20, 20, 'tubing', '36G6L: SOIC_W, 20L, tube');
SET @soicw20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_W', 24, 24, 'taping', '36G6L: SOIC_W, 24L, reel');
SET @soicw24_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_W', 24, 24, 'tubing', '36G6L: SOIC_W, 24L, tube');
SET @soicw24_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_W', 28, 28, 'taping', '36G6L: SOIC_W, 28L, reel');
SET @soicw28_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_W', 28, 28, 'tubing', '36G6L: SOIC_W, 28L, tube');
SET @soicw28_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_IC', 8, 8, 'taping', '36G6L: SOIC_IC, 8L, reel');
SET @soicic8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_IC', 8, 8, 'tubing', '36G6L: SOIC_IC, 8L, tube');
SET @soicic8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_IC', 16, 16, 'taping', '36G6L: SOIC_IC, 16L, reel');
SET @soicic16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_IC', 16, 16, 'tubing', '36G6L: SOIC_IC, 16L, tube');
SET @soicic16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_IC', 20, 20, 'taping', '36G6L: SOIC_IC, 20L, reel');
SET @soicic20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_IC', 20, 20, 'tubing', '36G6L: SOIC_IC, 20L, tube');
SET @soicic20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_W_FP', 28, 28, 'taping', '36G6L: SOIC_W_FP, 28L, reel');
SET @soicwfp28_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (83, 'F1', 'SOIC_W_FP', 28, 28, 'tubing', '36G6L: SOIC_W_FP, 28L, tube');
SET @soicwfp28_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 18 states costs 120min

--    (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (83, NULL, @soicw16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicw16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicw18_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicw18_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicw20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicw20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicw24_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicw24_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicw28_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicw28_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicic8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicic8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicic16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicic16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicic20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicic20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicwfp28_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (83, NULL, @soicwfp28_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');



-- ===== 15AT128 (machine_id=184, F1) =====

-- 1) States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (184, 'F1', 'SOIC_W', 16, 16, 'taping', '15AT128: SOIC_W, 16L, reel');
SET @soicw16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (184, 'F1', 'SOIC_W', 16, 16, 'tubing', '15AT128: SOIC_W, 16L, tube');
SET @soicw16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (184, 'F1', 'SOIC_W', 20, 20, 'taping', '15AT128: SOIC_W, 20L, reel');
SET @soicw20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (184, 'F1', 'SOIC_W', 20, 20, 'tubing', '15AT128: SOIC_W, 20L, tube');
SET @soicw20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (184, 'F1', 'SOIC_IC', 20, 20, 'taping', '15AT128: SOIC_IC, 20L, reel');
SET @soicic20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (184, 'F1', 'SOIC_IC', 20, 20, 'tubing', '15AT128: SOIC_IC, 20L, tube');
SET @soicic20_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 6 states costs 120min

--    (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (184, NULL, @soicw16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (184, NULL, @soicw16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (184, NULL, @soicw20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (184, NULL, @soicw20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (184, NULL, @soicic20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (184, NULL, @soicic20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');



-- ===== 09G6L (machine_id=56, F1) =====

-- 1) States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (56, 'F1', 'SOIC_W', 16, 16, 'taping', '09G6L: SOIC_W, 16L, reel');
SET @soicw16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (56, 'F1', 'SOIC_W', 16, 16, 'tubing', '09G6L: SOIC_W, 16L, tube');
SET @soicw16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (56, 'F1', 'SOIC_W', 20, 20, 'taping', '09G6L: SOIC_W, 20L, reel');
SET @soicw20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (56, 'F1', 'SOIC_W', 20, 20, 'tubing', '09G6L: SOIC_W, 20L, tube');
SET @soicw20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (56, 'F1', 'SOIC_IC', 8, 8, 'taping', '09G6L: SOIC_IC, 8L, reel');
SET @soicic8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (56, 'F1', 'SOIC_IC', 8, 8, 'tubing', '09G6L: SOIC_IC, 8L, tube');
SET @soicic8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (56, 'F1', 'SOIC_IC', 16, 16, 'taping', '09G6L: SOIC_IC, 16L, reel');
SET @soicic16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (56, 'F1', 'SOIC_IC', 16, 16, 'tubing', '09G6L: SOIC_IC, 16L, tube');
SET @soicic16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (56, 'F1', 'SOIC_W_FP', 28, 28, 'taping', '09G6L: SOIC_W_FP, 28L, reel');
SET @soicwfp28_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (56, 'F1', 'SOIC_W_FP', 28, 28, 'tubing', '09G6L: SOIC_W_FP, 28L, tube');
SET @soicwfp28_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 10 states costs 120min

--    (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (56, NULL, @soicw16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (56, NULL, @soicw16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (56, NULL, @soicw20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (56, NULL, @soicw20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (56, NULL, @soicic8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (56, NULL, @soicic8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (56, NULL, @soicic16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (56, NULL, @soicic16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (56, NULL, @soicwfp28_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (56, NULL, @soicwfp28_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');