-- Factory literal appears in the "Focus_Group" column again (like the
-- earlier F1 rows) — treated as Factory directly, no real focus_group
-- value to store, so focus_group stays NULL here.
--
-- NOTE: source data shows '09HSI400T ' with a trailing space — assumed
-- spreadsheet artifact; verify the real machine_num has no trailing
-- whitespace before running.

SET @m_09hsi400t = (SELECT id FROM qdn_db.machine_list WHERE machine_num = '09HSI400T');
select * from qdn_db.machine_list where machine_num = '09HSI400T';
-- Row 1: 5x7, no thickness given (matches any thickness, including .75)
INSERT INTO qdn_db.machine_setup_states
  (machine_id, factory, package_name, body_size, thickness, process_type, remarks)
VALUES
  (@m_09hsi400t, 'F2', 'DFN', '5X7', NULL, 'tubing', '09HSI400T-restricted'),
  (@m_09hsi400t, 'F2', 'QFN', '5X7', NULL, 'tubing', '09HSI400T-restricted');

-- Row 2: 5x7, thickness .75 specifically
INSERT INTO qdn_db.machine_setup_states
  (machine_id, factory, package_name, body_size, thickness, process_type, remarks)
VALUES
  (@m_09hsi400t, 'F2', 'DFN', '5X7', 0.75, 'tubing', '09HSI400T-restricted'),
  (@m_09hsi400t, 'F2', 'QFN', '5X7', 0.75, 'tubing', '09HSI400T-restricted');