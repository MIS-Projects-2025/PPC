select * from ppc.loading_plan_entries where id = 3409;

select * from ppc.lot_quantities where lot_id = 'BB52463.4';

show create table ppc.lot_quantities;
show create table ppc.loading_plan_entries;
select * from ppc.lot_quantity_history;
select distinct ramp_time from ppc.customer_data_wip;
select * from qdn_db.package_list where devicename = 'LT1085CM-3^3#TRPBF';
select * from qdn_db.package_list;
select * from qdn_db.machine_list;
select distinct machine_platform from qdn_db.machine_list;
select * from qdn_db.machine_capability_part_rules;
select * from qdn_db.machine_setup_groups;
select * from qdn_db.machine_setup_states;
select * from qdn_db.machine_capability_part_rules;
select * from qdn_db.machine_transition_rules;
select * from qdn_db.machine_platform_capacity_bands;

select * from loading_plan_entries where scheduled_date = '2026-09-15' limit 99999;
select * from loading_plan_entries where scheduled_date = '2026-09-15' and machine_id = 61;
select * from loading_plan_entries where id = 16985;


select * from customer_data_wip where `Lot_Id` = "BC88825.5" and import_date = '2026-09-17';
select * from customer_data_wip where `Lot_Id` = "BC88825.5";
select * from loading_plan_entries where `Lot_Id` = "BC88825.5";
-- select * from loading_plan_entries where ;
select * from customer_data_wip where `Lot_Id` = "BC88544.2";
select * from customer_data_wip where import_date = '2026-09-18';
select * from loading_plan_entries;

select * from ppc.loading_plan_entries where lot_id like '%BD17941%' and scheduled_date = '2026-09-18' limit 9999;
select * from ppc.loading_plan_entries where scheduled_date = '2026-09-18' limit 9999;

select * from loading_plan_entries where machine_id = 4 and scheduled_date = '2026-09-15' limit 999;

-- CREATE TABLE `x_lot_quantities` (
--   `x_id` bigint unsigned NOT NULL AUTO_INCREMENT,
--   `x_lot_id` varchar(255) NOT NULL,
--   `x_scheduled_date` date NOT NULL,
--   `x_part_name` varchar(255) NOT NULL,
--   `x_qty_base` int unsigned NOT NULL,
--   `x_split_adjustment` int NOT NULL DEFAULT '0',
--   `x_merge_adjustment` int NOT NULL DEFAULT '0',
--   `x_qty_override` int unsigned DEFAULT NULL,
--   `x_commit` int unsigned DEFAULT NULL,
--   `x_recipe_used` int unsigned DEFAULT NULL,
--   `x_recipe_source_id` bigint unsigned DEFAULT NULL,
--   `x_recipe_status` enum('ok','no_recipe','qty_below_recipe') NOT NULL DEFAULT 'no_recipe',
--   `x_capacity_uph_snapshot` int unsigned DEFAULT NULL,
--   `x_created_at` timestamp NULL DEFAULT NULL,
--   `x_updated_at` timestamp NULL DEFAULT NULL,
--   PRIMARY KEY (`id`),
--   UNIQUE KEY `x_lot_quantities_lot_id_scheduled_date_unique` (`lot_id`,`scheduled_date`)
-- ) ENGINE=InnoDB AUTO_INCREMENT=833158 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci