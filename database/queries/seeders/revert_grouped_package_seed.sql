-- =====================================================================
-- STEP 1 — PREVIEW: run this first, verify the row count/contents
-- match what you expect before running the DELETE below.
--
-- Targets rows from the wide-checkbox batch specifically: matches on
-- the exact group-label package names used in that batch AND the
-- remarks pattern that batch always wrote ('PL: %'). The double
-- condition is deliberate — reduces risk of catching some unrelated
-- legitimate row that happens to share a package_name coincidentally.
-- =====================================================================

SELECT *
FROM qdn_db.machine_setup_states
WHERE remarks LIKE 'PL: %'
  AND package_name IN (
    'LCC_MPD', 'LFCSP_TUBE_MPD', 'MSOP', 'PLCC', 'RN', 'RN_MPD',
    'RW', 'RW_MPD', 'SOIC_CAV_MPD/TSSOP', 'SSOP', 'TSSOP',
    'DDPAK', 'SOT_223', 'PDIP', 'RN/ QSOP'
  );
select * from qdn_db.machine_setup_groups;
-- =====================================================================
-- STEP 2 — DELETE: only run once the preview above looks right.
-- Cascades automatically to any machine_capability_part_rules /
-- machine_transition_rules rows that reference these setup_state_ids
-- (both have ON DELETE CASCADE back to machine_setup_states) — should
-- be none yet since these were freshly inserted, but safe either way.
-- =====================================================================

DELETE FROM qdn_db.machine_setup_states
WHERE remarks LIKE 'PL: %'
  AND package_name IN (
    'LCC_MPD', 'LFCSP_TUBE_MPD', 'MSOP', 'PLCC', 'RN', 'RN_MPD',
    'RW', 'RW_MPD', 'SOIC_CAV_MPD/TSSOP', 'SSOP', 'TSSOP',
    'DDPAK', 'SOT_223', 'PDIP', 'RN/ QSOP'
  );
