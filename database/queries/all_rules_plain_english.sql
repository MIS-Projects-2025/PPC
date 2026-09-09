WITH state_desc AS (
    SELECT
        s.setup_state_id,
        CONCAT(
            'Factory ', s.factory, ', ',
            COALESCE(s.package_name, 'ANY package'), ', ',
            COALESCE(s.body_size, 'any body size'),
            IF(s.thickness IS NOT NULL, CONCAT(' (thickness ', s.thickness, ')'), ''),
            ', leadcount ',
            CASE
                WHEN s.leadcount_include IS NOT NULL THEN CONCAT('ONLY [', s.leadcount_include, ']')
                WHEN s.leadcount_min IS NOT NULL OR s.leadcount_max IS NOT NULL THEN
                    CONCAT(COALESCE(s.leadcount_min, 'any'), '-', COALESCE(s.leadcount_max, 'any'),
                           IF(s.leadcount_exclude IS NOT NULL, CONCAT(' except [', s.leadcount_exclude, ']'), ''))
                ELSE 'any'
            END,
            ', process: ', s.process_type
        ) AS description
    FROM qdn_db.machine_setup_states s
)
-- 1. CAPABILITY — what each machine can run
SELECT
    'CAPABILITY' AS rule_type,
    CONCAT('Machine ', m.machine_num, ' can run: ', sd.description) AS rule_in_plain_english
FROM qdn_db.machine_setup_states s
JOIN qdn_db.machine_list m ON m.id = s.machine_id
JOIN state_desc sd ON sd.setup_state_id = s.setup_state_id

UNION ALL
-- 2. PART ROUTING — part-name-specific overrides (closed list: ONLY these)
SELECT
    'PART ROUTING' AS rule_type,
    CONCAT('Part "', r.match_value, '" (matched by ', r.match_type, ') is ONLY allowed on Machine ',
           m.machine_num, ' as: ', sd.description) AS rule_in_plain_english
FROM qdn_db.machine_capability_part_rules r
JOIN qdn_db.machine_setup_states s ON s.setup_state_id = r.setup_state_id
JOIN state_desc sd ON sd.setup_state_id = r.setup_state_id
JOIN qdn_db.machine_list m ON m.id = s.machine_id

UNION ALL
-- 3. TRANSITION COST — general setup/conversion cost between states
SELECT
    'TRANSITION COST' AS rule_type,
    CONCAT('On Machine ', m.machine_num, ': moving FROM [',
           COALESCE(sd_from.description, 'ANY current state'),
           '] TO [', sd_to.description, '] costs a ', t.operation_type,
           IF(t.est_duration_minutes IS NOT NULL, CONCAT(' (~', t.est_duration_minutes, ' min)'), '')
    ) AS rule_in_plain_english
FROM qdn_db.machine_transition_rules t
JOIN qdn_db.machine_list m ON m.id = t.machine_id
LEFT JOIN state_desc sd_from ON sd_from.setup_state_id = t.from_state_id
JOIN state_desc sd_to ON sd_to.setup_state_id = t.to_state_id

UNION ALL
-- 4. TRANSITION EXCEPTION — part-specific overrides of the general cost
SELECT
    'TRANSITION EXCEPTION' AS rule_type,
    CONCAT('On Machine ', m.machine_num, ', ONLY for part "', e.part_name, '": moving FROM [',
           COALESCE(sd_from.description, 'ANY current state'),
           '] TO [', sd_to.description, '] costs a ', e.operation_type,
           IF(e.est_duration_minutes IS NOT NULL, CONCAT(' (~', e.est_duration_minutes, ' min)'), ''),
           ' -- overrides the general rule for this part only'
    ) AS rule_in_plain_english
FROM qdn_db.machine_transition_rule_exceptions e
JOIN qdn_db.machine_list m ON m.id = e.machine_id
LEFT JOIN state_desc sd_from ON sd_from.setup_state_id = e.from_state_id
JOIN state_desc sd_to ON sd_to.setup_state_id = e.to_state_id

ORDER BY rule_type, rule_in_plain_english;