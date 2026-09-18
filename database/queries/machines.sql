select * from qdn_db.machine_list where machine_num like "%05HSI400T%";
select * from qdn_db.machine_list where machine_num like "%06HSI%";
show create table qdn_db.machine_list;
show create table qdn_db.package_list;
select * from qdn_db.package_list where devicename = 'ADW80038SRQZ-RL7';
select * from qdn_db.package_list where package_type = 'soic_n' and lead_count = 8;

select * from ppc.customer_data_wip where `Package_Name` = 'MINI_SO';
select distinct `Focus_Group` from ppc.customer_data_wip where `Package_Name` = 'MINI_SO';
select distinct `Focus_Group` from ppc.customer_data_wip where `Package_Name` = 'MINI_SO_EP';
select distinct `Focus_Group` from ppc.customer_data_wip where `Package_Name` = 'TSSOP_4.4_EP';
select distinct `Focus_Group` from ppc.customer_data_wip where `Package_Name` = 'SOIC_W';

select * from qdn_db.machine_focus_group_rules;

SELECT
    setup_state_id,
    machine_id,
    factory,
    (focus_group IS NULL) AS wild_focus_group,
    (package_name IS NULL) AS wild_package,
    (body_size IS NULL) AS wild_body_size,
    (thickness IS NULL) AS wild_thickness,
    (leadcount_include IS NULL AND leadcount_min IS NULL AND leadcount_max IS NULL) AS wild_leadcount,
    (process_type = 'both') AS wild_process,
    remarks
FROM qdn_db.machine_setup_states
WHERE factory IS NOT NULL
ORDER BY
    (focus_group IS NULL)
  + (package_name IS NULL)
  + (body_size IS NULL)
  + (thickness IS NULL)
  + (leadcount_include IS NULL AND leadcount_min IS NULL AND leadcount_max IS NULL)
  + (process_type = 'both') DESC
LIMIT 50;


select * from qdn_db.machine_list where id = 49;

select * from qdn_db.machine_setup_states where machine_id = 49;

SELECT setup_state_id, machine_id, factory, package_name, focus_group,
       remarks
FROM qdn_db.machine_setup_states
WHERE remarks LIKE '% exclusive'
  AND setup_state_id NOT IN (
      SELECT setup_state_id FROM qdn_db.machine_capability_part_rules
  )
ORDER BY
    (package_name IS NULL) + (focus_group IS NULL) + (body_size IS NULL) DESC;

INSERT INTO machine_capability_part_rules (setup_state_id, match_type, match_value)
SELECT setup_state_id, 'contains', TRIM(SUBSTRING_INDEX(remarks, ' exclusive', 1))
FROM machine_setup_states
WHERE setup_state_id = 848;

select * from qdn_db.machine_capability_part_rules;
select * from qdn_db.machine_setup_states where setup_state_id = 334;
select * from qdn_db.machine_setup_states where remarks like '%ADG884%' limit 100;
select * from qdn_db.machine_capability_part_rules where setup_state_id = 848;

SELECT mcpr.*
FROM qdn_db.machine_capability_part_rules as mcpr
JOIN qdn_db.machine_setup_states as mss 
  ON mcpr.setup_state_id = mss.setup_state_id
WHERE mss.remarks LIKE '%ADG884%';

SELECT mss.setup_state_id, mss.machine_id, mss.remarks
FROM qdn_db.machine_setup_states mss
LEFT JOIN qdn_db.machine_capability_part_rules mcpr
  ON mcpr.setup_state_id = mss.setup_state_id
WHERE mss.remarks LIKE '%exclusive%'
  AND mcpr.setup_state_id IS NULL;

select * from loading_plan_entries where scheduled_date = '2026-09-15';

SELECT lot_id, scheduled_date, COUNT(*) c, GROUP_CONCAT(id) entry_ids, GROUP_CONCAT(machine_id) machine_ids
FROM loading_plan_entries
WHERE entry_type = 'lot' AND time_end IS NULL  -- adjust to match your open() scope
GROUP BY lot_id, scheduled_date
HAVING c > 1;

show create table lot_quantities;
show create table ppc.lot_quantity_history;


