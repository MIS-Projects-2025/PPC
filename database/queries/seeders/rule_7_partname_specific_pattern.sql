SET @m_15vitrox = (SELECT id FROM machine_list WHERE machine_num = '15Vitrox');

-- Only INSERT a new setup_state if 15Vitrox doesn't already have one
-- matching this part's real package/body_size/leadcount — if it does,
-- skip this INSERT and use that existing setup_state_id below instead.
INSERT INTO machine_setup_states
  (machine_id, factory, package_name, body_size, process_type, remarks)
VALUES
  (@m_15vitrox, 'F1', /* real package_name */ NULL, /* real body_size */ NULL,
   'both', 'ADRV9061BBPZ-RL exclusive');

SET @state_15vitrox = LAST_INSERT_ID();

INSERT INTO machine_capability_part_rules
  (setup_state_id, match_type, match_value)
VALUES
  (@state_15vitrox, 'exact', 'ADRV9061BBPZ-RL');