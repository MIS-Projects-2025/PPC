-- =====================================================================
-- Auto-part rules (machine_auto_part_rules) + STR focus_group exclusion.
-- DEFERRED per instruction: "same assysite" preference (Category C),
-- AD8210/OP291 conflicting dated entries (Category D).
-- ASSUMPTION: parenthetical tags (RN)/(QSOP)/(SOIC_W_FP)/(PVI) = package_name
-- placeholders, consistent with the wide-checkbox seed precedent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Part-exclusive-to-G6L-FAMILY rules (any machine_num LIKE '%G6L%')
-- ---------------------------------------------------------------------
-- INSERT INTO machine_setup_states (machine_id, factory, package_name, process_type, remarks)
-- SELECT id, 'F1', NULL, 'both', 'ADG884: G6L-family exclusive'
-- FROM machine_list WHERE machine_num LIKE '%G6L%';

-- INSERT INTO machine_capability_part_rules (setup_state_id, match_type, match_value)
-- SELECT setup_state_id, 'contains', 'ADG884'
-- FROM machine_setup_states WHERE remarks = 'ADG884: G6L-family exclusive';
-- select * from qdn_db.machine_setup_states where remarks = 'ADG884: G6L-family exclusive';
-- select * from qdn_db.;
-- -- select * from qdn_db.machine_capability_part_rules;
-- select distinct `Package_Name` from ppc.customer_data_wip;
-- -- -- -- -- -- --

-- INSERT INTO machine_setup_states (machine_id, factory, package_name, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W_FP', 'both', 'ADUM4137/ADUM4138: G6L-family exclusive'
-- FROM machine_list WHERE machine_num LIKE '%G6L%';

-- INSERT INTO machine_capability_part_rules (setup_state_id, match_type, match_value)
-- SELECT setup_state_id, 'contains', 'ADUM4137'
-- FROM machine_setup_states WHERE remarks = 'ADUM4137/ADUM4138: G6L-family exclusive';

-- INSERT INTO machine_capability_part_rules (setup_state_id, match_type, match_value)
-- SELECT setup_state_id, 'contains', 'ADUM4138'
-- FROM machine_setup_states WHERE remarks = 'ADUM4137/ADUM4138: G6L-family exclusive';


-- INSERT INTO machine_setup_states (machine_id, factory, package_name, process_type, remarks)
-- SELECT id, 'F1', 'QSOP', 'both', 'ADUM141E: G6L-family exclusive'
-- FROM machine_list WHERE machine_num LIKE '%G6L%';

-- INSERT INTO machine_capability_part_rules (setup_state_id, match_type, match_value)
-- SELECT setup_state_id, 'contains', 'ADUM141E'
-- FROM machine_setup_states WHERE remarks = 'ADUM141E: G6L-family exclusive';


INSERT INTO machine_setup_states (machine_id, factory, package_name, process_type, remarks)
SELECT id, 'F1', 'PVI', 'both', 'ADUM3202: G6L-family exclusive'
FROM machine_list WHERE machine_num LIKE '%G6L%';

INSERT INTO machine_capability_part_rules (setup_state_id, match_type, match_value)
SELECT setup_state_id, 'contains', 'ADUM3202'
FROM machine_setup_states WHERE remarks = 'ADUM3202: G6L-family exclusive';


-- ---------------------------------------------------------------------
-- ADUM3210 / ADUM1201: exclusive to ONE specific machine (09G6L),
-- confirmed NOT the G6L family pattern
-- ---------------------------------------------------------------------
-- MIGHT JUST BE A G6L. ALSO, I SEE THIS PARTNAME ON OTHER MACHINE OTHER THAN G6L

-- SET @m_09g6l = (SELECT id FROM machine_list WHERE machine_num = '09G6L');

-- INSERT INTO machine_setup_states (machine_id, factory, package_name, process_type, remarks)
-- VALUES (@m_09g6l, 'F1', 'RN', 'both', 'ADUM3210/ADUM1201: 09G6L exclusive');
-- SET @s_09g6l = LAST_INSERT_ID();

-- INSERT INTO machine_capability_part_rules (setup_state_id, match_type, match_value)
-- VALUES (@s_09g6l, 'exact', 'ADUM3210'), (@s_09g6l, 'exact', 'ADUM1201');


-- ---------------------------------------------------------------------
-- Auto-lot exclusions (machine_auto_part_rules, package_name NULL =
-- applies regardless of package)
-- ---------------------------------------------------------------------
-- INSERT INTO machine_auto_part_rules (machine_id, package_name, rule_type, notes)
-- SELECT id, NULL, 'exclude', '66AT28: do not plan auto lot (RW)'
-- FROM machine_list WHERE machine_num = '66AT28';

-- INSERT INTO machine_auto_part_rules (machine_id, package_name, rule_type, notes)
-- SELECT id, NULL, 'exclude', '19AT28: do not plan auto (RW)'
-- FROM machine_list WHERE machine_num = '19AT28';
select * from qdn_db.machine_auto_part_rules where notes = '19AT28: do not plan auto (RW)';

-- "ALL AUTO LOT FOR G6L ONLY" = auto lots may ONLY run on G6L-family
-- machines -> include_only, fanned out across the family
INSERT INTO machine_auto_part_rules (machine_id, package_name, rule_type, notes)
SELECT id, NULL, 'include_only', 'All auto lots restricted to G6L-family machines'
FROM machine_list WHERE machine_num LIKE '%G6L%';

-- "QSOP AUTO 2G6L ONLY" -- specific package (QSOP) + specific machine (2G6L)
-- INSERT INTO machine_auto_part_rules (machine_id, package_name, rule_type, notes)
-- SELECT id, 'QSOP', 'include_only', 'QSOP auto lots restricted to 2G6L only'
-- FROM machine_list WHERE machine_num = '02G6L';


-- ---------------------------------------------------------------------
-- STR focus_group exclusion -- NEW mechanism, no existing table covers
-- this (exclusion keyed on Focus_Group, not part_name or package_name)
-- ---------------------------------------------------------------------
-- CREATE TABLE machine_focus_group_rules (
--     id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
--     machine_id INT NOT NULL,
--     focus_group VARCHAR(10) NOT NULL,
--     rule_type ENUM('exclude', 'include_only') NOT NULL,
--     notes VARCHAR(255) NULL,
--     FOREIGN KEY (machine_id) REFERENCES machine_list(id)
-- );

INSERT INTO machine_focus_group_rules (machine_id, focus_group, rule_type, notes)
SELECT id, 'STR', 'exclude', 'STR lots not allowed on AT128-family machines'
FROM machine_list WHERE machine_num LIKE '%AT128%';