-- `xx_lot_quantity_history` (
--   `id` bigint unsigned NOT NULL AUTO_INCREMENT,
--   `lot_quantity_id` bigint unsigned NOT NULL,
--   `lot_id` varchar(255) NOT NULL,
--   `scheduled_date` date NOT NULL,
--   `changed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   `changed_by` bigint unsigned DEFAULT NULL,
--   `change_type` enum('created','updated','deleted') NOT NULL DEFAULT 'updated',
--   `changed_columns` json DEFAULT NULL,
--   `old_values` json DEFAULT NULL,
--   `new_values` json DEFAULT NULL,
--   PRIMARY KEY (`id`),
--   KEY `idx_lqh_lot_quantity` (`lot_quantity_id`,`changed_at`),
--   KEY `idx_lqh_lot_date` (`lot_id`,`scheduled_date`,`changed_at`)
-- ) ENGINE=InnoDB AUTO_INCREMENT=388 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
-- `xx_lot_quantities` (
--   `id` bigint unsigned NOT NULL AUTO_INCREMENT,
--   `lot_id` varchar(255) NOT NULL,
--   `scheduled_date` date NOT NULL,
--   `part_name` varchar(255) NOT NULL,
--   `qty_base` int unsigned NOT NULL,
--   `split_adjustment` int NOT NULL DEFAULT '0',
--   `merge_adjustment` int NOT NULL DEFAULT '0',
--   `qty_override` int unsigned DEFAULT NULL,
--   `commit` int unsigned DEFAULT NULL,
--   `recipe_used` int unsigned DEFAULT NULL,
--   `recipe_source_id` bigint unsigned DEFAULT NULL,
--   `recipe_status` enum('ok','no_recipe','qty_below_recipe') NOT NULL DEFAULT 'no_recipe',
--   `capacity_uph_snapshot` int unsigned DEFAULT NULL,
--   `created_at` timestamp NULL DEFAULT NULL,
--   `updated_at` timestamp NULL DEFAULT NULL,
--   PRIMARY KEY (`id`),
--   UNIQUE KEY `lot_quantities_lot_id_scheduled_date_unique` (`lot_id`,`scheduled_date`)
-- ) ENGINE=InnoDB AUTO_INCREMENT=947888 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

select * from qdn_db.machine_setup_states where setup_state_id = 848;
show create table qdn_db.machine_setup_states;

select 

-- select * from qdn_db.machine_list where machine_num like "%HSI400T%";
-- 110	02HSI400T	HSI400	TURRET	TNR	PMNT 2050	CN 1002	9002214	EXISTECH	Active	01/01/2013	PL1	F2	EXISTECH	2518 x 1250 X 2100	230
-- 113	03HSI400T	HSI400	TURRET	TNR	PMNT 2053	CN 1003	9002192	EXISTECH	Active	01/01/2020	PL6	F3	EXISTECH	2518 x 1250 X 2100	230
-- 116	04HSI400T	HSI400	TURRET	TNR	PMNT 2056	CN 1005	9002191	EXISTECH	Active	01/01/2020	PL6	F1	EXISTECH	2518 x 1250 X 2100	230
-- 119	05HSI400T	HSI400	TURRET	TNR	PMNT 2069	CN 1007	9002193	EXISTECH	Active	01/01/2020	PL6	F2	EXISTECH	2518 x 1250 X 2100	230
-- 121	06HSI400T	HSI400	TURRET	TNR	PMNT 2119	CN 1015	9002250	EXISTECH	Active	01/01/2020	PL1	F1	EXISTECH	2518 x 1250 X 2100	230
-- 124	07HSI400T	HSI400	TURRET	TNR	PMNT 2122	CN 1016	9002252	EXISTECH	Active	01/01/2020	PL6	F1	EXISTECH	2518 x 1250 X 2100	230
-- 127	08HSI400T	HSI400	TURRET	TNR	PMNT 2139	CN 1019	9002253	EXISTECH	Active	01/01/2020	PL1	F1	EXISTECH	2518 x 1250 X 2100	230
-- 129	09HSI400T	HSI400	TURRET	TNR	PMNT 2153	CN 1024	9002251	EXISTECH	Active	01/01/2020	PL6	F2	EXISTECH	2518 x 1250 X 2100	230
-- 131	10HSI400T	HSI400	TURRET	TNR	PMNT 2170	CN 1028	9002258	EXISTECH	Active	01/01/2020	PL6	F2	EXISTECH	2518 x 1250 X 2100	230
-- 155	29HSI400T	HSI400	TURRET	TNR	PMNT 1953	CN 971	9002148	EXISTECH	Active	01/01/2020	PL4	RES	EXISTECH	2518 x 1250 X 2100	230