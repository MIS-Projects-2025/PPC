-- =============================================================================
-- COMPILED MIGRATION: machine_setup_states + machine_transition_rules seed data
-- Table of contents (in chronological order across the whole seeding session):
--   1. 70AT28          (266, F1)
--   2. 11AT128 ADGT    (182, F1)  <-- original single-state row [SUPERSEDED]
--   3. 11AT128 ADGT    (182, F1)  <-- reel/tube split [FINAL]
--   4. 04MV853A ADGT   (229, F1)  <-- SOIC_N / SOIC_N_EP
--   5. 04G6L           (51, F1)
--   6. 07G6L           (54, F1)
--   7. 12G6L           (59, F1)
--   8. 21G6L           (68, F1)
--   9. 38G6L           (85, F1)
--  10. 57G6L           (104, F1)
--  11. 43G6L           (90, F1)
--  12. 05G6L           (52, F1)
--  13. 01MV883         (249, F1)  <-- mixed durations: 6hr leadcount conversion + 2hr ramp
--  14. 10G6L           (57, F1)
--  15. 54G6L           (101, F3)  <-- different factory from the other G6L machines
--  16. 33G6L           (80, F1)
--  17. 42G6L           (89, F1)  <-- "SET-UP" stray line from source data dropped
--  18. 47G6L           (94, F1)
--  19. 45AT28          (251, F1)
--  20. 51AT28          (216, F1)
--  21. 58AT28          (260, F1)
--  22. 08G6L           (55, F1)
--  23. 11G6L           (58, F1)
--  24. 48G6L           (95, F1)
--  25. 53G6L           (100, F1)
--  26. 36G6L           (83, F1)
--  27. 15AT128         (184, F1)
--  28. 09G6L           (56, F1)
--  29. 39G6L
--
-- IMPORTANT: run each machine's block start-to-finish in the SAME session
-- before moving to the next (session @-variables get reused across sections,
-- e.g. @soicn8_taping appears in many blocks -- they must not be interleaved).
-- =============================================================================

-- ==============================================================================
-- 70AT28 (machine_id=266, F1) -- LCC, 8L/14L, reel<->tray
-- ==============================================================================

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (266, 'F1', 'LCC', '8,14', 'taping', '70AT28: LCC, 8L/14L, reel');
SET @lcc_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (266, 'F1', 'LCC', '8,14', 'tray', '70AT28: LCC, 8L/14L, tray');
SET @lcc_tray = LAST_INSERT_ID();

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (266, @lcc_tape, @lcc_tray, 'setup', 120, 'ramp medium change'),
  (266, @lcc_tray, @lcc_tape, 'setup', 120, 'ramp medium change');


-- ==============================================================================
-- 11AT128 ADGT (machine_id=182, F1) -- original single-state row [SUPERSEDED, see below]
-- ==============================================================================

-- NOTE: this single-state row was superseded by the reel/tube split below
--       (same machine/package/leadcount, just not split by process_type).
--       Flagging in case it's now a redundant duplicate in production --
--       consider deleting this row if the reel/tube split fully replaces it.
INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `focus_group`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES
  (182, 'F1', 'MPD', 'LFCSP', 32, 32, 'both', '11AT128 ADGT: LFCSP MPD, 32L');


-- ==============================================================================
-- 11AT128 ADGT (machine_id=182, F1) -- LFCSP MPD, 32L, reel<->tube [FINAL]
-- ==============================================================================

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `focus_group`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (182, 'F1', 'MPD', 'LFCSP', 32, 32, 'taping', '11AT128 ADGT: LFCSP MPD, 32L, reel');
SET @lfcsp_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `focus_group`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (182, 'F1', 'MPD', 'LFCSP', 32, 32, 'tubing', '11AT128 ADGT: LFCSP MPD, 32L, tube');
SET @lfcsp_tube = LAST_INSERT_ID();

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (182, @lfcsp_tape, @lfcsp_tube, 'setup', 120, 'ramp medium change'),
  (182, @lfcsp_tube, @lfcsp_tape, 'setup', 120, 'ramp medium change');


-- ==============================================================================
-- 04MV853A ADGT (machine_id=229, F1) -- SOIC_N/SOIC_N_EP, reel<->tube + package change
-- ==============================================================================

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (229, 'F1', 'SOIC_N', '8,14,16', 'taping', '04MV853A (ADGT): SOIC_N, 8L/14L/16L, reel');
SET @n_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (229, 'F1', 'SOIC_N', '8,14,16', 'tubing', '04MV853A (ADGT): SOIC_N, 8L/14L/16L, tube');
SET @n_tube = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (229, 'F1', 'SOIC_N_EP', '16', 'taping', '04MV853A (ADGT): SOIC_N_EP, 16L, reel');
SET @nep_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (229, 'F1', 'SOIC_N_EP', '16', 'tubing', '04MV853A (ADGT): SOIC_N_EP, 16L, tube');
SET @nep_tube = LAST_INSERT_ID();

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (229, @n_tape, @nep_tape, 'setup', 120, 'SOIC_N <-> SOIC_N_EP, package change'),
  (229, @nep_tape, @n_tape, 'setup', 120, 'SOIC_N <-> SOIC_N_EP, package change'),
  (229, @n_tube, @nep_tube, 'setup', 120, 'SOIC_N <-> SOIC_N_EP, package change'),
  (229, @nep_tube, @n_tube, 'setup', 120, 'SOIC_N <-> SOIC_N_EP, package change'),
  (229, @n_tape, @n_tube, 'setup', 120, 'ramp medium change'),
  (229, @n_tube, @n_tape, 'setup', 120, 'ramp medium change'),
  (229, @nep_tape, @nep_tube, 'setup', 120, 'ramp medium change'),
  (229, @nep_tube, @nep_tape, 'setup', 120, 'ramp medium change');


-- ==============================================================================
-- 04G6L (machine_id=51, F1) -- 4 package/leadcount groups, 8 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (51, 'F1', 'MINI_SO', 8, 8, 'taping', '04G6L: MINI_SO, 8L, reel');
SET @miniso8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (51, 'F1', 'MINI_SO', 8, 8, 'tubing', '04G6L: MINI_SO, 8L, tube');
SET @miniso8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (51, 'F1', 'MINI_SO', 10, 10, 'taping', '04G6L: MINI_SO, 10L, reel');
SET @miniso10_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (51, 'F1', 'MINI_SO', 10, 10, 'tubing', '04G6L: MINI_SO, 10L, tube');
SET @miniso10_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (51, 'F1', 'MINI_SO_EP', 8, 8, 'taping', '04G6L: MINI_SO_EP, 8L, reel');
SET @minisoep8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (51, 'F1', 'MINI_SO_EP', 8, 8, 'tubing', '04G6L: MINI_SO_EP, 8L, tube');
SET @minisoep8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (51, 'F1', 'SOIC_N', 14, 14, 'taping', '04G6L: SOIC_N, 14L, reel');
SET @soicn14_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (51, 'F1', 'SOIC_N', 14, 14, 'tubing', '04G6L: SOIC_N, 14L, tube');
SET @soicn14_tubing = LAST_INSERT_ID();


