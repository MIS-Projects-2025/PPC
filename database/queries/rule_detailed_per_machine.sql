-- Review queries for qdn_db. Needs MySQL 8 (uses WITH). Run against qdn_db.
-- Read-only: only SELECTs.

SET SESSION group_concat_max_len = 1000000;


-- =====================================================================
-- 1. ONE ROW PER MACHINE: how much of each rule type it has
--    Start here to see which machines use pair rules, axis rules, or neither.
-- =====================================================================
SELECT
    m.id                                   AS machine_id,
    m.machine_num,
    m.factory                              AS machine_factory,

    (SELECT COUNT(*) FROM machine_setup_states s
      WHERE s.machine_id = m.id)           AS capabilities,

    (SELECT COUNT(DISTINCT r.setup_state_id)
       FROM machine_capability_part_rules r
       JOIN machine_setup_states s ON s.setup_state_id = r.setup_state_id
      WHERE s.machine_id = m.id)           AS part_routed_states,

    (SELECT COUNT(*) FROM machine_capability_part_rules r
       JOIN machine_setup_states s ON s.setup_state_id = r.setup_state_id
      WHERE s.machine_id = m.id)           AS part_rule_rows,

    (SELECT COUNT(*) FROM machine_transition_rules t
      WHERE t.machine_id = m.id)           AS pair_rules,

    (SELECT COUNT(*) FROM machine_transition_rules t
      WHERE t.machine_id = m.id AND t.from_state_id IS NULL) AS pair_rules_from_any,

    (SELECT COUNT(*) FROM machine_transition_rule_exceptions e
      WHERE e.machine_id = m.id)           AS part_overrides,

    (SELECT COUNT(*) FROM machine_transition_axis_rules a
      WHERE a.machine_id = m.id)           AS axis_rules,

    (SELECT GROUP_CONCAT(DISTINCT a.axis ORDER BY a.axis)
       FROM machine_transition_axis_rules a
      WHERE a.machine_id = m.id)           AS axes,

    (SELECT GROUP_CONCAT(DISTINCT a.combination_rule)
       FROM machine_transition_axis_rules a
      WHERE a.machine_id = m.id)           AS axis_combination_rules,

    (SELECT COUNT(*) FROM machine_auto_part_rules r
      WHERE r.machine_id = m.id)           AS auto_part_rules,

    (SELECT COUNT(*) FROM machine_focus_group_rules r
      WHERE r.machine_id = m.id)           AS focus_group_rules,

    (SELECT COUNT(*) FROM machine_part_exclusions e
      WHERE e.machine_id = m.id)           AS part_exclusions,

    -- capabilities nothing transitions INTO: their changeover falls back to axis rules or the 240 min default
    (SELECT COUNT(*) FROM machine_setup_states s
      WHERE s.machine_id = m.id
        AND NOT EXISTS (SELECT 1 FROM machine_transition_rules t WHERE t.to_state_id = s.setup_state_id)
    )                                      AS states_with_no_cost_rule_in
FROM machine_list m
ORDER BY m.machine_num;


