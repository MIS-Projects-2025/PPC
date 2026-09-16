-- ===== 54G6L (machine_id=101, F3) =====

-- 1) States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (101, 'F3', 'SOIC_N', 8, 8, 'taping', '54G6L: SOIC_N, 8L, reel');
SET @soicn8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (101, 'F3', 'SOIC_N', 8, 8, 'tubing', '54G6L: SOIC_N, 8L, tube');
SET @soicn8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (101, 'F3', 'SOIC_N', 14, 14, 'taping', '54G6L: SOIC_N, 14L, reel');
SET @soicn14_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (101, 'F3', 'SOIC_N', 14, 14, 'tubing', '54G6L: SOIC_N, 14L, tube');
SET @soicn14_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (101, 'F3', 'SOIC_N', 16, 16, 'taping', '54G6L: SOIC_N, 16L, reel');
SET @soicn16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (101, 'F3', 'SOIC_N', 16, 16, 'tubing', '54G6L: SOIC_N, 16L, tube');
SET @soicn16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (101, 'F3', 'SOIC_N_EP', 8, 8, 'taping', '54G6L: SOIC_N_EP, 8L, reel');
SET @soicnep8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (101, 'F3', 'SOIC_N_EP', 8, 8, 'tubing', '54G6L: SOIC_N_EP, 8L, tube');
SET @soicnep8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (101, 'F3', 'QSOP', 16, 16, 'taping', '54G6L: QSOP, 16L, reel');
SET @qsop16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (101, 'F3', 'QSOP', 16, 16, 'tubing', '54G6L: QSOP, 16L, tube');
SET @qsop16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (101, 'F3', 'QSOP', 20, 20, 'taping', '54G6L: QSOP, 20L, reel');
SET @qsop20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (101, 'F3', 'QSOP', 20, 20, 'tubing', '54G6L: QSOP, 20L, tube');
SET @qsop20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (101, 'F3', 'QSOP', 28, 28, 'taping', '54G6L: QSOP, 28L, reel');
SET @qsop28_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (101, 'F3', 'QSOP', 28, 28, 'tubing', '54G6L: QSOP, 28L, tube');
SET @qsop28_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (101, 'F3', 'SOIC_W', 20, 20, 'taping', '54G6L: SOIC_W, 20L, reel');
SET @soicw20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (101, 'F3', 'SOIC_W', 20, 20, 'tubing', '54G6L: SOIC_W, 20L, tube');
SET @soicw20_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 16 states costs 120min

--    (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (101, NULL, @soicn8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (101, NULL, @soicn8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (101, NULL, @soicn14_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (101, NULL, @soicn14_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (101, NULL, @soicn16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (101, NULL, @soicn16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (101, NULL, @soicnep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (101, NULL, @soicnep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (101, NULL, @qsop16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (101, NULL, @qsop16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (101, NULL, @qsop20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (101, NULL, @qsop20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (101, NULL, @qsop28_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (101, NULL, @qsop28_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (101, NULL, @soicw20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (101, NULL, @soicw20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');



-- ===== 33G6L (machine_id=80, F1) =====

-- 1) States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'SOIC_N', 8, 8, 'taping', '33G6L: SOIC_N, 8L, reel');
SET @soicn8_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'SOIC_N', 8, 8, 'tubing', '33G6L: SOIC_N, 8L, tube');
SET @soicn8_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'SOIC_N', 14, 14, 'taping', '33G6L: SOIC_N, 14L, reel');
SET @soicn14_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'SOIC_N', 14, 14, 'tubing', '33G6L: SOIC_N, 14L, tube');
SET @soicn14_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'SOIC_N', 16, 16, 'taping', '33G6L: SOIC_N, 16L, reel');
SET @soicn16_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'SOIC_N', 16, 16, 'tubing', '33G6L: SOIC_N, 16L, tube');
SET @soicn16_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'QSOP', 16, 16, 'taping', '33G6L: QSOP, 16L, reel');
SET @qsop16_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'QSOP', 16, 16, 'tubing', '33G6L: QSOP, 16L, tube');
SET @qsop16_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'QSOP', 20, 20, 'taping', '33G6L: QSOP, 20L, reel');
SET @qsop20_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'QSOP', 20, 20, 'tubing', '33G6L: QSOP, 20L, tube');
SET @qsop20_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'QSOP_EP', 16, 16, 'taping', '33G6L: QSOP_EP, 16L, reel');
SET @qsopep16_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'QSOP_EP', 16, 16, 'tubing', '33G6L: QSOP_EP, 16L, tube');
SET @qsopep16_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 12 states costs 120min

--    (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO qdn_db.machine_transition_rules
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (80, NULL, @soicn8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (80, NULL, @soicn8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (80, NULL, @soicn14_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (80, NULL, @soicn14_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (80, NULL, @soicn16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (80, NULL, @soicn16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (80, NULL, @qsop16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (80, NULL, @qsop16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (80, NULL, @qsop20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (80, NULL, @qsop20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (80, NULL, @qsopep16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (80, NULL, @qsopep16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');



-- ===== 42G6L (machine_id=89, F1) =====

-- 1) States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'SOIC_N', 8, 8, 'taping', '42G6L: SOIC_N, 8L, reel');
SET @soicn8_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'SOIC_N', 8, 8, 'tubing', '42G6L: SOIC_N, 8L, tube');
SET @soicn8_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'SOIC_N', 14, 14, 'taping', '42G6L: SOIC_N, 14L, reel');
SET @soicn14_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'SOIC_N', 14, 14, 'tubing', '42G6L: SOIC_N, 14L, tube');
SET @soicn14_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'SOIC_N', 16, 16, 'taping', '42G6L: SOIC_N, 16L, reel');
SET @soicn16_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'SOIC_N', 16, 16, 'tubing', '42G6L: SOIC_N, 16L, tube');
SET @soicn16_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'SOIC_N_EP', 8, 8, 'taping', '42G6L: SOIC_N_EP, 8L, reel');
SET @soicnep8_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'SOIC_N_EP', 8, 8, 'tubing', '42G6L: SOIC_N_EP, 8L, tube');
SET @soicnep8_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'QSOP', 16, 16, 'taping', '42G6L: QSOP, 16L, reel');
SET @qsop16_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'QSOP', 16, 16, 'tubing', '42G6L: QSOP, 16L, tube');
SET @qsop16_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'QSOP', 20, 20, 'taping', '42G6L: QSOP, 20L, reel');
SET @qsop20_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'QSOP', 20, 20, 'tubing', '42G6L: QSOP, 20L, tube');
SET @qsop20_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'QSOP_EP', 16, 16, 'taping', '42G6L: QSOP_EP, 16L, reel');
SET @qsopep16_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'QSOP_EP', 16, 16, 'tubing', '42G6L: QSOP_EP, 16L, tube');
SET @qsopep16_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 14 states costs 120min

--    (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO qdn_db.machine_transition_rules
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (89, NULL, @soicn8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (89, NULL, @soicn8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (89, NULL, @soicn14_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (89, NULL, @soicn14_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (89, NULL, @soicn16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (89, NULL, @soicn16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (89, NULL, @soicnep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (89, NULL, @soicnep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (89, NULL, @qsop16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (89, NULL, @qsop16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (89, NULL, @qsop20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (89, NULL, @qsop20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (89, NULL, @qsopep16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (89, NULL, @qsopep16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');



-- ===== 47G6L (machine_id=94, F1) =====

-- 1) States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'SOIC_N', 8, 8, 'taping', '47G6L: SOIC_N, 8L, reel');
SET @soicn8_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'SOIC_N', 8, 8, 'tubing', '47G6L: SOIC_N, 8L, tube');
SET @soicn8_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'SOIC_N', 14, 14, 'taping', '47G6L: SOIC_N, 14L, reel');
SET @soicn14_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'SOIC_N', 14, 14, 'tubing', '47G6L: SOIC_N, 14L, tube');
SET @soicn14_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'SOIC_N', 16, 16, 'taping', '47G6L: SOIC_N, 16L, reel');
SET @soicn16_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'SOIC_N', 16, 16, 'tubing', '47G6L: SOIC_N, 16L, tube');
SET @soicn16_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'SOIC_N_EP', 8, 8, 'taping', '47G6L: SOIC_N_EP, 8L, reel');
SET @soicnep8_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'SOIC_N_EP', 8, 8, 'tubing', '47G6L: SOIC_N_EP, 8L, tube');
SET @soicnep8_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'QSOP', 16, 16, 'taping', '47G6L: QSOP, 16L, reel');
SET @qsop16_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'QSOP', 16, 16, 'tubing', '47G6L: QSOP, 16L, tube');
SET @qsop16_tubing = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'QSOP', 20, 20, 'taping', '47G6L: QSOP, 20L, reel');
SET @qsop20_taping = LAST_INSERT_ID();

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'QSOP', 20, 20, 'tubing', '47G6L: QSOP, 20L, tube');
SET @qsop20_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 12 states costs 120min

--    (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO qdn_db.machine_transition_rules
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (94, NULL, @soicn8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (94, NULL, @soicn8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (94, NULL, @soicn14_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (94, NULL, @soicn14_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (94, NULL, @soicn16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (94, NULL, @soicn16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (94, NULL, @soicnep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (94, NULL, @soicnep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (94, NULL, @qsop16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (94, NULL, @qsop16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (94, NULL, @qsop20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (94, NULL, @qsop20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');



-- ===== 45AT28 (machine_id=251, F1) =====

-- 1) States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (251, 'F1', 'SOIC_N', 8, 8, 'taping', '45AT28: SOIC_N, 8L, reel');
SET @soicn8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (251, 'F1', 'SOIC_N', 8, 8, 'tubing', '45AT28: SOIC_N, 8L, tube');
SET @soicn8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (251, 'F1', 'SOIC_N', 14, 14, 'taping', '45AT28: SOIC_N, 14L, reel');
SET @soicn14_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (251, 'F1', 'SOIC_N', 14, 14, 'tubing', '45AT28: SOIC_N, 14L, tube');
SET @soicn14_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (251, 'F1', 'SOIC_N', 16, 16, 'taping', '45AT28: SOIC_N, 16L, reel');
SET @soicn16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (251, 'F1', 'SOIC_N', 16, 16, 'tubing', '45AT28: SOIC_N, 16L, tube');
SET @soicn16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (251, 'F1', 'SOIC_N_EP', 8, 8, 'taping', '45AT28: SOIC_N_EP, 8L, reel');
SET @soicnep8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (251, 'F1', 'SOIC_N_EP', 8, 8, 'tubing', '45AT28: SOIC_N_EP, 8L, tube');
SET @soicnep8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (251, 'F1', 'QSOP', 16, 16, 'taping', '45AT28: QSOP, 16L, reel');
SET @qsop16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (251, 'F1', 'QSOP', 16, 16, 'tubing', '45AT28: QSOP, 16L, tube');
SET @qsop16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (251, 'F1', 'QSOP', 20, 20, 'taping', '45AT28: QSOP, 20L, reel');
SET @qsop20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (251, 'F1', 'QSOP', 20, 20, 'tubing', '45AT28: QSOP, 20L, tube');
SET @qsop20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (251, 'F1', 'QSOP_EP', 16, 16, 'taping', '45AT28: QSOP_EP, 16L, reel');
SET @qsopep16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (251, 'F1', 'QSOP_EP', 16, 16, 'tubing', '45AT28: QSOP_EP, 16L, tube');
SET @qsopep16_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 14 states costs 120min

--    (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (251, NULL, @soicn8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (251, NULL, @soicn8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (251, NULL, @soicn14_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (251, NULL, @soicn14_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (251, NULL, @soicn16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (251, NULL, @soicn16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (251, NULL, @soicnep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (251, NULL, @soicnep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (251, NULL, @qsop16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (251, NULL, @qsop16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (251, NULL, @qsop20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (251, NULL, @qsop20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (251, NULL, @qsopep16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (251, NULL, @qsopep16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');



-- ===== 51AT28 (machine_id=216, F1) =====

-- 1) States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (216, 'F1', 'SOIC_N', 8, 8, 'taping', '51AT28: SOIC_N, 8L, reel');
SET @soicn8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (216, 'F1', 'SOIC_N', 8, 8, 'tubing', '51AT28: SOIC_N, 8L, tube');
SET @soicn8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (216, 'F1', 'SOIC_N', 14, 14, 'taping', '51AT28: SOIC_N, 14L, reel');
SET @soicn14_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (216, 'F1', 'SOIC_N', 14, 14, 'tubing', '51AT28: SOIC_N, 14L, tube');
SET @soicn14_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (216, 'F1', 'SOIC_N', 16, 16, 'taping', '51AT28: SOIC_N, 16L, reel');
SET @soicn16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (216, 'F1', 'SOIC_N', 16, 16, 'tubing', '51AT28: SOIC_N, 16L, tube');
SET @soicn16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (216, 'F1', 'SOIC_N_EP', 8, 8, 'taping', '51AT28: SOIC_N_EP, 8L, reel');
SET @soicnep8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (216, 'F1', 'SOIC_N_EP', 8, 8, 'tubing', '51AT28: SOIC_N_EP, 8L, tube');
SET @soicnep8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (216, 'F1', 'QSOP', 16, 16, 'taping', '51AT28: QSOP, 16L, reel');
SET @qsop16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (216, 'F1', 'QSOP', 16, 16, 'tubing', '51AT28: QSOP, 16L, tube');
SET @qsop16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (216, 'F1', 'QSOP', 20, 20, 'taping', '51AT28: QSOP, 20L, reel');
SET @qsop20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (216, 'F1', 'QSOP', 20, 20, 'tubing', '51AT28: QSOP, 20L, tube');
SET @qsop20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (216, 'F1', 'QSOP', 24, 24, 'taping', '51AT28: QSOP, 24L, reel');
SET @qsop24_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (216, 'F1', 'QSOP', 24, 24, 'tubing', '51AT28: QSOP, 24L, tube');
SET @qsop24_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (216, 'F1', 'QSOP_EP', 16, 16, 'taping', '51AT28: QSOP_EP, 16L, reel');
SET @qsopep16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (216, 'F1', 'QSOP_EP', 16, 16, 'tubing', '51AT28: QSOP_EP, 16L, tube');
SET @qsopep16_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 16 states costs 120min

--    (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (216, NULL, @soicn8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (216, NULL, @soicn8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (216, NULL, @soicn14_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (216, NULL, @soicn14_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (216, NULL, @soicn16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (216, NULL, @soicn16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (216, NULL, @soicnep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (216, NULL, @soicnep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (216, NULL, @qsop16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (216, NULL, @qsop16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (216, NULL, @qsop20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (216, NULL, @qsop20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (216, NULL, @qsop24_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (216, NULL, @qsop24_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (216, NULL, @qsopep16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (216, NULL, @qsopep16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');



-- ===== 58AT28 (machine_id=260, F1) =====

-- 1) States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'SOIC_N', 8, 8, 'taping', '58AT28: SOIC_N, 8L, reel');
SET @soicn8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'SOIC_N', 8, 8, 'tubing', '58AT28: SOIC_N, 8L, tube');
SET @soicn8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'SOIC_N', 14, 14, 'taping', '58AT28: SOIC_N, 14L, reel');
SET @soicn14_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'SOIC_N', 14, 14, 'tubing', '58AT28: SOIC_N, 14L, tube');
SET @soicn14_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'SOIC_N', 16, 16, 'taping', '58AT28: SOIC_N, 16L, reel');
SET @soicn16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'SOIC_N', 16, 16, 'tubing', '58AT28: SOIC_N, 16L, tube');
SET @soicn16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'SOIC_N_EP', 8, 8, 'taping', '58AT28: SOIC_N_EP, 8L, reel');
SET @soicnep8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'SOIC_N_EP', 8, 8, 'tubing', '58AT28: SOIC_N_EP, 8L, tube');
SET @soicnep8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'QSOP', 16, 16, 'taping', '58AT28: QSOP, 16L, reel');
SET @qsop16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'QSOP', 16, 16, 'tubing', '58AT28: QSOP, 16L, tube');
SET @qsop16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'QSOP', 20, 20, 'taping', '58AT28: QSOP, 20L, reel');
SET @qsop20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'QSOP', 20, 20, 'tubing', '58AT28: QSOP, 20L, tube');
SET @qsop20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'QSOP', 24, 24, 'taping', '58AT28: QSOP, 24L, reel');
SET @qsop24_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'QSOP', 24, 24, 'tubing', '58AT28: QSOP, 24L, tube');
SET @qsop24_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'QSOP', 28, 28, 'taping', '58AT28: QSOP, 28L, reel');
SET @qsop28_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'QSOP', 28, 28, 'tubing', '58AT28: QSOP, 28L, tube');
SET @qsop28_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'QSOP_EP', 16, 16, 'taping', '58AT28: QSOP_EP, 16L, reel');
SET @qsopep16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (260, 'F1', 'QSOP_EP', 16, 16, 'tubing', '58AT28: QSOP_EP, 16L, tube');
SET @qsopep16_tubing = LAST_INSERT_ID();


-- 2) Any state on this machine -> each of the 18 states costs 120min

--    (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (260, NULL, @soicn8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @soicn8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @soicn14_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @soicn14_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @soicn16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @soicn16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @soicnep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @soicnep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @qsop16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @qsop16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @qsop20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @qsop20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @qsop24_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @qsop24_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @qsop28_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @qsop28_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @qsopep16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (260, NULL, @qsopep16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');