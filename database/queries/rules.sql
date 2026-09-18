select * from qdn_db.machine_setup_states where remarks like '%G6L%';
select * from qdn_db.machine_setup_states where package_name = "SOIC_N";
select * from qdn_db.machine_transition_rules;

select ml.machine_num, ss.* from qdn_db.machine_setup_states as ss join qdn_db.machine_list as ml on ml.id = ss.machine_id where package_name = "SOIC_N";
select * from qdn_db.machine_setup_states where machine_id = 101;
select * from qdn_db.machine_transition_rules where to_state_id = 900;
select * from qdn_db.machine_transition_rules where from_state_id = 900;
select * from qdn_db.machine_capability_part_rules where setup_state_id = 900;

select * from ppc.customer_data_wip where Part_Name like '%ADG884%';
select * from qdn_db.machine_list where machine_num like '%29at1%';

select * from qdn_db.machine_setup_states where machine_id = 230 limit 9999;
select * from qdn_db.machine_setup_states limit 9999;
select * from qdn_db.machine_setup_states where machine_id = 279;
select * from qdn_db.machine_transition_rules where from_state_id = 32;
select * from qdn_db.machine_capability_part_rules where setup_state_id = 32;
select * from qdn_db.machine_capability_part_rules where setup_state_id = 32;

show create table qdn_db.package_list;

select * from qdn_db.machine_transition_rules;
select * from qdn_db.package_list where devicename = 'DAC8512FSZ';
select distinct devicename from qdn_db.package_list where package_type = 'LFCSP' limit 9999;
select distinct devicename from qdn_db.package_list where devicename = 'LTC4286AUKM#TRPBF';
select distinct devicename from qdn_db.package_list where package_type = 'LFCSP_SS' and lead_count = '48';

select * from qdn_db.machine_focus_group_rules;
show create table qdn_db.machine_setup_states;

select * from qdn_db.package_list where devicename = 'LT8641JUDC#WTRPBF';

select distinct lead_count from qdn_db.package_list where package_type = 'TSOT';
show create table loading_plan_entries;

SELECT m.machine_num
FROM (
    SELECT '01DYSEC' AS machine_num UNION ALL
    SELECT '02DIPBR' UNION ALL
    SELECT '14HSI250' UNION ALL
    SELECT '02SOLAS' UNION ALL
    SELECT '03SOLAS' UNION ALL
    SELECT '04SOLAS' UNION ALL
    SELECT '05SOLAS' UNION ALL
    SELECT '01MH3020' UNION ALL
    SELECT '27HSI250' UNION ALL
    SELECT '07ISMECA' UNION ALL
    SELECT '03MLAS' UNION ALL
    SELECT '01MLAS' UNION ALL
    SELECT 'FVI' UNION ALL
    SELECT '02MLAS' UNION ALL
    SELECT 'KTBP02'
) AS m
LEFT JOIN qdn_db.machine_list ml
    ON ml.machine_num = m.machine_num
WHERE ml.machine_num IS NULL;
select * from ppc.machine_day_starts where machine_id = 91;
----------------------------------------------------
----------------------------------------------------
SELECT ml.machine_num, ml.id AS machine_id,
       COUNT(mss.setup_state_id) AS existing_states
FROM qdn_db.machine_list ml
LEFT JOIN qdn_db.machine_setup_states mss ON mss.machine_id = ml.id
WHERE UPPER(TRIM(ml.machine_num)) IN (
  '70AT28','11AT128','04G6','06G6','07G6','12G6','21G6','38G6','57G6','39G6',
  '43G6','05G6','01MV883','06HSI200','02AT468','10G6','54G6','33G6','42G6',
  '47G6','45AT28','51AT28','58AT28','48AT28','25AT128','21AT128','13G6',
  '04MV853A','08G6','11G6','48G6','53G6','36G6','15AT128','39AT28','09G6',
  '10AT128','02MV853A','50G6','29AT128','02G6','34G6','52AT28','04STI',
  '27AT28','29AT28','34AT28','44G6','20G6','24G6','26G6','27G6','28G6',
  '40G6','45G6','58G6','62G6','29G6','41G6','07HSI200','09HSI200','33HSI250',
  '32G6','49G6','30G6','51G6','AT128040','46G6','14G6','35AT28','23G6',
  '08HSI200','60G6','24AT28','16STI','19AT28','03G6','24AT128','18G6','25G6',
  '12HSI','22G6','01ST60','06ST60','01MV853A','01G6'
)
GROUP BY ml.machine_num, ml.id
ORDER BY existing_states DESC;
----------------------------------------------------
----------------------------------------------------

select * from qdn_db.machine_list where machine_num = '26HSI250';
select * from qdn_db.machine_list where machine_num like '%HSI250%';

select * from qdn_db.machine_setup_states where machine_id = 151;


