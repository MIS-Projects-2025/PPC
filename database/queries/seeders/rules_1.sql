-- =====================================================================
-- Seeder: qdn_db.machine_transition_rule_exceptions for the 113 parts that
-- override the general leadcount-change-always-needs-setup rule.
--
-- KNOWN LIMITATION: 06HSI400T's F1 LFCSP 4x4 state is currently seeded
-- with thickness=NULL (any thickness) -- this file's restriction text
-- references .75/.85/.90 as distinct thicknesses, matching 04HSI400T's
-- 3x3 pattern. Groups B and C below target the EXISTING (undifferen-
-- tiated) state for now; if 06HSI400T gets split into thickness-
-- specific states later, these 61 rows need re-pointing to whichever
-- specific state each part actually runs.
--
-- All exceptions use from_state_id=NULL (wildcard: any current state)
-- since none of these machines currently have LEADCOUNT as a state
-- dimension -- this is a superset interpretation ("entering this state
-- is always free for this part") rather than a precise leadcount-to-
-- leadcount rule, which isn't representable until leadcount-specific
-- states exist for these machines.
-- =====================================================================

SET @m_04hsi400t = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '04HSI400T'); -- F1 PL6 3x3 LFCSP
SET @m_06hsi400t = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '06HSI400T'); -- F1 PL6 4x4 LFCSP


-- GROUP A (52 parts) -> @m_04hsi400t, LFCSP 3X3
INSERT INTO qdn_db.machine_transition_rule_exceptions
  (machine_id, part_name, from_state_id, to_state_id, operation_type, notes)
SELECT
  @m_04hsi400t, p.part_name, NULL, s.setup_state_id, 'none',
  'PL6_Restriction.xlsx: same as F1 LFCSP 3x3 HSI400T, no setup on leadcount change'
FROM (
  SELECT 'HMC8038LP4CE' AS part_name UNION ALL
  SELECT 'ADRF5022BCCZ-CSLR7' AS part_name UNION ALL
  SELECT 'ADRF5051BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5022BCCZ-CSL' AS part_name UNION ALL
  SELECT 'ADRF5051BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5048BCCZ-CSL' AS part_name UNION ALL
  SELECT 'ADRF5050BCCZ-CSLR7' AS part_name UNION ALL
  SELECT 'ADRF5048BCCZ-CSLR7' AS part_name UNION ALL
  SELECT 'ADRF5144BCCZ-CSL' AS part_name UNION ALL
  SELECT 'ADRF5144BCCZ-CSLR7' AS part_name UNION ALL
  SELECT 'ADRF5050BCCZ-CSL' AS part_name UNION ALL
  SELECT 'ADRF5022BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5300BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5020BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5026SCCZ-EP' AS part_name UNION ALL
  SELECT 'ADRF5022BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5021BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5062BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5063BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5063BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5050BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5050BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5921BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5920BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5020BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5021BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5921BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5920BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5023BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5023BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5300BCCZN-RL' AS part_name UNION ALL
  SELECT 'ADRF5300BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5031BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5030BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5030BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5203XCCZN' AS part_name UNION ALL
  SELECT 'ADRF5203BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5203BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5301BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5049BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5049BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5522XCPZ' AS part_name UNION ALL
  SELECT 'ADRF5027BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5027BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5026BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5026BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5144BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5144BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5046BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5046BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5047BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5047BCCZN-R7' AS part_name
) p
CROSS JOIN qdn_db.machine_setup_states s
WHERE s.machine_id = @m_04hsi400t
  AND s.package_name = 'LFCSP'
  AND s.body_size = '3X3';


-- GROUP B (28 parts) -> @m_06hsi400t, LFCSP 4X4
INSERT INTO qdn_db.machine_transition_rule_exceptions
  (machine_id, part_name, from_state_id, to_state_id, operation_type, notes)
SELECT
  @m_06hsi400t, p.part_name, NULL, s.setup_state_id, 'none',
  'PL6_Restriction.xlsx: same as F1 LFCSP 4x4 HSI400T, no setup on leadcount change (HSI200 side unaffected, uses default rule)'
