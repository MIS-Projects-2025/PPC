-- ============================================================
-- Seed script: machine_capability_part_rules
-- Source: pasted part/restriction list (317 parts, 366 part->machine pairs)
--
-- Approach:
--   1. Load (part_name, machine_code) pairs into a staging table.
--   2. Resolve machine_code -> machine_list.id -> machine_setup_states.setup_state_id
--      (a restriction to a machine is applied to EVERY setup_state row that
--       machine currently has, since the source list gives no package/body_size
--       to narrow it further -- see note at the bottom if that's wrong).
--   3. Insert one rule row per (part, setup_state_id), match_type = 'exact',
--      skipping any combination that already exists.
--
-- Adjust the `qdn_db.` schema prefix below if your session already USEs it.
-- ============================================================

SET @m_15vitrox = (SELECT id FROM machine_list WHERE machine_num = '15Vitrox');

-- Only INSERT a new setup_state if 15Vitrox doesn't already have one
-- matching this part's real package/body_size/leadcount — if it does,
-- skip this INSERT and use that existing setup_state_id below instead.
INSERT INTO machine_setup_states
  (machine_id, factory, package_name, body_size, process_type, remarks)
VALUES
  (@m_15vitrox, 
    'F1', 
    /* real package_name */ NULL,
    /* real body_size */ NULL,
   'both',
   'ADRV9061BBPZ-RL exclusive'
);

SET @state_15vitrox = LAST_INSERT_ID();

INSERT INTO machine_capability_part_rules
  (setup_state_id, match_type, match_value)
VALUES
  (@state_15vitrox, 'exact', 'ADRV9061BBPZ-RL');

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS `_seed_part_machine_map`;
CREATE TEMPORARY TABLE `_seed_part_machine_map` (
  `part_name` varchar(100) NOT NULL,
  `machine_code` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

select * from qdn_db.machine_capability_part_rules;

INSERT INTO `_seed_part_machine_map` (`part_name`, `machine_code`) VALUES
('ADRF5024BCCZN', '10ST60'),
('ADRF5024BCCZN', '06ST60'),
('ADRF5025BCCZN', '10ST60'),
('ADRF5025BCCZN', '06ST60'),
('ADRF5024BCCZN-R7', '10ST60'),
('ADRF5024BCCZN-R7', '06ST60'),
('ADRF5025BCCZN-R7', '10ST60'),
('ADRF5025BCCZN-R7', '06ST60'),
('ADRF5721BCCZN', '10ST60'),
('ADRF5721BCCZN', '06ST60'),
('ADRF5731BCCZN', '10ST60'),
('ADRF5731BCCZN', '06ST60'),
('ADRF5721BCCZN-R7', '10ST60'),
('ADRF5721BCCZN-R7', '06ST60'),
('ADRF5731BCCZN-R7', '10ST60'),
('ADRF5731BCCZN-R7', '06ST60'),
('ADRF5740BCCZN', '10ST60'),
('ADRF5740BCCZN', '06ST60'),
('ADRF5740BCCZN-R7', '10ST60'),
('ADRF5740BCCZN-R7', '06ST60'),
('ADRF5010BCCZN-R7', '10ST60'),
('ADRF5010BCCZN-R7', '06ST60'),
('ADL5569BCPZ', '10ST60'),
('ADL5569BCPZ', '06ST60'),
('ADL5569BCPZ-R7', '10ST60'),
('ADL5569BCPZ-R7', '06ST60'),
('LT8641JUDC#WTRPBF', '05HSI400T'),
('LTC4364HDE-2#TRPBF', '05HSI400T'),
('ADA8282WBCPZ-R7', '10Vitrox'),
('ADA8282WBCPZ-R7', '04Vitrox'),
('ADA8282WBCPZ-R7', '14Vitrox'),
('AD22424BZ-RL', '25HEXA'),
('AD22424BZ-RL', '07Vitrox'),
('ADXRS623BBGZ-RL', '25HEXA'),
('ADXRS623BBGZ-RL', '07Vitrox'),
('ADXRS620BBGZ-RL', '25HEXA'),
('ADXRS620BBGZ-RL', '07Vitrox'),
('ADXRS646BBGZ-RL', '25HEXA'),
('ADXRS646BBGZ-RL', '07Vitrox'),
('ADXRS642BBGZ-RL', '25HEXA'),
('ADXRS642BBGZ-RL', '07Vitrox'),
('ADXRS624BBGZ-RL', '25HEXA'),
('ADXRS624BBGZ-RL', '07Vitrox'),
('ADXRS646TBGZ-EP-RL', '25HEXA'),
('ADXRS646TBGZ-EP-RL', '07Vitrox'),
('ADXRS649BBGZ-RL', '25HEXA'),
('ADXRS649BBGZ-RL', '07Vitrox'),
('AD22424BZ-B2-RL', '25HEXA'),
('AD22424BZ-B2-RL', '07Vitrox'),
('ADXRS623BBGZ', '25HEXA'),
('ADXRS623BBGZ', '07Vitrox'),
('ADXRS642BBGZ', '25HEXA'),
('ADXRS642BBGZ', '07Vitrox'),
('ADXRS646BBGZ', '25HEXA'),
('ADXRS646BBGZ', '07Vitrox'),
('ADXRS622BBGZ', '25HEXA'),
('ADXRS622BBGZ', '07Vitrox'),
('ADXRS620BBGZ', '25HEXA'),
('ADXRS620BBGZ', '07Vitrox'),
('ADXRS646TBGZ-EP', '25HEXA'),
('ADXRS646TBGZ-EP', '07Vitrox'),
('AD22424BZ', '25HEXA'),
('AD22424BZ', '07Vitrox'),
('AD22424BZ-B2', '25HEXA'),
('AD22424BZ-B2', '07Vitrox'),
('ADXRS624BBGZ', '25HEXA'),
('ADXRS624BBGZ', '07Vitrox'),
('ADXRS652BBGZ', '25HEXA'),
('ADXRS652BBGZ', '07Vitrox'),
('XD22424X', '25HEXA'),
('XD22424X', '07Vitrox'),
('ADXRS649BBGZ', '25HEXA'),
('ADXRS649BBGZ', '07Vitrox'),
('AD22425Z', '25HEXA'),
('AD22425Z', '07Vitrox'),
('LTC4286AUKM#TRPBF', '02AT268'),
('LTC4286AUK#TRPBF', '02AT268'),
('LTC4287AUK#TRPBF', '02AT268'),
('ADRV9061BBPZ-RL', '15Vitrox'),
('ADF7030-1BSTZN-RL', '26HEXA'),
('ADATE319KCPZ-24', '06Vitrox'),
('ADATE319KCPZ-24', '07Vitrox'),
('ADATE319KCPZ-24', '25Vitrox'),
('ADATE319KCPZ-24', '27Vitrox'),
('ADATE318-1BCPZ', '06Vitrox'),
('ADATE318-1BCPZ', '07Vitrox'),
('ADATE318-1BCPZ', '25Vitrox'),
('ADATE318-1BCPZ', '27Vitrox'),
('LTC3220EPF#TRPBF', '09ST60'),
('LTC3220EPF#TRPBF', '10ST60'),
('LTC3220IPF-1#TRPBF', '09ST60'),
('LTC3220IPF-1#TRPBF', '10ST60'),
('LTC3884IRHE#WTRPBF', '09ST60'),
('LTC3884IRHE#WTRPBF', '10ST60'),
('LTC3884IRHE-9#TRPBF', '09ST60'),
('LTC3884IRHE-9#TRPBF', '10ST60'),
('LTC7852ERHE#TRPBF', '09ST60'),
('LTC7852ERHE#TRPBF', '10ST60'),
('LTC3884IRHE-8#TRPBF', '09ST60'),
('LTC3884IRHE-8#TRPBF', '10ST60'),
('LT1086IM#TRPBF', '44G6L'),
('LT1086CM-3^3#TRPBF', '44G6L'),
('LT3088HM#TRPBF', '44G6L'),
('LT337AM#TRPBF', '44G6L'),
('LT1085IM#TRPBF', '44G6L'),
('LT3088EM#TRPBF', '44G6L'),
('LT1085CM#TRPBF', '44G6L'),
('LT1086CM#TRPBF', '44G6L'),
('LT1585CM-3^3#TRPBF', '44G6L'),
('LT1085CM-3^3#TRPBF', '44G6L'),
('LT1086IM-3^3#TRPBF', '44G6L'),
('LT1587CM-3^6#TRPBF', '44G6L'),
('LT1529IQ#TRPBF', '44G6L'),
('LT1185IQ#TRPBF', '44G6L'),
('LT1764AEQ#TRPBF', '44G6L'),
('LT1764EQ#TRPBF', '44G6L'),
('LT1129IQ#TRPBF', '44G6L'),
('LT1963AMPQ#TRPBF', '44G6L'),
('LT1963AEQ#TRPBF', '44G6L'),
('LT1963EQ-3^3#TRPBF', '44G6L'),
('LT1171IQ#TRPBF', '44G6L'),
('LT1172HVIQ#TRPBF', '44G6L'),
('LT1764AEQ#TR', '44G6L'),
('LT1764EQ-3^3#TRPBF', '44G6L'),
('LT1129IQ-5#TRPBF', '44G6L'),
('LT1076CQ#TRPBF', '44G6L'),
('LT1129IQ-3^3#TRPBF', '44G6L'),
('LT3080EQ#TRPBF', '44G6L'),
('LT1764AEQ-3^3#TRPBF', '44G6L'),
('LT1129CQ#TRPBF', '44G6L'),
('LT1963AEQ-1^5#TRPBF', '44G6L'),
('LT1529CQ#TRPBF', '44G6L'),
('LT1076IQ#TRPBF', '44G6L'),
('LT1963AEQ-1^8#TRPBF', '44G6L'),
('LT3015IQ#TRPBF', '44G6L'),
('LT3015EQ#TRPBF', '44G6L'),
('LT1185CQ#TRPBF', '44G6L'),
('LT1965IQ#TRPBF', '44G6L'),
('LT1175IQ#TRPBF', '44G6L'),
('LT1965EQ#TRPBF', '44G6L'),
('LT3083EQ#TRPBF', '44G6L'),
('LT1529CQ-5#TRPBF', '44G6L'),
('LT1129IQ#TR', '44G6L'),
('LT1129CQ-5#TRPBF', '44G6L'),
('LT1963AEQ-3^3#TR', '44G6L'),
('LT1529IQ-3^3#TRPBF', '44G6L'),
('LT1529IQ-5#TRPBF', '44G6L'),
('LT1764AEQ-1^5#TRPBF', '44G6L'),
('LT1171HVCQ#TRPBF', '44G6L'),
('LT1528CQ#TRPBF', '44G6L'),
('LT1963AEQ-3^3#TRPBF', '44G6L'),
('LT1965HQ#TRPBF', '44G6L'),
('LT1171HVIQ#TRPBF', '44G6L'),
('LT1764AEQ-2^5#TRPBF', '44G6L'),
('LT1082CQ#TRPBF', '44G6L'),
('LT1529CQ-3^3#TRPBF', '44G6L'),
('LT1963EQ#TRPBF', '44G6L'),
('LT1172CQ#TRPBF', '44G6L'),
('LT3083IQ#TRPBF', '44G6L'),
('LT1082IQ#TRPBF', '44G6L'),
('LT1170CQ#TRPBF', '44G6L'),
('LT1172HVCQ#TRPBF', '44G6L'),
('LT1963EQ-1^8#TRPBF', '44G6L'),
('LT1129CQ-3^3#TRPBF', '44G6L'),
('LT1963AEQ-2^5#TRPBF', '44G6L'),
('LT1965EQ-3^3#TRPBF', '44G6L'),
('LT1963AIQ#TRPBF', '44G6L'),
('LT1764EQ-2^5#TRPBF', '44G6L'),
('LT1171CQ#TRPBF', '44G6L'),
('LT1170IQ#TRPBF', '44G6L'),
('LT1963EQ-2^5#TRPBF', '44G6L'),
('LT1175MPQ#TRPBF', '44G6L'),
('LT1963AEQ#TR', '44G6L'),
('LT1764AEQ-1^8#TRPBF', '44G6L'),
('LT1764AMPQ#TRPBF', '44G6L'),
('LT1764AMPQ#TR', '44G6L'),
('LT1764EQ-1^5#TRPBF', '44G6L'),
('LT1764EQ-1^8#TRPBF', '44G6L'),
('LT3015MPQ-3^3#TRPBF', '44G6L'),
('LT3015EQ-5#TRPBF', '44G6L'),
('LT3015IQ-12#TRPBF', '44G6L'),
('LT1580IQ#TRPBF', '44G6L'),
('LT3015MPQ#TRPBF', '44G6L'),
('LT1965HQ#3ZYPBF', '44G6L'),
('LT3015IQ-2^5#TRPBF', '44G6L'),
('LT1175CQ#TRPBF', '44G6L'),
('LT1580CQ#TRPBF', '44G6L'),
('LT1764AEQ-1^8#TR', '44G6L'),
('LT1963AMPQ#TR', '44G6L'),
('LT3080IQ#TRPBF', '44G6L'),
('LT1513CR#TRPBF', '44G6L'),
('LT1513IR#TRPBF', '44G6L'),
('LT1374CR#TRPBF', '44G6L'),
('LT1374IR#TRPBF', '44G6L'),
('LT1210CR#TRPBF', '44G6L'),
('LT1076HVCR#TRPBF', '44G6L'),
('LT3091HR#TRPBF', '44G6L'),
('LT1513-2CR#TRPBF', '44G6L'),
('LT3086ER#TRPBF', '44G6L'),
('LT1374HVCR#TRPBF', '44G6L'),
('LT1210IR#TRPBF', '44G6L'),
('LT3081ER#TRPBF', '44G6L'),
('LT3086IR#TRPBF', '44G6L'),
('LT1076HVIR#3ZZPBF', '44G6L'),
('LT1374CR-SYNC#TRPBF', '44G6L'),
('LT1506IR#TRPBF', '44G6L'),
('LT1206CR#TRPBF', '44G6L'),
('LT1076IR#TRPBF', '44G6L'),
('LT1076CR#TRPBF', '44G6L'),
('LT1506IR-3^3#TRPBF', '44G6L'),
('LT1076CR-5#TRPBF', '44G6L'),
('LT1371HVIR#TRPBF', '44G6L'),
('LT1076HVIR#TRPBF', '44G6L'),
('LT1371HVCR#TRPBF', '44G6L'),
('LT1371CR#TRPBF', '44G6L'),
('LT3091IR#TRPBF', '44G6L'),
('LT1076IR#3ZZPBF', '44G6L'),
('LT1371IR#TRPBF', '44G6L'),
('LT1370CR#TRPBF', '44G6L'),
('LT3089ER#TRPBF', '44G6L'),
('LT1370HVIR#TRPBF', '44G6L'),
('LT1370IR#TRPBF', '44G6L'),
('LT1374HVIR#TR', '44G6L'),
('LT3086MPR#TRPBF', '44G6L'),
('LT3091ER#TRPBF', '44G6L'),
('LT1086IM#PBF', '44G6L'),
('LT3088EM#PBF', '44G6L'),
('LT1085IM#PBF', '44G6L'),
('LT1085CM#PBF', '44G6L'),
('LT1085CM-3^3#PBF', '44G6L'),
('LT1086CM#PBF', '44G6L'),
('LT1117CM-5#PBF', '44G6L'),
('LT1585CM-3^3#PBF', '44G6L'),
('LT1585ACM-1^5#PBF', '44G6L'),
('LT1086IM-3^3#PBF', '44G6L'),
('LT3088HM#PBF', '44G6L'),
('LT1587CM-3^3#PBF', '44G6L'),
('LT1086CM-3^3#PBF', '44G6L'),
('LT1117CM#PBF', '44G6L'),
('LT337AM#PBF', '44G6L'),
('LT1085CM-3^6#PBF', '44G6L'),
('LT1587CM-3^6#PBF', '44G6L'),
('LT1117CM-3^3#PBF', '44G6L'),
('LT3088MPM#PBF', '44G6L'),
('LT1963AEQ#PBF', '44G6L'),
('LT1185IQ#PBF', '44G6L'),
('LT1764AEQ#PBF', '44G6L'),
('LT1764EQ#PBF', '44G6L'),
('LT1172HVIQ#PBF', '44G6L'),
('LT1129IQ#PBF', '44G6L'),
('LT1963AMPQ#PBF', '44G6L'),
('LT3080EQ#PBF', '44G6L'),
('LT1764AEQ-3^3#PBF', '44G6L'),
('LT1764EQ-3^3#PBF', '44G6L'),
('LT1963EQ-3^3#PBF', '44G6L'),
('LT1171IQ#PBF', '44G6L'),
('LT1171CQ#PBF', '44G6L'),
('LT1185CQ#PBF', '44G6L'),
('LT1129IQ-5#PBF', '44G6L'),
('LT3083EQ#PBF', '44G6L'),
('LT1175IQ#PBF', '44G6L'),
('LT1175CQ#PBF', '44G6L'),
('LT1129CQ#PBF', '44G6L'),
('LT1963EQ#PBF', '44G6L'),
('LT3080IQ#PBF', '44G6L'),
('LT1580IQ#PBF', '44G6L'),
('LT3015IQ#PBF', '44G6L'),
('LT3015EQ#PBF', '44G6L'),
('LT1965EQ#PBF', '44G6L'),
('LT1076CQ#PBF', '44G6L'),
('LT1965IQ#PBF', '44G6L'),
('LT1129CQ-5#PBF', '44G6L'),
('LT1963AEQ-3^3', '44G6L'),
('LT1529IQ-3^3#PBF', '44G6L'),
('LT1529IQ-5#PBF', '44G6L'),
('LT1185IQ', '44G6L'),
('LT1580CQ#PBF', '44G6L'),
('LT3015EQ-2^5#PBF', '44G6L'),
('LT1529CQ-5#PBF', '44G6L'),
('LT1171HVIQ#PBF', '44G6L'),
('LT1764AEQ-2^5#PBF', '44G6L'),
('LT1963AEQ-3^3#PBF', '44G6L'),
('LT1764AMPQ#PBF', '44G6L'),
('LT1076CQ-5#PBF', '44G6L'),
('LT1963AEQ-1^5#PBF', '44G6L'),
('LT1764EQ-2^5', '44G6L'),
('LT1076IQ#PBF', '44G6L'),
('LT1528CQ#PBF', '44G6L'),
('LT1082IQ#PBF', '44G6L'),
('LT1580IQ', '44G6L'),
('LT1172CQ#PBF', '44G6L'),
('LT3083IQ#PBF', '44G6L'),
('LT1529CQ#PBF', '44G6L'),
('LT1129IQ', '44G6L'),
('LT1170HVCQ#PBF', '44G6L'),
('LT1963AEQ-1^8#PBF', '44G6L'),
('LT1963AEQ-2^5#PBF', '44G6L'),
('LT1963AIQ#PBF', '44G6L'),
('LT1764EQ-1^8#PBF', '44G6L'),
('LT1171HVCQ#PBF', '44G6L'),
('LT1764AEQ-1^5#PBF', '44G6L'),
('LT1129CQ-3^3#PBF', '44G6L'),
('LT1965HQ#PBF', '44G6L'),
('LT1963EQ-2^5#PBF', '44G6L'),
('LT1175MPQ#PBF', '44G6L'),
('LT1963AEQ', '44G6L'),
('LT1764AEQ-1^8#PBF', '44G6L'),
('LT1175IQ-5#PBF', '44G6L'),
('LT1175IQ-5', '44G6L'),
('LT1529CQ-3^3#PBF', '44G6L'),
('LT3015IQ-12#PBF', '44G6L'),
('LT1170IQ#PBF', '44G6L'),
('LT1129IQ-3^3#PBF', '44G6L'),
('LT3015MPQ#PBF', '44G6L'),
('LT3083MPQ#PBF', '44G6L'),
('LT3015IQ-2^5#PBF', '44G6L'),
('LT1170CQ#PBF', '44G6L'),
('LT1529IQ#PBF', '44G6L'),
('LT1764AEQ', '44G6L'),
('LT1764AEQ-1^8', '44G6L'),
('LT1764AEQ-3^3', '44G6L'),
('LT1764EQ-2^5#PBF', '44G6L'),
('LT1963AMPQ', '44G6L'),
('LT1963EQ-1^5#PBF', '44G6L'),
('LT1965EQ-1^5#PBF', '44G6L'),
('LT1965EQ-3^3#PBF', '44G6L'),
('LT3015IQ-5#PBF', '44G6L'),
('LT1374HVCR#PBF', '44G6L'),
('LT1371IR#PBF', '44G6L'),
('LT1513IR#PBF', '44G6L'),
('LT3086IR#PBF', '44G6L'),
('LT1210CR#PBF', '44G6L'),
('LT3091IR#PBF', '44G6L'),
('LT3086MPR#PBF', '44G6L'),
('LT3091ER#PBF', '44G6L'),
('LT1076HVCR#PBF', '44G6L'),
('LT1370IR#PBF', '44G6L'),
('LT1374HVIR', '44G6L'),
('LT3086ER#PBF', '44G6L'),
('LT1371CR#PBF', '44G6L'),
('LT1513-2CR#PBF', '44G6L'),
('LT3081ER#PBF', '44G6L'),
('LT1076HVIR#PBF', '44G6L'),
('LT1206CR#PBF', '44G6L'),
('LT1506IR-3^3#PBF', '44G6L'),
('LT1076CR-5#PBF', '44G6L'),
('LT1371HVCR#PBF', '44G6L'),
('LT1210IR#PBF', '44G6L'),
('LT1374CR-SYNC#PBF', '44G6L'),
('LT1374HVIR#PBF', '44G6L'),
('LT1374CR#PBF', '44G6L'),
('LT1374IR#PBF', '44G6L'),
('LT1076CR#PBF', '44G6L'),
('LT1513CR#PBF', '44G6L'),
('LT1506IR#PBF', '44G6L'),
('LT3081IR#PBF', '44G6L'),
('LT3089ER#PBF', '44G6L'),
('LT1959IR#PBF', '44G6L'),
('LT1580IR-2^5#PBF', '44G6L'),
('LT1076IR#PBF', '44G6L'),
('LT1513-2IR#PBF', '44G6L'),
('LT1370HVIR#PBF', '44G6L'),
('LT1371HVIR#PBF', '44G6L'),
('LT1374IR-5SYNC#PBF', '44G6L'),
('LT3091MPR#PBF', '44G6L'),
('LT612017RVR#W-ES', '44G6L');

-- ------------------------------------------------------------
-- Diagnostic: machine codes in the source data that don't match
-- any machine_list.machine_num. Fix these (or fix machine_list)
-- before trusting the insert below -- unmatched codes silently
-- drop their parts from the result via the INNER JOINs.
-- ------------------------------------------------------------
SELECT DISTINCT spm.machine_code
FROM `_seed_part_machine_map` spm
LEFT JOIN qdn_db.machine_list ml ON ml.machine_num = spm.machine_code
WHERE ml.id IS NULL;

-- ------------------------------------------------------------
-- Diagnostic: machines that resolved in machine_list but have
-- zero rows in machine_setup_states (so no setup_state_id to
-- attach a rule to -- those parts also won't get seeded below).
-- ------------------------------------------------------------
SELECT DISTINCT spm.machine_code, ml.id AS machine_id
FROM `_seed_part_machine_map` spm
JOIN qdn_db.machine_list ml ON ml.machine_num = spm.machine_code
LEFT JOIN qdn_db.machine_setup_states mss ON mss.machine_id = ml.id
WHERE mss.setup_state_id IS NULL;

-- ------------------------------------------------------------
-- Actual seed: one rule row per (part, setup_state_id), deduped
-- against anything already in the table.
-- ------------------------------------------------------------
INSERT INTO qdn_db.machine_capability_part_rules
  (`setup_state_id`, `match_type`, `match_value`, `created_at`, `updated_at`)
SELECT DISTINCT
  mss.setup_state_id,
  'exact',
  spm.part_name,
  NOW(),
  NOW()
FROM `_seed_part_machine_map` spm
JOIN qdn_db.machine_list ml ON ml.machine_num = spm.machine_code
JOIN qdn_db.machine_setup_states mss ON mss.machine_id = ml.id
WHERE NOT EXISTS (
  SELECT 1 FROM qdn_db.machine_capability_part_rules r
  WHERE r.setup_state_id = mss.setup_state_id
    AND r.match_type = 'exact'
    AND r.match_value = spm.part_name
);

-- Review the two diagnostic SELECTs and the row count above before
-- committing. Roll back instead if anything looks off.
COMMIT;
-- ROLLBACK;

select * from qdn_db.machine_capability_part_rules;

SELECT ml.machine_num, mss.machine_id, COUNT(*) AS state_count
FROM qdn_db.machine_setup_states mss
JOIN qdn_db.machine_list ml ON ml.id = mss.machine_id
GROUP BY ml.machine_num, mss.machine_id;
select * from qdn_db.machine_list where machine_num = '05HSI400T';
select machine_num, factory from qdn_db.machine_list;
DROP TEMPORARY TABLE IF EXISTS `_seed_part_machine_map`;

SELECT id, machine_num, factory
FROM qdn_db.machine_list
WHERE machine_num IN (
  '02AT268','04Vitrox','05HSI400T','06ST60','06Vitrox','07Vitrox',
  '09ST60','10ST60','10Vitrox','14Vitrox','15Vitrox','25HEXA',
  '25Vitrox','26HEXA','27Vitrox','44G6L'
);

INSERT INTO qdn_db.machine_setup_states
  (`machine_id`, `factory`, `package_name`, `body_size`, `thickness`,
   `leadcount_min`, `leadcount_max`, `leadcount_exclude`, `process_type`,
   `created_at`, `updated_at`)
SELECT
  ml.id,
  ml.factory,
  NULL, NULL, NULL, NULL, NULL, NULL,
  'both',
  NOW(), NOW()
FROM qdn_db.machine_list ml
WHERE ml.machine_num IN (
  '04VITROX','06VITROX','07VITROX','10VITROX','14VITROX',
  '25VITROX','27VITROX','44G6L','05HSI400T','06ST60',
  '10ST60','09ST60','02AT268','25HEXA','26HEXA'
)
AND NOT EXISTS (
  SELECT 1 FROM qdn_db.machine_setup_states mss
  WHERE mss.machine_id = ml.id
);

-- Is machine_setup_states populated at all, for ANY machine?
SELECT COUNT(*) AS total_rows,
       COUNT(DISTINCT machine_id) AS distinct_machines
FROM qdn_db.machine_setup_states;

-- Which of your 16 target machine_ids actually appear (should be none, per your diagnostic)
SELECT ml.machine_num, ml.id AS machine_id
FROM qdn_db.machine_list ml
WHERE ml.machine_num IN (
  '02AT268','04Vitrox','05HSI400T','06ST60','06Vitrox','07Vitrox',
  '09ST60','10ST60','10Vitrox','14Vitrox','15Vitrox','25HEXA',
  '25Vitrox','26HEXA','27Vitrox','44G6L'
);

select * from ppc.machine_dedicated_parts;