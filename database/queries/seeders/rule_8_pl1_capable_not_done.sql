-- NOT DONE YET.
-- THERE SOME SOME LEFT OVER.

-- Seeded from wide-checkbox capability sheet (batch 2, 89 rows).
-- Package names are placeholder group labels per user -- seeded literally,
-- to be corrected/expanded later.

-- WARNING: row 26: neither TUBE nor TAPE checked for 25AT128/RN -- SKIPPED
-- WARNING: row 27: neither TUBE nor TAPE checked for 21AT128/RN -- SKIPPED
select * from ppc.customer_data_wip where `Package_Name` like '%LFCSP%' and `Ramp_Time` = 'Tube';
select * from ppc.f3 where import_date = '2026-09-08';
select * from ppc.f3 where import_date = '2026-09-06';
-- 48AT28

show create table qdn_db.qdn_db.machine_setup_states;

WITH input_list (raw_val) AS (
    SELECT '11AT128 ADGT' UNION ALL
    SELECT '04MV853A' UNION ALL
    SELECT '10AT128' UNION ALL
    SELECT '02MV853A (ADGT)' UNION ALL
    SELECT '04STI' UNION ALL
    SELECT '12HSI250'
)
SELECT 
    i.raw_val AS search_item,
    m.machine_num AS database_match
FROM input_list i
LEFT JOIN qdn_db.machine_list m
       ON LOWER(REPLACE(TRIM(i.raw_val), 'O', '0')) = LOWER(REPLACE(TRIM(m.machine_num), 'O', '0'));

select * from qdn_db.machine_list where machine_num like '%02MV853A (ADGT)%';
select * from qdn_db.machine_list where machine_num like '%11AT128 ADGT%';
select * from qdn_db.machine_list where machine_num like '%04MV853A (ADGT)%';
select * from qdn_db.machine_list where machine_num like '%10AT128 ADGT%';
select * from qdn_db.machine_list where machine_num like '%12HSI250%';

SELECT * 
FROM qdn_db.machine_list 
WHERE machine_num REGEXP '02MV853A (ADGT)|11AT128 ADGT|04MV853A|10AT128|12HSI250';

-- select * from qdn_db.machine_list where machine_num like '%02MV853A (ADGT)%';

-- CREATE TABLE `qdn_db.machine_setup_states` (
--   `setup_state_id` bigint unsigned NOT NULL AUTO_INCREMENT,
--   `machine_id` int NOT NULL,
--   `group_id` bigint unsigned DEFAULT NULL,
--   `factory` enum('F1','F2','F3') NOT NULL,
--   `focus_group` varchar(10) DEFAULT NULL,
--   `package_name` varchar(50) DEFAULT NULL,
--   `body_size` varchar(20) DEFAULT NULL,
--   `thickness` decimal(5,2) DEFAULT NULL,
--   `leadcount_min` int DEFAULT NULL,
--   `leadcount_max` int DEFAULT NULL,
--   `leadcount_exclude` varchar(50) DEFAULT NULL,
--   `leadcount_include` varchar(255) DEFAULT NULL,
--   `process_type` enum('taping','tubing','both') NOT NULL,
--   `capacity_daily` int DEFAULT NULL,
--   `remarks` varchar(255) DEFAULT NULL,
-- )

-- not done yet
INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
SELECT id, 'F1', 'LCC_MPD', '8,14', 'taping', 'PL: PL1'
FROM qdn_db.machine_list WHERE machine_num = '70AT28';
-- not done yet
INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
SELECT id, 'F1', 'LFCSP_TUBE_MPD', '32', 'both', 'PL: PL1'
FROM qdn_db.machine_list WHERE machine_num = '11AT128 ADGT';

select * from ppc.customer_data_wip where `Part_Name` like '%adxl%'; -- 60883
select * from ppc.customer_data_wip where `Part_Name` like '%adxl31%';
select * from ppc.customer_data_wip where `Package_Name` like '%LFCSP%' and f1_focus_group_flag = 1;

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '04G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO_EP', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '04G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINISO', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '04G6L';

