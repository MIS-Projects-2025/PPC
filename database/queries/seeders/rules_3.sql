-- DONE on sept 7 2:40pm

INSERT INTO qdn_db.machine_capability_part_rules
  (setup_state_id, match_type, match_value)
SELECT
  setup_state_id,
  'exact',
  TRIM(SUBSTRING_INDEX(remarks, ' exclusive', 1))
FROM qdn_db.machine_setup_states
WHERE remarks LIKE '% exclusive';

select * from qdn_db.machine_capability_part_rules;
select * from qdn_db.machine_setup_states;