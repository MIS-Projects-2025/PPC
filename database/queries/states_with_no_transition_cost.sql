SELECT
    ml.id AS machine_id,
    ml.machine_num,
    COUNT(*) AS uncovered_state_count,
    GROUP_CONCAT(
        mss.setup_state_id
        ORDER BY mss.setup_state_id
        SEPARATOR ', '
    ) AS uncovered_state_ids
FROM `qdn_db`.`machine_setup_states` mss
JOIN `qdn_db`.`machine_list` ml ON ml.id = mss.machine_id
LEFT JOIN `qdn_db`.`machine_transition_rules` mtr
    ON mtr.to_state_id = mss.setup_state_id
LEFT JOIN `qdn_db`.`machine_transition_axis_rules` mtar
    ON mtar.machine_id = mss.machine_id
WHERE mtr.rule_id IS NULL
  AND mtar.id IS NULL
GROUP BY ml.id, ml.machine_num
ORDER BY uncovered_state_count DESC, ml.machine_num;