FROM (
  SELECT 'ADRF5346XCCZN' AS part_name UNION ALL
  SELECT 'ADRF5703BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5702BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5703BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5730BCCZ-CSLR7' AS part_name UNION ALL
  SELECT 'ADRF5044BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5045BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5944BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5730XCCZ-CSL' AS part_name UNION ALL
  SELECT 'ADRF5730BCCZ-CSL' AS part_name UNION ALL
  SELECT 'ADRF5044BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5045BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5944BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5730BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5720BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5970BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5980BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5730BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5720BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5970BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5980BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5345BCCZN-RL' AS part_name UNION ALL
  SELECT 'ADRF5345BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5345BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5347BCCZN-RL' AS part_name UNION ALL
  SELECT 'ADRF5347BCCZN-R7' AS part_name UNION ALL
  SELECT 'ADRF5347BCCZN' AS part_name UNION ALL
  SELECT 'ADRF5945BCCZN-R7' AS part_name
) p
CROSS JOIN qdn_db.machine_setup_states s
WHERE s.machine_id = @m_06hsi400t
  AND s.package_name = 'LFCSP'
  AND s.body_size = '4X4';


-- GROUP C (33 parts) -> @m_06hsi400t, LFCSP 4X4
INSERT INTO qdn_db.machine_transition_rule_exceptions
  (machine_id, part_name, from_state_id, to_state_id, operation_type, notes)
SELECT
  @m_06hsi400t, p.part_name, NULL, s.setup_state_id, 'none',
  'PL6_Restriction.xlsx: 06HSI400T no setup on leadcount change (04HSI200 side uses default rule once seeded)'
FROM (
  SELECT 'ADL5371ACPZ-R7' AS part_name UNION ALL
  SELECT 'ADT7420UCPZ-RL7' AS part_name UNION ALL
  SELECT 'ADRF5250BCPZ-R7' AS part_name UNION ALL
  SELECT 'ADL5387ACPZ-R7' AS part_name UNION ALL
  SELECT 'ADL5375-05ACPZ-R7' AS part_name UNION ALL
  SELECT 'ADL5375-15ACPZ-R7' AS part_name UNION ALL
  SELECT 'ADT7422CCPZ-RL7' AS part_name UNION ALL
  SELECT 'ADRF5250BCPZ' AS part_name UNION ALL
  SELECT 'ADL5801ACPZ-R7' AS part_name UNION ALL
  SELECT 'ADT7320UCPZ-RL7' AS part_name UNION ALL
  SELECT 'HMC1097LP4ETR' AS part_name UNION ALL
  SELECT 'HMC506LP4ETR' AS part_name UNION ALL
  SELECT 'HMC1082LP4E' AS part_name UNION ALL
  SELECT 'HMC1082LP4ETR' AS part_name UNION ALL
  SELECT 'HMC431LP4E' AS part_name UNION ALL
  SELECT 'HMC322ALP4E' AS part_name UNION ALL
  SELECT 'HMC322ALP4ETR' AS part_name UNION ALL
  SELECT 'HMC703LP4ETR' AS part_name UNION ALL
  SELECT 'HMC960LP4ETR' AS part_name UNION ALL
  SELECT 'HMC1097LP4E' AS part_name UNION ALL
  SELECT 'HMC1122LP4METR' AS part_name UNION ALL
  SELECT 'HMC431LP4ETR' AS part_name UNION ALL
  SELECT 'HMC909LP4E' AS part_name UNION ALL
  SELECT 'ADRF5040BCPZ-R7' AS part_name UNION ALL
  SELECT 'HMC385LP4ETR' AS part_name UNION ALL
  SELECT 'HMC700LP4ETR' AS part_name UNION ALL
  SELECT 'HMC1122LP4ME' AS part_name UNION ALL
  SELECT 'HMC629ALP4ETR' AS part_name UNION ALL
  SELECT 'HMC429LP4E' AS part_name UNION ALL
  SELECT 'HMC429LP4ETR' AS part_name UNION ALL
  SELECT 'HMC8038LP4CETR' AS part_name UNION ALL
  SELECT 'HMC8038WLP4CETR' AS part_name UNION ALL
  SELECT 'HMC394LP4E' AS part_name
) p
CROSS JOIN qdn_db.machine_setup_states s
WHERE s.machine_id = @m_06hsi400t
  AND s.package_name = 'LFCSP'
  AND s.body_size = '4X4';