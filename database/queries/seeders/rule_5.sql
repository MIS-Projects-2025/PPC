select * from qdn_db.machine_list where machine_num like '%HSI250%';
select * from qdn_db.machine_setup_states;



-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, body_size, thickness, process_type, remarks)
-- SELECT id, 'F1', 'LFCSP', '2X2', 0.55, 'both', 'HSI250-only' FROM qdn_db.machine_list WHERE machine_num LIKE '%HSI250%';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, body_size, thickness, process_type, remarks)
-- SELECT id, 'F1', 'LFCSP', '2X2', 0.58, 'both', 'HSI250-only' FROM qdn_db.machine_list WHERE machine_num LIKE '%HSI250%';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, body_size, thickness, process_type, remarks)
-- SELECT id, 'F1', 'LFCSP_RT', '2X2', 0.58, 'both', 'HSI250-only' FROM qdn_db.machine_list WHERE machine_num LIKE '%HSI250%';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, focus_group, package_name, process_type, remarks)
-- SELECT id, 'F1', 'MPD', 'LFCSP_SS', 'both', 'Vitrox-restricted (MPD)'
-- FROM qdn_db.machine_list WHERE machine_num IN ('01Vitrox','04Vitrox','14Vitrox','10Vitrox');

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, focus_group, package_name, process_type, remarks)
-- SELECT id, 'F1', 'MPD', 'LFCSP', 'both', 'Vitrox-restricted (MPD)'
-- FROM qdn_db.machine_list WHERE machine_num IN ('01Vitrox','04Vitrox','14Vitrox','10Vitrox');