-- Any state on this machine -> each of the 8 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (51, NULL, @miniso8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (51, NULL, @miniso8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (51, NULL, @miniso10_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (51, NULL, @miniso10_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (51, NULL, @minisoep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (51, NULL, @minisoep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (51, NULL, @soicn14_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (51, NULL, @soicn14_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');


-- ==============================================================================
-- 07G6L (machine_id=54, F1) -- 4 package/leadcount groups, 8 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (54, 'F1', 'MINI_SO', 8, 8, 'taping', '07G6L: MINI_SO, 8L, reel');
SET @miniso8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (54, 'F1', 'MINI_SO', 8, 8, 'tubing', '07G6L: MINI_SO, 8L, tube');
SET @miniso8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (54, 'F1', 'MINI_SO', 10, 10, 'taping', '07G6L: MINI_SO, 10L, reel');
SET @miniso10_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (54, 'F1', 'MINI_SO', 10, 10, 'tubing', '07G6L: MINI_SO, 10L, tube');
SET @miniso10_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (54, 'F1', 'MINI_SO_EP', 8, 8, 'taping', '07G6L: MINI_SO_EP, 8L, reel');
SET @minisoep8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (54, 'F1', 'MINI_SO_EP', 8, 8, 'tubing', '07G6L: MINI_SO_EP, 8L, tube');
SET @minisoep8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (54, 'F1', 'MINI_SO_EP', 10, 10, 'taping', '07G6L: MINI_SO_EP, 10L, reel');
SET @minisoep10_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (54, 'F1', 'MINI_SO_EP', 10, 10, 'tubing', '07G6L: MINI_SO_EP, 10L, tube');
SET @minisoep10_tubing = LAST_INSERT_ID();


-- Any state on this machine -> each of the 8 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (54, NULL, @miniso8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (54, NULL, @miniso8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (54, NULL, @miniso10_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (54, NULL, @miniso10_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (54, NULL, @minisoep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (54, NULL, @minisoep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (54, NULL, @minisoep10_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (54, NULL, @minisoep10_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');


-- ==============================================================================
-- 12G6L (machine_id=59, F1) -- 5 package/leadcount groups, 10 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (59, 'F1', 'MINI_SO', 8, 8, 'taping', '12G6L: MINI_SO, 8L, reel');
SET @miniso8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (59, 'F1', 'MINI_SO', 8, 8, 'tubing', '12G6L: MINI_SO, 8L, tube');
SET @miniso8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (59, 'F1', 'MINI_SO', 10, 10, 'taping', '12G6L: MINI_SO, 10L, reel');
SET @miniso10_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (59, 'F1', 'MINI_SO', 10, 10, 'tubing', '12G6L: MINI_SO, 10L, tube');
SET @miniso10_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (59, 'F1', 'MINI_SO_EP', 8, 8, 'taping', '12G6L: MINI_SO_EP, 8L, reel');
SET @minisoep8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (59, 'F1', 'MINI_SO_EP', 8, 8, 'tubing', '12G6L: MINI_SO_EP, 8L, tube');
SET @minisoep8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (59, 'F1', 'MINI_SO_EP', 10, 10, 'taping', '12G6L: MINI_SO_EP, 10L, reel');
SET @minisoep10_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (59, 'F1', 'MINI_SO_EP', 10, 10, 'tubing', '12G6L: MINI_SO_EP, 10L, tube');
SET @minisoep10_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (59, 'F1', 'SOIC_N', 8, 8, 'taping', '12G6L: SOIC_N, 8L, reel');
SET @soicn8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (59, 'F1', 'SOIC_N', 8, 8, 'tubing', '12G6L: SOIC_N, 8L, tube');
SET @soicn8_tubing = LAST_INSERT_ID();


-- Any state on this machine -> each of the 10 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (59, NULL, @miniso8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (59, NULL, @miniso8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (59, NULL, @miniso10_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (59, NULL, @miniso10_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (59, NULL, @minisoep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (59, NULL, @minisoep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (59, NULL, @minisoep10_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (59, NULL, @minisoep10_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (59, NULL, @soicn8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (59, NULL, @soicn8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');


-- ==============================================================================
-- 21G6L (machine_id=68, F1) -- 5 package/leadcount groups, 10 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (68, 'F1', 'MINI_SO', 8, 8, 'taping', '21G6L: MINI_SO, 8L, reel');
SET @miniso8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (68, 'F1', 'MINI_SO', 8, 8, 'tubing', '21G6L: MINI_SO, 8L, tube');
SET @miniso8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (68, 'F1', 'MINI_SO', 10, 10, 'taping', '21G6L: MINI_SO, 10L, reel');
SET @miniso10_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (68, 'F1', 'MINI_SO', 10, 10, 'tubing', '21G6L: MINI_SO, 10L, tube');
SET @miniso10_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (68, 'F1', 'MINI_SO', 12, 12, 'taping', '21G6L: MINI_SO, 12L, reel');
SET @miniso12_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (68, 'F1', 'MINI_SO', 12, 12, 'tubing', '21G6L: MINI_SO, 12L, tube');
SET @miniso12_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (68, 'F1', 'MINI_SO_EP', 8, 8, 'taping', '21G6L: MINI_SO_EP, 8L, reel');
SET @minisoep8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (68, 'F1', 'MINI_SO_EP', 8, 8, 'tubing', '21G6L: MINI_SO_EP, 8L, tube');
SET @minisoep8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (68, 'F1', 'MINI_SO_EP', 10, 10, 'taping', '21G6L: MINI_SO_EP, 10L, reel');
SET @minisoep10_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (68, 'F1', 'MINI_SO_EP', 10, 10, 'tubing', '21G6L: MINI_SO_EP, 10L, tube');
SET @minisoep10_tubing = LAST_INSERT_ID();


-- Any state on this machine -> each of the 10 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (68, NULL, @miniso8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (68, NULL, @miniso8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (68, NULL, @miniso10_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (68, NULL, @miniso10_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (68, NULL, @miniso12_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (68, NULL, @miniso12_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (68, NULL, @minisoep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (68, NULL, @minisoep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (68, NULL, @minisoep10_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (68, NULL, @minisoep10_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');


-- ==============================================================================
-- 38G6L (machine_id=85, F1) -- 4 package/leadcount groups, 8 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (85, 'F1', 'MINI_SO', 8, 8, 'taping', '38G6L: MINI_SO, 8L, reel');
SET @miniso8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (85, 'F1', 'MINI_SO', 8, 8, 'tubing', '38G6L: MINI_SO, 8L, tube');
SET @miniso8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (85, 'F1', 'MINI_SO', 10, 10, 'taping', '38G6L: MINI_SO, 10L, reel');
SET @miniso10_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (85, 'F1', 'MINI_SO', 10, 10, 'tubing', '38G6L: MINI_SO, 10L, tube');
SET @miniso10_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (85, 'F1', 'MINI_SO_EP', 8, 8, 'taping', '38G6L: MINI_SO_EP, 8L, reel');
SET @minisoep8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (85, 'F1', 'MINI_SO_EP', 8, 8, 'tubing', '38G6L: MINI_SO_EP, 8L, tube');
SET @minisoep8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (85, 'F1', 'MINI_SO_EP', 10, 10, 'taping', '38G6L: MINI_SO_EP, 10L, reel');
SET @minisoep10_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (85, 'F1', 'MINI_SO_EP', 10, 10, 'tubing', '38G6L: MINI_SO_EP, 10L, tube');
SET @minisoep10_tubing = LAST_INSERT_ID();


-- Any state on this machine -> each of the 8 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (85, NULL, @miniso8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (85, NULL, @miniso8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (85, NULL, @miniso10_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (85, NULL, @miniso10_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (85, NULL, @minisoep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (85, NULL, @minisoep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (85, NULL, @minisoep10_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (85, NULL, @minisoep10_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');


-- ==============================================================================
-- 57G6L (machine_id=104, F1) -- 4 package/leadcount groups, 8 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (104, 'F1', 'MINI_SO', 8, 8, 'taping', '57G6L: MINI_SO, 8L, reel');
SET @miniso8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (104, 'F1', 'MINI_SO', 8, 8, 'tubing', '57G6L: MINI_SO, 8L, tube');
SET @miniso8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (104, 'F1', 'MINI_SO', 10, 10, 'taping', '57G6L: MINI_SO, 10L, reel');
SET @miniso10_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (104, 'F1', 'MINI_SO', 10, 10, 'tubing', '57G6L: MINI_SO, 10L, tube');
SET @miniso10_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (104, 'F1', 'MINI_SO_EP', 8, 8, 'taping', '57G6L: MINI_SO_EP, 8L, reel');
SET @minisoep8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (104, 'F1', 'MINI_SO_EP', 8, 8, 'tubing', '57G6L: MINI_SO_EP, 8L, tube');
SET @minisoep8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (104, 'F1', 'MINI_SO_EP', 10, 10, 'taping', '57G6L: MINI_SO_EP, 10L, reel');
SET @minisoep10_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (104, 'F1', 'MINI_SO_EP', 10, 10, 'tubing', '57G6L: MINI_SO_EP, 10L, tube');
SET @minisoep10_tubing = LAST_INSERT_ID();


-- Any state on this machine -> each of the 8 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (104, NULL, @miniso8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (104, NULL, @miniso8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (104, NULL, @miniso10_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (104, NULL, @miniso10_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (104, NULL, @minisoep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (104, NULL, @minisoep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (104, NULL, @minisoep10_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (104, NULL, @minisoep10_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');


-- ==============================================================================
-- 43G6L (machine_id=90, F1) -- 9 package/leadcount groups, 18 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO', 8, 8, 'taping', '43G6L: MINI_SO, 8L, reel');
SET @miniso8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO', 8, 8, 'tubing', '43G6L: MINI_SO, 8L, tube');
SET @miniso8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO', 10, 10, 'taping', '43G6L: MINI_SO, 10L, reel');
SET @miniso10_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO', 10, 10, 'tubing', '43G6L: MINI_SO, 10L, tube');
SET @miniso10_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO', 12, 12, 'taping', '43G6L: MINI_SO, 12L, reel');
SET @miniso12_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO', 12, 12, 'tubing', '43G6L: MINI_SO, 12L, tube');
SET @miniso12_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO', 16, 16, 'taping', '43G6L: MINI_SO, 16L, reel');
SET @miniso16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO', 16, 16, 'tubing', '43G6L: MINI_SO, 16L, tube');
SET @miniso16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO_EP', 3, 3, 'taping', '43G6L: MINI_SO_EP, 3L, reel');
SET @minisoep3_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO_EP', 3, 3, 'tubing', '43G6L: MINI_SO_EP, 3L, tube');
SET @minisoep3_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO_EP', 8, 8, 'taping', '43G6L: MINI_SO_EP, 8L, reel');
SET @minisoep8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO_EP', 8, 8, 'tubing', '43G6L: MINI_SO_EP, 8L, tube');
SET @minisoep8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO_EP', 10, 10, 'taping', '43G6L: MINI_SO_EP, 10L, reel');
SET @minisoep10_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO_EP', 10, 10, 'tubing', '43G6L: MINI_SO_EP, 10L, tube');
SET @minisoep10_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO_EP', 12, 12, 'taping', '43G6L: MINI_SO_EP, 12L, reel');
SET @minisoep12_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO_EP', 12, 12, 'tubing', '43G6L: MINI_SO_EP, 12L, tube');
SET @minisoep12_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO_EP', 16, 16, 'taping', '43G6L: MINI_SO_EP, 16L, reel');
SET @minisoep16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (90, 'F1', 'MINI_SO_EP', 16, 16, 'tubing', '43G6L: MINI_SO_EP, 16L, tube');
SET @minisoep16_tubing = LAST_INSERT_ID();


-- Any state on this machine -> each of the 18 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (90, NULL, @miniso8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @miniso8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @miniso10_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @miniso10_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @miniso12_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @miniso12_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @miniso16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @miniso16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @minisoep3_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @minisoep3_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @minisoep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @minisoep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @minisoep10_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @minisoep10_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @minisoep12_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @minisoep12_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @minisoep16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (90, NULL, @minisoep16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');


-- ==============================================================================
-- 05G6L (machine_id=52, F1) -- 4 package/leadcount groups, 8 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (52, 'F1', 'MINI_SO', 8, 8, 'taping', '05G6L: MINI_SO, 8L, reel');
SET @miniso8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (52, 'F1', 'MINI_SO', 8, 8, 'tubing', '05G6L: MINI_SO, 8L, tube');
SET @miniso8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (52, 'F1', 'MINI_SO', 10, 10, 'taping', '05G6L: MINI_SO, 10L, reel');
SET @miniso10_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (52, 'F1', 'MINI_SO', 10, 10, 'tubing', '05G6L: MINI_SO, 10L, tube');
SET @miniso10_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (52, 'F1', 'MINI_SO_EP', 8, 8, 'taping', '05G6L: MINI_SO_EP, 8L, reel');
SET @minisoep8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (52, 'F1', 'MINI_SO_EP', 8, 8, 'tubing', '05G6L: MINI_SO_EP, 8L, tube');
SET @minisoep8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (52, 'F1', 'MINI_SO_EP', 10, 10, 'taping', '05G6L: MINI_SO_EP, 10L, reel');
SET @minisoep10_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (52, 'F1', 'MINI_SO_EP', 10, 10, 'tubing', '05G6L: MINI_SO_EP, 10L, tube');
SET @minisoep10_tubing = LAST_INSERT_ID();


-- Any state on this machine -> each of the 8 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (52, NULL, @miniso8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (52, NULL, @miniso8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (52, NULL, @miniso10_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (52, NULL, @miniso10_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (52, NULL, @minisoep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (52, NULL, @minisoep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (52, NULL, @minisoep10_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (52, NULL, @minisoep10_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');


-- ==============================================================================
-- 01MV883 (machine_id=249, F1) -- PLCC, mixed durations: 6hr leadcount conversion, 2hr ramp setup [UNIQUE]
-- ==============================================================================

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (249, 'F1', 'PLCC', 20, 20, 'taping', '01MV883: PLCC, 20L, reel');
SET @plcc20_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (249, 'F1', 'PLCC', 20, 20, 'tubing', '01MV883: PLCC, 20L, tube');
SET @plcc20_tube = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (249, 'F1', 'PLCC', 28, 28, 'taping', '01MV883: PLCC, 28L, reel');
SET @plcc28_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (249, 'F1', 'PLCC', 28, 28, 'tubing', '01MV883: PLCC, 28L, tube');
SET @plcc28_tube = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (249, 'F1', 'PLCC', 44, 44, 'taping', '01MV883: PLCC, 44L, reel');
SET @plcc44_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (249, 'F1', 'PLCC', 44, 44, 'tubing', '01MV883: PLCC, 44L, tube');
SET @plcc44_tube = LAST_INSERT_ID();

-- Leadcount conversion (6hrs), within same process type
INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (249, @plcc20_tape, @plcc28_tape, 'conversion', 360, 'PLCC leadcount change 20L<->28L'),
  (249, @plcc28_tape, @plcc20_tape, 'conversion', 360, 'PLCC leadcount change 20L<->28L'),
  (249, @plcc20_tape, @plcc44_tape, 'conversion', 360, 'PLCC leadcount change 20L<->44L'),
  (249, @plcc44_tape, @plcc20_tape, 'conversion', 360, 'PLCC leadcount change 20L<->44L'),
  (249, @plcc28_tape, @plcc44_tape, 'conversion', 360, 'PLCC leadcount change 28L<->44L'),
  (249, @plcc44_tape, @plcc28_tape, 'conversion', 360, 'PLCC leadcount change 28L<->44L'),
  (249, @plcc20_tube, @plcc28_tube, 'conversion', 360, 'PLCC leadcount change 20L<->28L'),
  (249, @plcc28_tube, @plcc20_tube, 'conversion', 360, 'PLCC leadcount change 20L<->28L'),
  (249, @plcc20_tube, @plcc44_tube, 'conversion', 360, 'PLCC leadcount change 20L<->44L'),
  (249, @plcc44_tube, @plcc20_tube, 'conversion', 360, 'PLCC leadcount change 20L<->44L'),
  (249, @plcc28_tube, @plcc44_tube, 'conversion', 360, 'PLCC leadcount change 28L<->44L'),
  (249, @plcc44_tube, @plcc28_tube, 'conversion', 360, 'PLCC leadcount change 28L<->44L');

-- Ramp change (2hrs), reel<->tube, within same leadcount
INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (249, @plcc20_tape, @plcc20_tube, 'setup', 120, 'ramp medium change'),
  (249, @plcc20_tube, @plcc20_tape, 'setup', 120, 'ramp medium change'),
  (249, @plcc28_tape, @plcc28_tube, 'setup', 120, 'ramp medium change'),
  (249, @plcc28_tube, @plcc28_tape, 'setup', 120, 'ramp medium change'),
  (249, @plcc44_tape, @plcc44_tube, 'setup', 120, 'ramp medium change'),
  (249, @plcc44_tube, @plcc44_tape, 'setup', 120, 'ramp medium change');


-- ==============================================================================
-- 10G6L (machine_id=57, F1) -- 8 package/leadcount groups, 16 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (57, 'F1', 'QSOP', 16, 16, 'taping', '10G6L: QSOP, 16L, reel');
SET @qsop16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (57, 'F1', 'QSOP', 16, 16, 'tubing', '10G6L: QSOP, 16L, tube');
SET @qsop16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (57, 'F1', 'QSOP', 20, 20, 'taping', '10G6L: QSOP, 20L, reel');
SET @qsop20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (57, 'F1', 'QSOP', 20, 20, 'tubing', '10G6L: QSOP, 20L, tube');
SET @qsop20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (57, 'F1', 'QSOP_EP', 16, 16, 'taping', '10G6L: QSOP_EP, 16L, reel');
SET @qsopep16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (57, 'F1', 'QSOP_EP', 16, 16, 'tubing', '10G6L: QSOP_EP, 16L, tube');
SET @qsopep16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (57, 'F1', 'SOIC_N', 8, 8, 'taping', '10G6L: SOIC_N, 8L, reel');
SET @soicn8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (57, 'F1', 'SOIC_N', 8, 8, 'tubing', '10G6L: SOIC_N, 8L, tube');
SET @soicn8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (57, 'F1', 'SOIC_N', 14, 14, 'taping', '10G6L: SOIC_N, 14L, reel');
SET @soicn14_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (57, 'F1', 'SOIC_N', 14, 14, 'tubing', '10G6L: SOIC_N, 14L, tube');
SET @soicn14_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (57, 'F1', 'SOIC_N', 16, 16, 'taping', '10G6L: SOIC_N, 16L, reel');
SET @soicn16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (57, 'F1', 'SOIC_N', 16, 16, 'tubing', '10G6L: SOIC_N, 16L, tube');
SET @soicn16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (57, 'F1', 'SOIC_N_EP', 8, 8, 'taping', '10G6L: SOIC_N_EP, 8L, reel');
SET @soicnep8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (57, 'F1', 'SOIC_N_EP', 8, 8, 'tubing', '10G6L: SOIC_N_EP, 8L, tube');
SET @soicnep8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (57, 'F1', 'SOIC_W', 16, 16, 'taping', '10G6L: SOIC_W, 16L, reel');
SET @soicw16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (57, 'F1', 'SOIC_W', 16, 16, 'tubing', '10G6L: SOIC_W, 16L, tube');
SET @soicw16_tubing = LAST_INSERT_ID();


-- Any state on this machine -> each of the 16 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (57, NULL, @qsop16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (57, NULL, @qsop16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (57, NULL, @qsop20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (57, NULL, @qsop20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (57, NULL, @qsopep16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (57, NULL, @qsopep16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (57, NULL, @soicn8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (57, NULL, @soicn8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (57, NULL, @soicn14_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (57, NULL, @soicn14_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (57, NULL, @soicn16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (57, NULL, @soicn16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (57, NULL, @soicnep8_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (57, NULL, @soicnep8_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (57, NULL, @soicw16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (57, NULL, @soicw16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');


-- ==============================================================================
-- 54G6L (machine_id=101, F3) -- 8 package/leadcount groups, 16 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

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


-- Any state on this machine -> each of the 16 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

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


-- ==============================================================================
-- 33G6L (machine_id=80, F1) -- 6 package/leadcount groups, 12 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'SOIC_N', 8, 8, 'taping', '33G6L: SOIC_N, 8L, reel');
SET @soicn8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'SOIC_N', 8, 8, 'tubing', '33G6L: SOIC_N, 8L, tube');
SET @soicn8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'SOIC_N', 14, 14, 'taping', '33G6L: SOIC_N, 14L, reel');
SET @soicn14_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'SOIC_N', 14, 14, 'tubing', '33G6L: SOIC_N, 14L, tube');
SET @soicn14_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'SOIC_N', 16, 16, 'taping', '33G6L: SOIC_N, 16L, reel');
SET @soicn16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'SOIC_N', 16, 16, 'tubing', '33G6L: SOIC_N, 16L, tube');
SET @soicn16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'QSOP', 16, 16, 'taping', '33G6L: QSOP, 16L, reel');
SET @qsop16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'QSOP', 16, 16, 'tubing', '33G6L: QSOP, 16L, tube');
SET @qsop16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'QSOP', 20, 20, 'taping', '33G6L: QSOP, 20L, reel');
SET @qsop20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'QSOP', 20, 20, 'tubing', '33G6L: QSOP, 20L, tube');
SET @qsop20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'QSOP_EP', 16, 16, 'taping', '33G6L: QSOP_EP, 16L, reel');
SET @qsopep16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (80, 'F1', 'QSOP_EP', 16, 16, 'tubing', '33G6L: QSOP_EP, 16L, tube');
SET @qsopep16_tubing = LAST_INSERT_ID();


-- Any state on this machine -> each of the 12 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
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


-- ==============================================================================
-- 42G6L (machine_id=89, F1) -- 7 package/leadcount groups, 14 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'SOIC_N', 8, 8, 'taping', '42G6L: SOIC_N, 8L, reel');
SET @soicn8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'SOIC_N', 8, 8, 'tubing', '42G6L: SOIC_N, 8L, tube');
SET @soicn8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'SOIC_N', 14, 14, 'taping', '42G6L: SOIC_N, 14L, reel');
SET @soicn14_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'SOIC_N', 14, 14, 'tubing', '42G6L: SOIC_N, 14L, tube');
SET @soicn14_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'SOIC_N', 16, 16, 'taping', '42G6L: SOIC_N, 16L, reel');
SET @soicn16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'SOIC_N', 16, 16, 'tubing', '42G6L: SOIC_N, 16L, tube');
SET @soicn16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'SOIC_N_EP', 8, 8, 'taping', '42G6L: SOIC_N_EP, 8L, reel');
SET @soicnep8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'SOIC_N_EP', 8, 8, 'tubing', '42G6L: SOIC_N_EP, 8L, tube');
SET @soicnep8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'QSOP', 16, 16, 'taping', '42G6L: QSOP, 16L, reel');
SET @qsop16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'QSOP', 16, 16, 'tubing', '42G6L: QSOP, 16L, tube');
SET @qsop16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'QSOP', 20, 20, 'taping', '42G6L: QSOP, 20L, reel');
SET @qsop20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'QSOP', 20, 20, 'tubing', '42G6L: QSOP, 20L, tube');
SET @qsop20_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'QSOP_EP', 16, 16, 'taping', '42G6L: QSOP_EP, 16L, reel');
SET @qsopep16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (89, 'F1', 'QSOP_EP', 16, 16, 'tubing', '42G6L: QSOP_EP, 16L, tube');
SET @qsopep16_tubing = LAST_INSERT_ID();


-- Any state on this machine -> each of the 14 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
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


-- ==============================================================================
-- 47G6L (machine_id=94, F1) -- 6 package/leadcount groups, 12 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'SOIC_N', 8, 8, 'taping', '47G6L: SOIC_N, 8L, reel');
SET @soicn8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'SOIC_N', 8, 8, 'tubing', '47G6L: SOIC_N, 8L, tube');
SET @soicn8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'SOIC_N', 14, 14, 'taping', '47G6L: SOIC_N, 14L, reel');
SET @soicn14_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'SOIC_N', 14, 14, 'tubing', '47G6L: SOIC_N, 14L, tube');
SET @soicn14_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'SOIC_N', 16, 16, 'taping', '47G6L: SOIC_N, 16L, reel');
SET @soicn16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'SOIC_N', 16, 16, 'tubing', '47G6L: SOIC_N, 16L, tube');
SET @soicn16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'SOIC_N_EP', 8, 8, 'taping', '47G6L: SOIC_N_EP, 8L, reel');
SET @soicnep8_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'SOIC_N_EP', 8, 8, 'tubing', '47G6L: SOIC_N_EP, 8L, tube');
SET @soicnep8_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'QSOP', 16, 16, 'taping', '47G6L: QSOP, 16L, reel');
SET @qsop16_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'QSOP', 16, 16, 'tubing', '47G6L: QSOP, 16L, tube');
SET @qsop16_tubing = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'QSOP', 20, 20, 'taping', '47G6L: QSOP, 20L, reel');
SET @qsop20_taping = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (94, 'F1', 'QSOP', 20, 20, 'tubing', '47G6L: QSOP, 20L, tube');
SET @qsop20_tubing = LAST_INSERT_ID();


-- Any state on this machine -> each of the 12 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
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


-- ==============================================================================
-- 45AT28 (machine_id=251, F1) -- 7 package/leadcount groups, 14 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

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


-- Any state on this machine -> each of the 14 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

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


-- ==============================================================================
-- 51AT28 (machine_id=216, F1) -- 8 package/leadcount groups, 16 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

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


-- Any state on this machine -> each of the 16 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

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


-- ==============================================================================
-- 58AT28 (machine_id=260, F1) -- 9 package/leadcount groups, 18 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

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


-- Any state on this machine -> each of the 18 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

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


-- ==============================================================================
-- 08G6L (machine_id=55, F1) -- 10 package/leadcount groups, 20 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

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


-- Any state on this machine -> each of the 20 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

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


-- ==============================================================================
-- 11G6L (machine_id=58, F1) -- 9 package/leadcount groups, 18 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

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


-- Any state on this machine -> each of the 18 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

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


-- ==============================================================================
-- 48G6L (machine_id=95, F1) -- 10 package/leadcount groups, 20 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

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


-- Any state on this machine -> each of the 20 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

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


-- ==============================================================================
-- 53G6L (machine_id=100, F1) -- 8 package/leadcount groups, 16 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

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


-- Any state on this machine -> each of the 16 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

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


-- ==============================================================================
-- 36G6L (machine_id=83, F1) -- 9 package/leadcount groups, 18 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

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


-- Any state on this machine -> each of the 18 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

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


-- ==============================================================================
-- 15AT128 (machine_id=184, F1) -- 3 package/leadcount groups, 6 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

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


-- Any state on this machine -> each of the 6 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES

  (184, NULL, @soicw16_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (184, NULL, @soicw16_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (184, NULL, @soicw20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (184, NULL, @soicw20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (184, NULL, @soicic20_taping, 'setup', 120, 'any change (package/leadcount/ramp) -> setup'),
  (184, NULL, @soicic20_tubing, 'setup', 120, 'any change (package/leadcount/ramp) -> setup');


-- ==============================================================================
-- 09G6L (machine_id=56, F1) -- 5 package/leadcount groups, 10 states
-- ==============================================================================

-- States: one taping (reel) + one tubing row per package/leadcount group

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


-- Any state on this machine -> each of the 10 states costs 120min

-- (covers package change, leadcount change, and reel<->tube ramp change uniformly)

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

  -- =====================================================================
-- Compiled seed script: machine_setup_states + machine_transition_rules
-- Run top to bottom in ONE session (transition rules reuse @-variables
-- set by the setup_states inserts directly above them).
-- =====================================================================


-- =====================================================================
-- 70AT28 (machine_id 266, F1)
-- LCC 8L/14L, reel <> tray ramp (2hrs)
-- =====================================================================
INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (266, 'F1', 'LCC', '8,14', 'taping', '70AT28: LCC, 8L/14L, reel');
SET @m266_lcc_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (266, 'F1', 'LCC', '8,14', 'tray', '70AT28: LCC, 8L/14L, tray');
SET @m266_lcc_tray = LAST_INSERT_ID();

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (266, @m266_lcc_tape, @m266_lcc_tray, 'setup', 120, 'ramp medium change'),
  (266, @m266_lcc_tray, @m266_lcc_tape, 'setup', 120, 'ramp medium change');


-- =====================================================================
-- 11AT128 ADGT (machine_id 182, F1)
-- LFCSP MPD 32L, reel <> tube ramp (2hrs)
-- =====================================================================
INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `focus_group`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (182, 'F1', 'MPD', 'LFCSP', 32, 32, 'taping', '11AT128 ADGT: LFCSP MPD, 32L, reel');
SET @m182_lfcsp_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `focus_group`, `package_name`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES (182, 'F1', 'MPD', 'LFCSP', 32, 32, 'tubing', '11AT128 ADGT: LFCSP MPD, 32L, tube');
SET @m182_lfcsp_tube = LAST_INSERT_ID();

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (182, @m182_lfcsp_tape, @m182_lfcsp_tube, 'setup', 120, 'ramp medium change'),
  (182, @m182_lfcsp_tube, @m182_lfcsp_tape, 'setup', 120, 'ramp medium change');


-- =====================================================================
-- 01MV853A (ADGT) (machine_id 226, F1)
-- PLCC / LFCSP / SOIC_CAV / LFCSP_SS -- no setup/ramp rule was given
-- =====================================================================
INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `leadcount_min`, `leadcount_max`, `process_type`, `remarks`)
VALUES
  (226, 'F1', 'PLCC',      '20,28', NULL, NULL, 'both', '01MV853A (ADGT): PLCC, 20L/28L only'),
  (226, 'F1', 'LFCSP',     NULL,    32,   32,   'both', '01MV853A (ADGT): LFCSP, 32L'),
  (226, 'F1', 'SOIC_CAV',  NULL,    16,   16,   'both', '01MV853A (ADGT): SOIC_CAV, 16L'),
  (226, 'F1', 'LFCSP_SS',  NULL,    32,   32,   'both', '01MV853A (ADGT): LFCSP_SS, 32L');


-- =====================================================================
-- 06G6L (machine_id 53, F1)
-- MINI_SO 8/10/12L, MINI_SO_EP 16L -- lc/package setup (2hrs)
-- =====================================================================
INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (53, 'F1', 'MINI_SO', '8,10,12', 'both', '06G6L: MINI_SO, 8L/10L/12L only');
SET @m53_mso = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (53, 'F1', 'MINI_SO_EP', '16', 'both', '06G6L: MINI_SO_EP, 16L only');
SET @m53_msoep = LAST_INSERT_ID();

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (53, NULL, @m53_mso,   'setup', 120, 'any leadcount/package change -> setup'),
  (53, NULL, @m53_msoep, 'setup', 120, 'any leadcount/package change -> setup');


-- =====================================================================
-- 48AT28 (machine_id 252, F1)
-- QSOP_EP 16L, SOIC_N_EP 8/16L, SOIC_N 8/14/16L, QSOP 16L
-- lc/package setup (2hrs)
-- =====================================================================
INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (252, 'F1', 'QSOP_EP', '16', 'both', '48AT28: QSOP_EP, 16L');
SET @m252_qsopep = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (252, 'F1', 'SOIC_N_EP', '8,16', 'both', '48AT28: SOIC_N_EP, 8L/16L');
SET @m252_soicnep = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (252, 'F1', 'SOIC_N', '8,14,16', 'both', '48AT28: SOIC_N, 8L/14L/16L');
SET @m252_soicn = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (252, 'F1', 'QSOP', '16', 'both', '48AT28: QSOP, 16L');
SET @m252_qsop = LAST_INSERT_ID();

INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (252, NULL, @m252_qsopep,  'setup', 120, 'any leadcount/package change -> setup'),
  (252, NULL, @m252_soicnep, 'setup', 120, 'any leadcount/package change -> setup'),
  (252, NULL, @m252_soicn,   'setup', 120, 'any leadcount/package change -> setup'),
  (252, NULL, @m252_qsop,    'setup', 120, 'any leadcount/package change -> setup');


-- =====================================================================
-- 10AT128 ADGT (machine_id 208, F1)
-- SOIC_W 20L, LCC 8L -- no setup/ramp rule was given
-- =====================================================================
INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES
  (208, 'F1', 'SOIC_W', '20', 'both', '10AT128 ADGT: SOIC_W, 20L only'),
  (208, 'F1', 'LCC',    '8',  'both', '10AT128 ADGT: LCC, 8L only');


-- =====================================================================
-- 02MV853A (ADGT) (machine_id 178, F1)
-- SOIC_CAV 16L, SOIC_W 16L -- no setup/ramp rule was given
-- =====================================================================
INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES
  (178, 'F1', 'SOIC_CAV', '16', 'both', '02MV853A (ADGT): SOIC_CAV, 16L only'),
  (178, 'F1', 'SOIC_W',   '16', 'both', '02MV853A (ADGT): SOIC_W, 16L only');


-- =====================================================================
-- 50G6L (machine_id 97, F1)
-- MINI_SO 8/10L, SSOP 16-48L, MINI_SO_EP 8/10/12/16L
-- lc/package setup within MINI_SO family (2hrs)
-- SSOP <> MINI_SO family conversion (10hrs)
-- reel <> tube ramp, independent of family (2hrs)
-- =====================================================================
INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (97, 'F1', 'MINI_SO', '8,10', 'taping', '50G6L: MINI_SO, 8L/10L, reel');
SET @m97_mso_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (97, 'F1', 'MINI_SO', '8,10', 'tubing', '50G6L: MINI_SO, 8L/10L, tube');
SET @m97_mso_tube = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (97, 'F1', 'MINI_SO_EP', '8,10,12,16', 'taping', '50G6L: MINI_SO_EP, 8-16L, reel');
SET @m97_msoep_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (97, 'F1', 'MINI_SO_EP', '8,10,12,16', 'tubing', '50G6L: MINI_SO_EP, 8-16L, tube');
SET @m97_msoep_tube = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (97, 'F1', 'SSOP', '16,20,24,28,36,44,48', 'taping', '50G6L: SSOP, 16-48L, reel');
SET @m97_ssop_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (97, 'F1', 'SSOP', '16,20,24,28,36,44,48', 'tubing', '50G6L: SSOP, 16-48L, tube');
SET @m97_ssop_tube = LAST_INSERT_ID();

-- lc/package change within MINI_SO family, same process type (2hrs)
INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (97, @m97_mso_tape,   @m97_msoep_tape, 'setup', 120, 'MINI_SO <-> MINI_SO_EP, package change'),
  (97, @m97_msoep_tape, @m97_mso_tape,   'setup', 120, 'MINI_SO <-> MINI_SO_EP, package change'),
  (97, @m97_mso_tube,   @m97_msoep_tube, 'setup', 120, 'MINI_SO <-> MINI_SO_EP, package change'),
  (97, @m97_msoep_tube, @m97_mso_tube,   'setup', 120, 'MINI_SO <-> MINI_SO_EP, package change');

-- SSOP <> MINI_SO family conversion, same process type (10hrs)
INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (97, @m97_ssop_tape,  @m97_mso_tape,   'conversion', 600, 'SSOP <-> MINI_SO family conversion'),
  (97, @m97_mso_tape,   @m97_ssop_tape,  'conversion', 600, 'SSOP <-> MINI_SO family conversion'),
  (97, @m97_ssop_tape,  @m97_msoep_tape, 'conversion', 600, 'SSOP <-> MINI_SO family conversion'),
  (97, @m97_msoep_tape, @m97_ssop_tape,  'conversion', 600, 'SSOP <-> MINI_SO family conversion'),
  (97, @m97_ssop_tube,  @m97_mso_tube,   'conversion', 600, 'SSOP <-> MINI_SO family conversion'),
  (97, @m97_mso_tube,   @m97_ssop_tube,  'conversion', 600, 'SSOP <-> MINI_SO family conversion'),
  (97, @m97_ssop_tube,  @m97_msoep_tube, 'conversion', 600, 'SSOP <-> MINI_SO family conversion'),
  (97, @m97_msoep_tube, @m97_ssop_tube,  'conversion', 600, 'SSOP <-> MINI_SO family conversion');

-- reel <> tube ramp change, independent of family (2hrs)
INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (97, @m97_mso_tape,   @m97_mso_tube,   'setup', 120, 'ramp medium change'),
  (97, @m97_mso_tube,   @m97_mso_tape,   'setup', 120, 'ramp medium change'),
  (97, @m97_msoep_tape, @m97_msoep_tube, 'setup', 120, 'ramp medium change'),
  (97, @m97_msoep_tube, @m97_msoep_tape, 'setup', 120, 'ramp medium change'),
  (97, @m97_ssop_tape,  @m97_ssop_tube,  'setup', 120, 'ramp medium change'),
  (97, @m97_ssop_tube,  @m97_ssop_tape,  'setup', 120, 'ramp medium change');


-- =====================================================================
-- 04MV853A (ADGT) (machine_id 229, F1)
-- SOIC_N 8/14/16L, SOIC_N_EP 16L -- single family, no conversion tier
-- lc/package setup (2hrs), reel <> tube ramp (2hrs)
-- =====================================================================
INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (229, 'F1', 'SOIC_N', '8,14,16', 'taping', '04MV853A (ADGT): SOIC_N, 8L/14L/16L, reel');
SET @m229_n_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (229, 'F1', 'SOIC_N', '8,14,16', 'tubing', '04MV853A (ADGT): SOIC_N, 8L/14L/16L, tube');
SET @m229_n_tube = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (229, 'F1', 'SOIC_N_EP', '16', 'taping', '04MV853A (ADGT): SOIC_N_EP, 16L, reel');
SET @m229_nep_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (229, 'F1', 'SOIC_N_EP', '16', 'tubing', '04MV853A (ADGT): SOIC_N_EP, 16L, tube');
SET @m229_nep_tube = LAST_INSERT_ID();

-- lc/package change: SOIC_N <-> SOIC_N_EP, same process type (2hrs)
INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (229, @m229_n_tape,   @m229_nep_tape, 'setup', 120, 'SOIC_N <-> SOIC_N_EP, package change'),
  (229, @m229_nep_tape, @m229_n_tape,   'setup', 120, 'SOIC_N <-> SOIC_N_EP, package change'),
  (229, @m229_n_tube,   @m229_nep_tube, 'setup', 120, 'SOIC_N <-> SOIC_N_EP, package change'),
  (229, @m229_nep_tube, @m229_n_tube,   'setup', 120, 'SOIC_N <-> SOIC_N_EP, package change');

-- reel <> tube ramp change (2hrs)
INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (229, @m229_n_tape,   @m229_n_tube,   'setup', 120, 'ramp medium change'),
  (229, @m229_n_tube,   @m229_n_tape,   'setup', 120, 'ramp medium change'),
  (229, @m229_nep_tape, @m229_nep_tube, 'setup', 120, 'ramp medium change'),
  (229, @m229_nep_tube, @m229_nep_tape, 'setup', 120, 'ramp medium change');


-- =====================================================================
-- 04G6L (machine_id 51, F1)
-- MINI_SO 8/10L, SOIC_N 14L, MINI_SO_EP 8L -- single family, no conversion tier
-- ASSUMPTION (not yet confirmed by 20222): no duration was given for
-- this machine's package/lc or ramp change, so both default to 2hrs
-- (120min), matching every other machine in this batch. ASSUMPTION:
-- package/lc change is a full mesh across all 3 packages (same
-- process type), same pattern as 50G6L / 04MV853A above -- confirm
-- both before running this block.
-- =====================================================================
INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (51, 'F1', 'MINI_SO', '8,10', 'taping', '04G6L: MINI_SO, 8L/10L, reel');
SET @m51_mso_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (51, 'F1', 'MINI_SO', '8,10', 'tubing', '04G6L: MINI_SO, 8L/10L, tube');
SET @m51_mso_tube = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (51, 'F1', 'SOIC_N', '14', 'taping', '04G6L: SOIC_N, 14L, reel');
SET @m51_n_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (51, 'F1', 'SOIC_N', '14', 'tubing', '04G6L: SOIC_N, 14L, tube');
SET @m51_n_tube = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (51, 'F1', 'MINI_SO_EP', '8', 'taping', '04G6L: MINI_SO_EP, 8L, reel');
SET @m51_msoep_tape = LAST_INSERT_ID();

INSERT INTO `machine_setup_states`
  (`machine_id`, `factory`, `package_name`, `leadcount_include`, `process_type`, `remarks`)
VALUES (51, 'F1', 'MINI_SO_EP', '8', 'tubing', '04G6L: MINI_SO_EP, 8L, tube');
SET @m51_msoep_tube = LAST_INSERT_ID();

-- lc/package change: full mesh across MINI_SO / SOIC_N / MINI_SO_EP, same process type (2hrs, ASSUMED)
INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (51, @m51_mso_tape,   @m51_n_tape,     'setup', 120, 'MINI_SO <-> SOIC_N, package change'),
  (51, @m51_n_tape,     @m51_mso_tape,   'setup', 120, 'MINI_SO <-> SOIC_N, package change'),
  (51, @m51_mso_tape,   @m51_msoep_tape, 'setup', 120, 'MINI_SO <-> MINI_SO_EP, package change'),
  (51, @m51_msoep_tape, @m51_mso_tape,   'setup', 120, 'MINI_SO <-> MINI_SO_EP, package change'),
  (51, @m51_n_tape,     @m51_msoep_tape, 'setup', 120, 'SOIC_N <-> MINI_SO_EP, package change'),
  (51, @m51_msoep_tape, @m51_n_tape,     'setup', 120, 'SOIC_N <-> MINI_SO_EP, package change'),
  (51, @m51_mso_tube,   @m51_n_tube,     'setup', 120, 'MINI_SO <-> SOIC_N, package change'),
  (51, @m51_n_tube,     @m51_mso_tube,   'setup', 120, 'MINI_SO <-> SOIC_N, package change'),
  (51, @m51_mso_tube,   @m51_msoep_tube, 'setup', 120, 'MINI_SO <-> MINI_SO_EP, package change'),
  (51, @m51_msoep_tube, @m51_mso_tube,   'setup', 120, 'MINI_SO <-> MINI_SO_EP, package change'),
  (51, @m51_n_tube,     @m51_msoep_tube, 'setup', 120, 'SOIC_N <-> MINI_SO_EP, package change'),
  (51, @m51_msoep_tube, @m51_n_tube,     'setup', 120, 'SOIC_N <-> MINI_SO_EP, package change');

-- reel <> tube ramp change (2hrs, ASSUMED)
INSERT INTO `machine_transition_rules`
  (`machine_id`, `from_state_id`, `to_state_id`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (51, @m51_mso_tape,   @m51_mso_tube,   'setup', 120, 'ramp medium change'),
  (51, @m51_mso_tube,   @m51_mso_tape,   'setup', 120, 'ramp medium change'),
  (51, @m51_n_tape,     @m51_n_tube,     'setup', 120, 'ramp medium change'),
  (51, @m51_n_tube,     @m51_n_tape,     'setup', 120, 'ramp medium change'),
  (51, @m51_msoep_tape, @m51_msoep_tube, 'setup', 120, 'ramp medium change'),
  (51, @m51_msoep_tube, @m51_msoep_tape, 'setup', 120, 'ramp medium change');

-- =====================================================================
-- 39G6L axis rules -- 3 rows, replaces the 462-row pairwise seed
-- =====================================================================
SET @m_39g6l = (SELECT id FROM machine_list WHERE machine_num = '39G6L');

INSERT INTO `machine_transition_axis_rules`
  (`machine_id`, `axis`, `operation_type`, `est_duration_minutes`, `notes`)
VALUES
  (@m_39g6l, 'factory',       'conversion', 600, 'F1 <> F2'),
  (@m_39g6l, 'package_group', 'conversion', 600, 'RM <> RW (via package_groups)'),
  (@m_39g6l, 'leadcount',     'setup',      120, 'leadcount change');