-- not done yet
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MSOP', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '06G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '07G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO_EP', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '07G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINISO', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '07G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '12G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO_EP', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '12G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINISO', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '12G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '21G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO_EP', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '21G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINISO', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '21G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '38G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO_EP', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '38G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINISO', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '38G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '57G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO_EP', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '57G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINISO', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '57G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO', '8,10,12,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '39G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO_EP', '8,10,12,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '39G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINISO', '8,10,12,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '39G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO', '8,10,12,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '43G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO_EP', '8,10,12,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '43G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINISO', '8,10,12,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '43G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO', '8,10', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '05G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO_EP', '8,10', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '05G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINISO', '8,10', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '05G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'PLCC', '20,28,44', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '01MV883';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '06HSI200';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP_EP', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '06HSI200';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '06HSI200';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N_EP', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '06HSI200';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP', '8', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '02AT468';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP_EP', '8', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '02AT468';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N', '8', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '02AT468';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N_EP', '8', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '02AT468';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'RN', '8,14,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '10G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'RN', '8,14,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '54G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'RN', '8,14,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '33G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'RN', '8,14,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '42G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'RN', '8,14,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '47G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP', '8,14,16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '45AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP_EP', '8,14,16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '45AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N', '8,14,16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '45AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N_EP', '8,14,16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '45AT28';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP', '8,14,16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '51AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP_EP', '8,14,16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '51AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N', '8,14,16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '51AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N_EP', '8,14,16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '51AT28';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP', '8,14,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '58AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP_EP', '8,14,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '58AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N', '8,14,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '58AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N_EP', '8,14,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '58AT28';


-------------------------------------------------------------------------


INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
SELECT id, 'F1', 'RN', '8', 'taping', 'PL: PL1'
FROM qdn_db.machine_list WHERE machine_num = '48AT28';

-- 25AT128
-- 21AT128


-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP', '8,20', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '13G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP_EP', '8,20', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '13G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N', '8,20', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '13G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N_EP', '8,20', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '13G6L';

INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
SELECT id, 'F1', 'RN_MPD', '16', 'taping', 'PL: PL1'
FROM qdn_db.machine_list WHERE machine_num = '04MV853A';
--
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W_FP', '8,16,18,20,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '08G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_IC', '8,16,18,20,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '08G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W', '8,16,18,20,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '08G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W_FP', '8,16,18,20,24', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '11G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_IC', '8,16,18,20,24', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '11G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W', '8,16,18,20,24', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '11G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W_FP', '16,18,20', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '48G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_IC', '16,18,20', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '48G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W', '16,18,20', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '48G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W_FP', '16,18,20,24', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '53G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_IC', '16,18,20,24', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '53G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W', '16,18,20,24', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '53G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W_FP', '8,18,20,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '36G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_IC', '8,18,20,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '36G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W', '8,18,20,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '36G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W_FP', '16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '15AT128';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_IC', '16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '15AT128';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W', '16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '15AT128';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W_FP', '16,20,24,28', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '39AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_IC', '16,20,24,28', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '39AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W', '16,20,24,28', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '39AT28';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W_FP', '8,16,28', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '09G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_IC', '8,16,28', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '09G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_W', '8,16,28', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '09G6L';

INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
SELECT id, 'F1', 'RW_MPD', '16', 'taping', 'PL: PL1'
FROM qdn_db.machine_list WHERE machine_num = '10AT128';

INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
SELECT id, 'F1', 'SOIC_CAV_MPD/TSSOP', '16', 'taping', 'PL: PL1'
FROM qdn_db.machine_list WHERE machine_num = '02MV853A (ADGT)';

INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
SELECT id, 'F1', 'SSOP', '16,20,24,28', 'both', 'PL: PL1'
FROM qdn_db.machine_list WHERE machine_num = '50G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP', '14,16,20,24,28,48', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '29AT128';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4', '14,16,20,24,28,48', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '29AT128';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4_EP', '14,16,20,24,28,48', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '29AT128';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_6.1', '14,16,20,24,28,48', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '29AT128';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP-W', '14,16,20,24,28,48', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '29AT128';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP', '14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '02G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4', '14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '02G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4_EP', '14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '02G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_6.1', '14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '02G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP-W', '14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '02G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP', '14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '34G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4', '14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '34G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4_EP', '14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '34G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_6.1', '14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '34G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP-W', '14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '34G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP', '14,16,20,24,28', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '52AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4', '14,16,20,24,28', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '52AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4_EP', '14,16,20,24,28', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '52AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_6.1', '14,16,20,24,28', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '52AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP-W', '14,16,20,24,28', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '52AT28';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP', '8,14,16,20,24,28,38', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '04STI';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4', '8,14,16,20,24,28,38', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '04STI';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4_EP', '8,14,16,20,24,28,38', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '04STI';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_6.1', '8,14,16,20,24,28,38', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '04STI';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP-W', '8,14,16,20,24,28,38', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '04STI';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP', '16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '27AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4', '16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '27AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4_EP', '16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '27AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_6.1', '16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '27AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP-W', '16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '27AT28';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP', '16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '29AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4', '16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '29AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4_EP', '16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '29AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_6.1', '16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '29AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP-W', '16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '29AT28';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP', '14,16,20,24,28', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '34AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4', '14,16,20,24,28', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '34AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4_EP', '14,16,20,24,28', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '34AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_6.1', '14,16,20,24,28', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '34AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP-W', '14,16,20,24,28', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '34AT28';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'DDPAK', '3,5,7', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '44G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO', '8,10,16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '20G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO_EP', '8,10,16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '20G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO', '8,10,16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '24G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO_EP', '8,10,16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '24G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO', '8,10,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '26G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO_EP', '8,10,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '26G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO', '8,10,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '27G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO_EP', '8,10,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '27G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO', '8,10,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '28G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO_EP', '8,10,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '28G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO', '8,10,16', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '40G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO_EP', '8,10,16', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '40G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO', '8,10,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '45G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO_EP', '8,10,16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '45G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO', '8,10,16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '58G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO_EP', '8,10,16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '58G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO', '8,10,16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '62G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO_EP', '8,10,16', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '62G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'QSOP', '8,14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '29G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'QSOP_EP', '8,14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '29G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'SOIC_N', '8,14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '29G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'SOIC_N_EP', '8,14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '29G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'QSOP', '8,14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '41G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'QSOP_EP', '8,14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '41G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'SOIC_N', '8,14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '41G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'SOIC_N_EP', '8,14,16,20,24,28', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '41G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'QSOP', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '07HSI200';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'QSOP_EP', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '07HSI200';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'SOIC_N', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '07HSI200';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'SOIC_N_EP', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '07HSI200';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'QSOP', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '09HSI200';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'QSOP_EP', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '09HSI200';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'SOIC_N', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '09HSI200';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'SOIC_N_EP', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '09HSI200';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'QSOP', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '33HSI250';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'QSOP_EP', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '33HSI250';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'SOIC_N', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '33HSI250';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'SOIC_N_EP', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '33HSI250';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'SOIC_IC', '6,16,18,20,24', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '32G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'SOIC_W', '6,16,18,20,24', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '32G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'SOIC_W_FP', '6,16,18,20,24', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '32G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'SOT_223', '3', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '49G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'TSSOP', '14,16,20,24,28,38', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '30G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'TSSOP_4.4', '14,16,20,24,28,38', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '30G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'TSSOP_4.4_EP', '14,16,20,24,28,38', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '30G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'TSSOP_6.1', '14,16,20,24,28,38', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '30G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'TSSOP-W', '14,16,20,24,28,38', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '30G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'TSSOP', '16,20,24', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '51G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'TSSOP_4.4', '16,20,24', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '51G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'TSSOP_4.4_EP', '16,20,24', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '51G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'TSSOP_6.1', '16,20,24', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '51G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'TSSOP-W', '16,20,24', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '51G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'TSSOP', '16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = 'AT128040';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'TSSOP_4.4', '16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = 'AT128040';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'TSSOP_4.4_EP', '16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = 'AT128040';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'TSSOP_6.1', '16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = 'AT128040';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'TSSOP-W', '16', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = 'AT128040';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F3', 'TSSOP', '8,14,16,20,24,28,38', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '46G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F3', 'TSSOP_4.4', '8,14,16,20,24,28,38', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '46G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F3', 'TSSOP_4.4_EP', '8,14,16,20,24,28,38', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '46G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F3', 'TSSOP_6.1', '8,14,16,20,24,28,38', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '46G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F3', 'TSSOP-W', '8,14,16,20,24,28,38', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '46G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP', '8,14,16,28', 'both', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '14G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP_EP', '8,14,16,28', 'both', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '14G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N', '8,14,16,28', 'both', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '14G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N_EP', '8,14,16,28', 'both', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '14G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP', '8,14,16,28', 'tubing', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '35AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP_EP', '8,14,16,28', 'tubing', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '35AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N', '8,14,16,28', 'tubing', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '35AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N_EP', '8,14,16,28', 'tubing', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '35AT28';

INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
SELECT id, 'F2', 'RN/ QSOP', '8,14,16,28', 'tubing', 'PL: PL4 RES'
FROM qdn_db.machine_list WHERE machine_num = '23G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'QSON', '8,14,16,28', 'taping', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '08HSI200';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'QSON_EP', '8,14,16,28', 'taping', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '08HSI200';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'SOIC_N', '8,14,16,28', 'taping', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '08HSI200';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'SOIC_N_EP', '8,14,16,28', 'taping', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '08HSI200';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP', '8,14,16,28', 'both', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '60G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP_EP', '8,14,16,28', 'both', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '60G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N', '8,14,16,28', 'both', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '60G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N_EP', '8,14,16,28', 'both', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '60G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP', '14,16,20,24,28,38', 'both', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '24AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4', '14,16,20,24,28,38', 'both', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '24AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4_EP', '14,16,20,24,28,38', 'both', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '24AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_6.1', '14,16,20,24,28,38', 'both', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '24AT28';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP-W', '14,16,20,24,28,38', 'both', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '24AT28';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP', '14,16,20,24,28,38', 'tubing', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '16STI';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4', '14,16,20,24,28,38', 'tubing', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '16STI';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_4.4_EP', '14,16,20,24,28,38', 'tubing', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '16STI';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP_6.1', '14,16,20,24,28,38', 'tubing', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '16STI';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'TSSOP-W', '14,16,20,24,28,38', 'tubing', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '16STI';

INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
SELECT id, 'F1', 'RW', '16,20,24,28', 'both', 'PL: PL4 RES'
FROM qdn_db.machine_list WHERE machine_num = '19AT28';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO_EP', '8,10', 'both', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '03G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO', '8,10', 'both', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '03G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO_EP', '8,10', 'tubing', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '24AT128';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO', '8,10', 'tubing', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '24AT128';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO_EP', '8,10,12,16', 'taping', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '18G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO', '8,10,12,16', 'taping', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '18G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO_EP', '8,10,12,16', 'tubing', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '25G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'MINI_SO', '8,10,12,16', 'tubing', 'PL: PL4 RES'
-- FROM qdn_db.machine_list WHERE machine_num = '25G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '12HSI250';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'QSOP_EP', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '12HSI250';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '12HSI250';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'SOIC_N_EP', '8', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '12HSI250';


-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '22G6L';
-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'MINI_SO_EP', '8,10', 'both', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '22G6L';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'DDPAK', '3,5,7', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '01ST60';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F2', 'DDPAK', '3,5,7', 'taping', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '06ST60';

INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
SELECT id, 'F1', 'LFCSP_TUBE_MPD', '16', 'both', 'PL: PL1'
FROM qdn_db.machine_list WHERE machine_num = '01MV853A';

-- INSERT INTO qdn_db.machine_setup_states (machine_id, factory, package_name, leadcount_include, process_type, remarks)
-- SELECT id, 'F1', 'PDIP', '8', 'tubing', 'PL: PL1'
-- FROM qdn_db.machine_list WHERE machine_num = '01G6L';