-- =====================================================================
-- 2. FULL DETAIL FEED: every rule, in plain text, one row each
--    Set the machine number in the last WHERE, or delete that line for all machines.
-- =====================================================================
WITH state_desc AS (
    SELECT
        s.setup_state_id,
        s.machine_id,
        CONCAT_WS(' | ',
            s.factory,
            COALESCE(s.package_name, 'ANY package'),
            COALESCE(s.body_size, 'any body'),
            IF(s.thickness IS NOT NULL, CONCAT('t=', s.thickness), NULL),
            CONCAT('LC ', CASE
                WHEN s.leadcount_include IS NOT NULL THEN CONCAT('only ', s.leadcount_include)
                WHEN s.leadcount_min IS NULL AND s.leadcount_max IS NULL THEN 'any'
                ELSE CONCAT(COALESCE(s.leadcount_min, 'any'), '-', COALESCE(s.leadcount_max, 'any'),
                            IF(s.leadcount_exclude IS NOT NULL, CONCAT(' except ', s.leadcount_exclude), ''))
            END),
            s.process_type,
            IF(s.focus_group IS NOT NULL, CONCAT('focus ', s.focus_group), NULL),
            IF(s.lot_type IS NOT NULL, CONCAT('lot ', s.lot_type), NULL)
        ) AS description
    FROM machine_setup_states s
)
SELECT *
FROM (
    SELECT m.machine_num, 'CAPABILITY' AS rule_type, s.setup_state_id AS rule_id, s.setup_state_id AS state_id,
           sd.description AS detail,
           CONCAT(
               IF(EXISTS (SELECT 1 FROM machine_capability_part_rules r WHERE r.setup_state_id = s.setup_state_id),
                  'PART-ROUTED ONLY', 'general pool'),
               IF(s.remarks IS NOT NULL AND s.remarks <> '', CONCAT(' | ', s.remarks), '')
           ) AS extra
    FROM machine_setup_states s
    JOIN machine_list m   ON m.id = s.machine_id
    JOIN state_desc sd    ON sd.setup_state_id = s.setup_state_id

    UNION ALL

    SELECT m.machine_num, 'PART ROUTING', r.rule_id, r.setup_state_id,
           CONCAT('part ', r.match_type, ' "', r.match_value, '"'),
           sd.description
    FROM machine_capability_part_rules r
    JOIN machine_setup_states s ON s.setup_state_id = r.setup_state_id
    JOIN machine_list m         ON m.id = s.machine_id
    JOIN state_desc sd          ON sd.setup_state_id = r.setup_state_id

    UNION ALL

    SELECT m.machine_num, 'PAIR RULE', t.rule_id, t.to_state_id,
           CONCAT('[', COALESCE(sf.description, 'ANY state'), ']  ->  [', st.description, ']'),
           CONCAT(t.operation_type, ' ', COALESCE(t.est_duration_minutes, 0), ' min',
                  IF(t.notes IS NOT NULL AND t.notes <> '', CONCAT(' | ', t.notes), ''))
    FROM machine_transition_rules t
    JOIN machine_list m        ON m.id = t.machine_id
    JOIN state_desc st         ON st.setup_state_id = t.to_state_id
    LEFT JOIN state_desc sf    ON sf.setup_state_id = t.from_state_id

    UNION ALL

    SELECT m.machine_num, 'PART OVERRIDE', e.id, e.to_state_id,
           CONCAT('part "', e.part_name, '": [', COALESCE(sf.description, 'ANY state'), ']  ->  [', st.description, ']'),
           CONCAT(e.operation_type, ' ', COALESCE(e.est_duration_minutes, 0), ' min',
                  IF(e.notes IS NOT NULL AND e.notes <> '', CONCAT(' | ', e.notes), ''))
    FROM machine_transition_rule_exceptions e
    JOIN machine_list m        ON m.id = e.machine_id
    JOIN state_desc st         ON st.setup_state_id = e.to_state_id
    LEFT JOIN state_desc sf    ON sf.setup_state_id = e.from_state_id

    UNION ALL

    SELECT m.machine_num, 'AXIS RULE', a.id, NULL,
           CONCAT('changing ', a.axis),
           CONCAT(a.operation_type, ' ', a.est_duration_minutes, ' min, combination=', a.combination_rule,
                  IF(a.combination_rule = 'sum', '  (scheduler ignores sum and uses the longest)', ''))
    FROM machine_transition_axis_rules a
    JOIN machine_list m ON m.id = a.machine_id

    UNION ALL

    SELECT m.machine_num, 'AUTO-PART RULE', r.id, NULL,
           CONCAT('auto lots of ', COALESCE(r.package_name, 'ANY package'), ': ', r.rule_type),
           COALESCE(r.notes, '')
    FROM machine_auto_part_rules r
    JOIN machine_list m ON m.id = r.machine_id

    UNION ALL

    SELECT m.machine_num, 'FOCUS GROUP RULE', r.id, NULL,
           CONCAT('focus group "', r.focus_group, '": ', r.rule_type,
                  IF(r.rule_type = 'include_only', '  (scheduler only checks exclude)', '')),
           COALESCE(r.notes, '')
    FROM machine_focus_group_rules r
    JOIN machine_list m ON m.id = r.machine_id

    UNION ALL

    SELECT m.machine_num, 'PART EXCLUSION', e.id, NULL,
           CONCAT('part "', e.part_name, '" is excluded'),
           COALESCE(e.notes, '')
    FROM machine_part_exclusions e
    JOIN machine_list m ON m.id = e.machine_id
) x
WHERE x.machine_num = '230'   -- <- change, or delete this line for every machine
ORDER BY x.machine_num,
         FIELD(x.rule_type, 'CAPABILITY', 'PART ROUTING', 'PAIR RULE', 'PART OVERRIDE',
                            'AXIS RULE', 'AUTO-PART RULE', 'FOCUS GROUP RULE', 'PART EXCLUSION'),
         x.rule_id;


-- =====================================================================
-- 3. ONE ROW PER CAPABILITY, with what hangs off it
--    Useful before deleting or regrouping states: what would cascade.
-- =====================================================================
WITH state_desc AS (
    SELECT
        s.setup_state_id,
        CONCAT_WS(' | ',
            s.factory,
            COALESCE(s.package_name, 'ANY package'),
            COALESCE(s.body_size, 'any body'),
            IF(s.thickness IS NOT NULL, CONCAT('t=', s.thickness), NULL),
            CONCAT('LC ', CASE
                WHEN s.leadcount_include IS NOT NULL THEN CONCAT('only ', s.leadcount_include)
                WHEN s.leadcount_min IS NULL AND s.leadcount_max IS NULL THEN 'any'
                ELSE CONCAT(COALESCE(s.leadcount_min, 'any'), '-', COALESCE(s.leadcount_max, 'any'),
                            IF(s.leadcount_exclude IS NOT NULL, CONCAT(' except ', s.leadcount_exclude), ''))
            END),
            s.process_type,
            IF(s.focus_group IS NOT NULL, CONCAT('focus ', s.focus_group), NULL),
            IF(s.lot_type IS NOT NULL, CONCAT('lot ', s.lot_type), NULL)
        ) AS description
    FROM machine_setup_states s
)
SELECT
    m.machine_num,
    s.setup_state_id,
    sd.description,
    s.remarks,
    (SELECT GROUP_CONCAT(CONCAT(r.match_type, ':', r.match_value) ORDER BY r.match_value SEPARATOR '; ')
       FROM machine_capability_part_rules r
      WHERE r.setup_state_id = s.setup_state_id)                                   AS part_rules,
    (SELECT COUNT(*) FROM machine_transition_rules t WHERE t.to_state_id   = s.setup_state_id) AS pair_rules_in,
    (SELECT COUNT(*) FROM machine_transition_rules t WHERE t.from_state_id = s.setup_state_id) AS pair_rules_out,
    (SELECT COUNT(*) FROM machine_transition_rule_exceptions e WHERE e.to_state_id = s.setup_state_id) AS overrides_in
FROM machine_setup_states s
JOIN machine_list m ON m.id = s.machine_id
JOIN state_desc sd  ON sd.setup_state_id = s.setup_state_id
-- WHERE m.machine_num = '230'
ORDER BY m.machine_num, s.factory, s.package_name, s.leadcount_min, s.process_type;