select * from ppc.customer_data_wip where `Part_Name` = 'LT7153SPAV#PBF';

select 
-- distinct `Package_Name`
distinct `Ramp_Time` 
from ppc.customer_data_wip where `Part_Name` in
(
'ADBMS6832MWCCSZ-RL',
'ADBMS6833MWFSCCSZ-RL',
'LT8355IUFDM-1#WTRPBFKL1',
'LT8355IUFDM-1#WTRPBF'
)


SELECT DISTINCT
    my_list.device, 
    my_list.package AS list_package,
    t.Package_Name AS db_package,
    CASE 
        WHEN t.Part_Name IS NULL THEN 'Device Missing Entirely'
        ELSE 'Package Mismatch'
    END AS status
FROM (
    SELECT 'ADBMS1816WCCSZ' AS device, 'LFCSP_SS' AS package UNION ALL
    SELECT 'ADW90032WCCSZ', 'LFCSP_SS' UNION ALL
    SELECT 'ADXRS624BBGZ-RL', 'CBGA' UNION ALL
    SELECT 'AD4851BBCZ-U1', 'CSP_BGA' UNION ALL
    SELECT 'ADBMS2951WFSCCSZ', 'LFCSP_SS' UNION ALL
    SELECT 'ADBMS2951WCCSZ', 'LFCSP_SS' UNION ALL
    SELECT 'ADBMS2950BCCSZ', 'LFCSP_SS' UNION ALL
    SELECT 'AD9253BCPZRL7-80', 'LFCSP' UNION ALL
    SELECT 'AD9246BCPZRL7-125', 'LFCSP' UNION ALL
    SELECT 'ADBMS6815WCSWZA', 'LQFP_EP' UNION ALL
    SELECT 'LTC2984CLX#PBF', 'LQFP' UNION ALL
    SELECT 'LTC7822AUKM-1#WTRPBF', 'LFCSP_SS' UNION ALL
    SELECT 'ADWFS91004BCCSZ', 'LFCSP_SS' UNION ALL
    SELECT 'LTC7878AUK#TRPBF', 'LFCSP' UNION ALL
    SELECT 'ADAS1280-3BCPZ-65', 'LFCSP' UNION ALL
    SELECT 'AD5422BCPZ-REEL', 'LFCSP' UNION ALL
    SELECT 'AD5410ACPZ-REEL7', 'LFCSP' UNION ALL
    SELECT 'ADAR4001ACPZ-R7', 'LFCSP' UNION ALL
    SELECT 'ADUC7022BCPZ32-RL', 'LFCSP' UNION ALL
    SELECT 'ADUC7020BCPZ62IRL7', 'LFCSP' UNION ALL
    SELECT 'ADMV1013ACCZ-R7', 'LGA' UNION ALL
    SELECT 'LT8685SRV#WPBFKL1', 'LGA' UNION ALL
    SELECT 'LT7200SAV#WTRPBF', 'LGA' UNION ALL
    SELECT 'LT8350SAV#PBF', 'LGA' UNION ALL
    SELECT 'LT8350RV#PBFKL1', 'LGA' UNION ALL
    SELECT 'LT8646SAAV#TRPBF-ES', 'LGA' UNION ALL
    SELECT 'LT8650SPJV#PBF', 'LGA' UNION ALL
    SELECT 'AD5750BCPZ-REEL7', 'LFCSP' UNION ALL
    SELECT 'ADW90002WCCSZ', 'LFCSP_SS' UNION ALL
    SELECT 'ADA4254ACPZ-RL', 'LFCSP' UNION ALL
    SELECT 'AD8392AACPZ-R7', 'LFCSP' UNION ALL
    SELECT 'AD9237BCPZRL7-40', 'LFCSP' UNION ALL
    SELECT 'AD9235BCPZRL7-20', 'LFCSP' UNION ALL
    SELECT 'AD9609BCPZ-40', 'LFCSP' UNION ALL
    SELECT 'AD4080BBCZ-RL', 'CSP_BGA' UNION ALL
    SELECT 'AD4081BBCZ-RL7', 'CSP_BGA' UNION ALL
    SELECT 'LT8638RV-2#WPBF', 'LGA' UNION ALL
    SELECT 'LTC3115EDHD-1#TRMPBF', 'DFN' UNION ALL
    SELECT 'ADRF5534XCPZN', 'LFCSP' UNION ALL
    SELECT 'AD5760ACPZ-REEL7', 'LFCSP' UNION ALL
    SELECT 'LT3397JUFDM-2A#WFSTRPBF-ES', 'LFCSP_SS' UNION ALL
    SELECT 'ADG1412LYCPZ-REEL7', 'LFCSP' UNION ALL
    SELECT 'ADF4360-9BCPZRL', 'LFCSP' UNION ALL
    SELECT 'AD8436ACPZ-RL', 'LFCSP' UNION ALL
    SELECT 'AD5675ACPZ-RL', 'LFCSP' UNION ALL
    SELECT 'AD7091R-5BCPZ-RL7', 'LFCSP' UNION ALL
    SELECT 'AD7682BCPZRL7KL2', 'LFCSP' UNION ALL
    SELECT 'AD7147ACPZ-1REEL', 'LFCSP' UNION ALL
    SELECT 'AD8142ACPZ-R7', 'LFCSP' UNION ALL
    SELECT 'AD8341ACPZ-REEL7', 'LFCSP' UNION ALL
    SELECT 'ADP5520ACPZ-R7', 'LFCSP' UNION ALL
    SELECT 'LT8640SHV-2#3ZZTRPBFKL1', 'LQFN' UNION ALL
    SELECT 'LT8643SHV-2#WTRPBFKL1', 'LQFN' UNION ALL
    SELECT 'AD3302WBCSZ-RL', 'LFCSP' UNION ALL
    SELECT 'LT3073AV#PBFKL1', 'LGA' UNION ALL
    SELECT 'LT7170RV-1#E0040-1PBF', 'LGA' UNION ALL
    SELECT 'LT8653SEV#TRPBF', 'LQFN' UNION ALL
    SELECT 'LT3099ADE#PBF-ES', 'LFCSP' UNION ALL
    SELECT 'LT8647RCPZ-RL-ES', 'LFCSP' UNION ALL
    SELECT 'LT8277RUDCM#WPBF', 'LFCSP' UNION ALL
    SELECT 'ADGM3144BCCZ-U2', 'LGA' UNION ALL
    SELECT 'LT7826ACPZ-U1', 'LFCSP' UNION ALL
    SELECT 'LT8336HV#WTRPBF', 'LQFN' UNION ALL
    SELECT 'LT8337EV#TRPBF', 'LQFN' UNION ALL
    SELECT 'LTC3310JV-1#WPBF', 'LQFN' UNION ALL
    SELECT 'LTC3310HV#3ZZPBF', 'LGA' UNION ALL
    SELECT 'LT8615RUDM#WPBF', 'LFCSP_SS' UNION ALL
    SELECT 'LT3480IDD#TRPBF', 'DFN' UNION ALL
    SELECT 'AD5390BSTZ-5', 'LQFN' UNION ALL
    SELECT 'AD5522JSVUZ-RL', 'TQFN_EP' UNION ALL
    SELECT 'ADBMS6830MWFSCSWZ', 'LFCSP_SS' UNION ALL
    SELECT 'ADATE328KBCZ-RL', 'CSP_BGA' UNION ALL
    SELECT 'ADES1830CCSZ-RL', 'LFCSP' UNION ALL
    SELECT 'AD80507BBPZ-REEL', 'CSP_BGA' UNION ALL
    SELECT 'ADBMS6842AWCCSZ-RL', 'LFCSP' UNION ALL
    SELECT 'ADWFS81218CSWZ-RL', 'LQFP'
) AS my_list
LEFT JOIN ppc.customer_data_wip t 
       ON my_list.device = t.Part_Name
WHERE t.Package_Name IS NULL 
   OR t.Package_Name <> my_list.package limit 99999;

SELECT my_list.device, my_list.package
FROM (
select 'AD652KPZ-REEL' as device,	'PLCC' as `package` union all
select 'AD7528JPZ-REEL'         ,	'PLCC' union all
select 'ADG406BPZ-REEL'         ,	'PLCC' union all
select 'AD7846JPZ-REEL'         ,	'PLCC' union all
select 'AD767JPZ-REEL'      ,	'PLCC' union all
select 'AD7845JPZ-REEL'         ,	'PLCC' union all
select 'AD2S82AHPZ-REEL'        ,	'PLCC' union all
select 'ADMV8052ACCZ'        ,	'LGA' union all
select 'ADXL355BEZ-RL'      ,	'LCC' union all
select 'ADXL357BEZ-RL'      ,	'LCC' union all
select 'ADXL354BEZ-RL'      ,	'LCC' union all
select 'ADXL356CEZ-RL7'         ,	'LCC' union all
select 'ADXL355BEZ-RL7'         ,	'LCC' union all
select 'ADXL357BEZ-RL7'         ,	'LCC' union all
select 'ADXL356BEZ-RL7'         ,	'LCC' union all
select 'ADXL354BEZ-RL7'         ,	'LCC' union all
select 'ADXL354CEZ-RL7'         ,	'LCC' union all
select 'AD9248BCPZRL-65'          ,	'LFCSP' union all
select 'ADW12001BCPZRL-40'      ,	'LFCSP' union all
select 'AD9613BCPZRL7-210'      ,	'LFCSP' union all
select 'AD5737ACPZ-RL7'         ,	'LFCSP' union all
select 'AD9522-4BCPZ-REEL7'         ,	'LFCSP' union all
select 'AD6649BCPZRL7'      ,	'LFCSP' union all
select 'AD5755BCPZ-REEL7'        ,	'LFCSP' union all
select 'AD9640ABCPZRL7-125'         ,	'LFCSP' union all
select 'AD9520-3BCPZ-REEL7'         ,	'LFCSP' union all
select 'AD9547BCPZ-REEL7'        ,	'LFCSP' union all
select 'AD5755ACPZ-REEL7'        ,	'LFCSP' union all
select 'AD5735ACPZ-REEL7'        ,	'LFCSP' union all
select 'ADBMS6832MWCCSZ-RL'         ,	'LFCSP_SS' union all
select 'ADRF8900WACSZ-RL'        ,	'LFCSP_SS' union all
select 'ADBMS6833MWFSCCSZ-RL'        ,	'LFCSP_SS' union all
select 'ADBMS6833MWCCSZ-RL'         ,	'LFCSP_SS' union all
select 'ADBMS6832MWFSCCSZ-RL'        ,	'LFCSP_SS' union all
select 'ADBMS6948WCCSZ-RL'      ,	'LFCSP_SS' union all
select 'ADBMS6948WCCSZM-RL'         ,	'LFCSP_SS' union all
select 'ADBMS6948WCCSZ'         ,	'LFCSP_SS' union all
select 'ADBMS6833MWCCSZ'          ,	'LFCSP_SS' union all
select 'ADBMS6833MWFSCCSZ'      ,	'LFCSP_SS' union all
select 'ADUC7128BCPZ126-RL'         ,	'LFCSP' union all
select 'AD7779ACPZ-RL'      ,	'LFCSP' union all
select 'AD7770ACPZ-RL'      ,	'LFCSP' union all
select 'AD74412RBCPZ-REEL'      ,	'LFCSP' union all
select 'AD7771BCPZ-RL'      ,	'LFCSP' union all
select 'ADUC7229BCPZ126-RL'         ,	'LFCSP' union all
select 'ADUC7025BCPZ62-RL'      ,	'LFCSP' union all
select 'AD8335ACPZ-REEL'          ,	'LFCSP' union all
select 'AD9238BCPZRL-40'          ,	'LFCSP' union all
select 'ADM1266ACPZ-R7'         ,	'LFCSP' union all
select 'AD9257BCPZRL7-40'        ,	'LFCSP' union all
select 'AD9628BCPZRL7-125'      ,	'LFCSP' union all
select 'AD74413RBCPZ-RL7'        ,	'LFCSP' union all
select 'ADUC7024BCPZ62-RL7'         ,	'LFCSP' union all
select 'AD9222ABCPZRL7-50'      ,	'LFCSP' union all
select 'AD9650BCPZRL7-25'        ,	'LFCSP' union all
select 'AD89033BCPZRL7-1300'          ,	'LFCSP' union all
select 'AD74412RBCPZ-RL7'        ,	'LFCSP' union all
select 'AD5755-1ACPZ-REEL7'         ,	'LFCSP' union all
select 'AD8335ACPZ-REEL7'        ,	'LFCSP' union all
select 'AD9231BCPZRL7-40'        ,	'LFCSP' union all
select 'AD9231BCPZRL7-80'        ,	'LFCSP' union all
select 'AD9251BCPZRL7-20'        ,	'LFCSP' union all
select 'AD9269BCPZRL7-20'        ,	'LFCSP' union all
select 'AD9648BCPZRL7-105'      ,	'LFCSP' union all
select 'AD9251BCPZRL7-40'        ,	'LFCSP' union all
select 'AD9252ABCPZRL7-50'      ,	'LFCSP' union all
select 'AD9695BCPZRL7-1300'         ,	'LFCSP' union all
select 'AD9258BCPZRL7-80'        ,	'LFCSP' union all
select 'AD9690BCPZRL7-500'      ,	'LFCSP' union all
select 'AD5370BCPZ-REEL7'        ,	'LFCSP' union all
select 'AD9680BCPZRL7-500'      ,	'LFCSP' union all
select 'AD9262BCPZRL7-5'          ,	'LFCSP' union all
select 'AD9648BCPZRL7-125'      ,	'LFCSP' union all
select 'AD9650BCPZRL7-105'      ,	'LFCSP' union all
select 'AD9269BCPZRL7-65'        ,	'LFCSP' union all
select 'ADM1266ACPZ-R7KL2'      ,	'LFCSP' union all
select 'AD74414HBCPZ-RL7'        ,	'LFCSP' union all
select 'AD9648BCPZ-125'         ,	'LFCSP' union all
select 'AD9251BCPZ-40'      ,	'LFCSP' union all
select 'AD9257BCPZ-65'      ,	'LFCSP' union all
select 'AD9628BCPZ-105'         ,	'LFCSP' union all
select 'ADXRS453BEYZ-RL'          ,	'LCC_V' union all
select 'ADATE304BBCZ'        ,	'CSP_BGA' union all
select 'ADV7384WBBCZ-RL'          ,	'CSP_BGA' union all
select 'ADV7384WBBCZ'        ,	'CSP_BGA' union all
select 'ADATE330KBCZ-RL'          ,	'CSP_BGA' union all
select 'ADATE324KBCZ'        ,	'CSP_BGA' union all
select 'ADATE334KBCZ'        ,	'CSP_BGA' union all
select 'ADATE330KBCZ'        ,	'CSP_BGA' union all
select 'LTC2974CUP#TRPBF'        ,	'QFN' union all
select 'LTC2977IUP#TRPBF'        ,	'QFN' union all
select 'LTC2977IUP#10HY-1PBF'        ,	'QFN' union all
select 'LTC2977CUP#TRPBF'        ,	'QFN' union all
select 'LTC2975IUP#WTRPBF'      ,	'QFN' union all
select 'ADW90032WCCSZ-RL'        ,	'LFCSP_SS' union all
select 'ADW90033WCCSZ-RL'        ,	'LFCSP_SS' union all
select 'ADBMS6948WFSCCSZM-RL'        ,	'LFCSP_SS' union all
select 'ADBMS6948WFSCCSZ-RL'          ,	'LFCSP_SS' union all
select 'ADBMS1816WCCSZ-R7'      ,	'LFCSP_SS' union all
select 'ADBMS6832MWCCSZ'          ,	'LFCSP_SS' union all
select 'ADW90033WCCSZ'      ,	'LFCSP_SS' union all
select 'ADBMS6832MWFSCCSZ'      ,	'LFCSP_SS' union all
select 'ADBMS6948WFSCCSZM'      ,	'LFCSP_SS' union all
select 'ADBMS1816WCCSZ'         ,	'LFCSP_SS' union all
select 'ADBMS6948WFSCCSZ'        ,	'LFCSP_SS' union all
select 'ADW90032WCCSZ'      ,	'LFCSP_SS' union all
select 'AD74416HBCPZ-RL7'        ,	'LFCSP' union all
select 'ADP1031ACPZ-1-R7'        ,	'LFCSP' union all
select 'ADP1031ACPZ-3-R7'        ,	'LFCSP' union all
select 'ADP1031ACPZ-4-R7'        ,	'LFCSP' union all
select 'ADP1032ACPZ-5-R7'        ,	'LFCSP' union all
select 'ADP1034ACPZ-1-R7'        ,	'LFCSP' union all
select 'ADP1032ACPZ-2-R7'        ,	'LFCSP' union all
select 'LTC7883AY#PBF'      ,	'BGA' union all
select 'ADMV4570XBCZ'        ,	'CSP_BGA' union all
select 'ADV4101JBFZRL7'         ,	'WLBGA' union all
select 'ADAR6901WFSCBFZ'          ,	'WLBGA' union all
select 'ADAR6902WFSCBFZ'          ,	'WLBGA' union all
select 'AD8196ACPZ-RL'      ,	'LFCSP' union all
select 'ADUC836BCPZ-REEL'        ,	'LFCSP' union all
select 'ADRF6755ACPZ-R7'          ,	'LFCSP' union all
select 'AD9434BCPZRL7-370'      ,	'LFCSP' union all
select 'AD5360BCPZ-REEL7'        ,	'LFCSP' union all
select 'AD9434BCPZRL7-500'      ,	'LFCSP' union all
select 'AD8192ACPZ-RL7'         ,	'LFCSP' union all
select 'AD5362BCPZ-REEL7'        ,	'LFCSP' union all
select 'AD9626BCPZRL7-210'      ,	'LFCSP' union all
select 'AD9626BCPZRL7-250'      ,	'LFCSP' union all
select 'AD9230BCPZ-170'         ,	'LFCSP' union all
select 'AD9230BCPZ-250'         ,	'LFCSP' union all
select 'AD4134BCPZ-RL7'         ,	'LFCSP' union all
select 'ADUC848BCPZ8-3-RL7'         ,	'LFCSP' union all
select 'ADRF6821ACPZ-RL7'        ,	'LFCSP' union all
select 'AD9656BCPZRL7-125'      ,	'LFCSP' union all
select 'ADUC845BCPZ62-5'          ,	'LFCSP' union all
select 'ADUC848BCPZ8-5'         ,	'LFCSP' union all
select 'ADUC848BCPZ8-3'         ,	'LFCSP' union all
select 'ADUC847BCPZ8-5'         ,	'LFCSP' union all
select 'ADAQ4380-4BBCZ'         ,	'CSP_BGA' union all
select 'ADAQ4381-4BBCZ'         ,	'CSP_BGA' union all
select 'ADAQ4370-4BBCZ'         ,	'CSP_BGA' union all
select 'ADMV8809ACCZ-PT'          ,	'LGA' union all
select 'ADMV8809SCCZ-CSLPT'         ,	'LGA' union all
select 'ADMV8809SCCZ-EPPT'      ,	'LGA' union all
select 'ADMV8809ACCZ-R7',	'LGA' union all
select 'ADMV8912XCCZ',	'LGA' union all
select 'ADMV8809XCCZ',	'LGA' union all
select 'ADM1272-1ACPZ-RL',	'LFCSP' union all
select 'ADM1273-1ACPZ-RL',	'LFCSP' union all
select 'ADAQ3130BBCZ-U2',	'CSP_BGA' union all
select 'ADAQ3130BBCZ-U1',	'CSP_BGA' union all
select 'ADAQ3130BBCZ-U4',	'CSP_BGA' union all
select 'LT8752XV#PBF',	'LGA' union all
select 'LT8752AV#PBF',	'LGA' union all
select 'LTC7051AV#PBF',	'LQFN' union all
select 'LTC7051AV-1#PBF',	'LQFN' union all
select 'LTC7050AV-1#PBF',	'LQFN' union all
select 'LTC7050AV#PBF',	'LQFN' union all
select 'ADP1074ACCZ-R7',	'LGA' union all
select 'ADG5400FKBCZ-RL',	'CSP_BGA' union all
select 'ADG5400FKBCZ',	'CSP_BGA' union all
select 'LTC3886EUKG-1#QN58-1PBF',	'QFN' union all
select 'LTC4270BIUKG#TRPBF',	'QFN' union all
select 'LTC4270BIUKG#PBF',	'QFN' union all
select 'AD22424BZ-RL',	'CBGA' union all
select 'ADXRS623BBGZ-RL',	'CBGA' union all
select 'ADXRS620BBGZ-RL',	'CBGA' union all
select 'ADXRS646BBGZ-RL',	'CBGA' union all
select 'ADXRS642BBGZ-RL',	'CBGA' union all
select 'ADXRS624BBGZ-RL',	'CBGA' union all
select 'ADXRS623BBGZ',	'CBGA' union all
select 'ADXRS642BBGZ',	'CBGA' union all
select 'ADXRS646BBGZ',	'CBGA' union all
select 'ADXRS620BBGZ',	'CBGA' union all
select 'ADXRS646TBGZ-EP',	'CBGA' union all
select 'AD4858IBBCZ-RL',	'CSP_BGA' union all
select 'AD4858BBCZ-RL-13',	'CSP_BGA' union all
select 'AD4851BBCZ-U1',	'CSP_BGA' union all
select 'SBBMS6815WCSWZ-RL',	'LQFP_EP' union all
select 'ADBMS6816WCSWZ-RL',	'LQFP_EP' union all
select 'SBBMS6817WCSWZ-RL',	'LQFP_EP' union all
select 'ADBMS6817WCSWZ-RL',	'LQFP_EP' union all
select 'SBBMS6817WFSCSWZ-RL',	'LQFP_EP' union all
select 'SBBMS6815WFSCSWZ-RL',	'LQFP_EP' union all
select 'ADBMS6815CSWZ-RL',	'LQFP_EP' union all
select 'LTC2949HLXE#3OXTRPBF',	'LQFP_EP' union all
select 'ADRF8890WASWZ-RL7',	'LQFP_EP' union all
select 'ADBMS6815CSWZ',	'LQFP_EP' union all
select 'SBBMS6815WFSCSWZ',	'LQFP_EP' union all
select 'SBBMS6815WCSWZ',	'LQFP_EP' union all
select 'LTC3871ILXE-1#3ZZPBF',	'LQFP_EP' union all
select 'SBBMS6817WCSWZ',	'LQFP_EP' union all
select 'LTC3871ILXE-1#3OZPBF',	'LQFP_EP' union all
select 'ADBMS6816WCSWZ',	'LQFP_EP' union all
select 'ADRF8890WASWZ',	'LQFP_EP' union all
select 'ADBMS6817WCSWZ',	'LQFP_EP' union all
select 'ADM1069ASTZ-REEL7',	'LQFP' union all
select 'ADM1168ASTZ-RL7',	'LQFP' union all
select 'ADM1068ASTZ-REEL7',	'LQFP' union all
select 'AD7280AWBSTZ-RL',	'LQFP' union all
select 'AD9218BSTZ-RL105',	'LQFP' union all
select 'ADF7030-1BSTZN-RL',	'LQFP' union all
select 'ADUC7060BSTZ32-RL',	'LQFP' union all
select 'AD9831ASTZ-REEL',	'LQFP' union all
select 'AD9849AKSTZRL',	'LQFP' union all
select 'ADUC7033BSTZ-88-RL',	'LQFP' union all
select 'AD9218SSTZ-105EPRL',	'LQFP' union all
select 'AD9940BSTZRL',	'LQFP' union all
select 'AD7631BSTZRL',	'LQFP' union all
select 'AD7612BSTZ-RL',	'LQFP' union all
select 'AD7610BSTZ-RL',	'LQFP' union all
select 'AD9288BSTZRL-40',	'LQFP' union all
select 'AD7264BSTZ-RL7',	'LQFP' union all
select 'AD9218BSTZ-105',	'LQFP' union all
select 'ADUC7060BSTZ32',	'LQFP' union all
select 'AD9244BSTZ-40',	'LQFP' union all
select 'AD7280AWBSTZ',	'LQFP' union all
select 'ADF7030-1BSTZN',	'LQFP' union all
select 'ADUC7033BSTZ-88',	'LQFP' union all
select 'AD9244BSTZ-65',	'LQFP' union all
select 'AD9238BSTZRL-40',	'LQFP' union all
select 'AD9238BSTZRL-20',	'LQFP' union all
select 'AD9238BSTZRL-65',	'LQFP' union all
select 'AD9248BSTZ-40',	'LQFP' union all
select 'AD9248BSTZ-20',	'LQFP' union all
select 'AD9238BSTZ-40',	'LQFP' union all
select 'AD9238BSTZ-20',	'LQFP' union all
select 'AD9248BSTZ-65',	'LQFP' union all
select 'AD9238BSTZ-65',	'LQFP' union all
select 'ADF4368BCCZ-RL7',	'LGA' union all
select 'ADF4382ABCCZ-RL7',	'LGA' union all
select 'ADF4377BCCZ-RL7',	'LGA' union all
select 'ADF4382BCCZ-RL7',	'LGA' union all
select 'ADF4912BCCZ-RL7',	'LGA' union all
select 'AD7266BSUZ-REEL',	'TQFP' union all
select 'AD7266BSUZ-REEL7',	'TQFP' union all
select 'AD7265BSUZ-REEL7',	'TQFP' union all
select 'AD5764RCSUZ-REEL7',	'TQFP' union all
select 'AD5764CSUZ-REEL7',	'TQFP' union all
select 'AD7938BSUZ-REEL7',	'TQFP' union all
select 'AD7938BSUZ-6REEL7',	'TQFP' union all
select 'AD7939BSUZ-REEL7',	'TQFP' union all
select 'AD5764BSUZ-REEL7',	'TQFP' union all
select 'AD5762RCSUZ-REEL7',	'TQFP' union all
select 'ADM1062ASUZ-REEL7',	'TQFP' union all
select 'ADM1065ASUZ-RL7',	'TQFP' union all
select 'ADM1063ASUZ-REEL7',	'TQFP' union all
select 'ADM1066ASUZ-REEL7',	'TQFP' union all
select 'AD7294BSUZRL',	'TQFP' union all
select 'ADG732BSUZ-REEL',	'TQFP' union all
select 'ADG726BSUZ-REEL',	'TQFP' union all
select 'AD74115HBCPZ-RL7',	'LFCSP' union all
select 'ADF7021BCPZ-RL',	'LFCSP' union all
select 'ADUC7034BCPZ-RL',	'LFCSP' union all
select 'ADUC7036BCPZ-RL',	'LFCSP' union all
select 'ADUC7036DCPZ-RL',	'LFCSP' union all
select 'ADF7021BCPZ-RL7',	'LFCSP' union all
select 'AD7262BCPZ-RL7',	'LFCSP' union all
select 'ADF5610BCCZ-RL',	'LGA' union all
select 'ADF5610BCCZ-RL7',	'LGA' union all
select 'ADBMS2950WCCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS2951WFSCCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS2952WFSCCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS2951WCCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS2952WCCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS2960WCCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS2950BCCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS2970WFSCCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS2951WFSCCSZ',	'LFCSP_SS' union all
select 'ADBMS2952WFSCCSZ',	'LFCSP_SS' union all
select 'ADBMS2950WCCSZ',	'LFCSP_SS' union all
select 'ADBMS1804AWCCSZ-U2',	'LFCSP_SS' union all
select 'ADBMS2951WCCSZ',	'LFCSP_SS' union all
select 'ADBMS2960WCCSZ',	'LFCSP_SS' union all
select 'ADBMS2970WFSCCSZ',	'LFCSP_SS' union all
select 'ADBMS2961WCCSZ',	'LFCSP_SS' union all
select 'ADBMS2962WCCSZ',	'LFCSP_SS' union all
select 'ADBMS2950BCCSZ',	'LFCSP_SS' union all
select 'ADG732BCPZ-REEL',	'LFCSP' union all
select 'ADF7021-NBCPZ-RL',	'LFCSP' union all
select 'ADG726BCPZ-REEL',	'LFCSP' union all
select 'ADUC7060BCPZ32-RL',	'LFCSP' union all
select 'ADN4680EBCPZ-RL',	'LFCSP' union all
select 'AD45295ACPZN-R7',	'LFCSP' union all
select 'ADUCM363BCPZ256RL7',	'LFCSP' union all
select 'ADUCM362BCPZ256RL7',	'LFCSP' union all
select 'AD9233BCPZRL7-125',	'LFCSP' union all
select 'ADIN2111CCPZ-R7',	'LFCSP' union all
select 'ADRF6795ACPZN-R7',	'LFCSP' union all
select 'ADG731BCPZ-REEL7',	'LFCSP' union all
select 'AD9253BCPZRL7-105',	'LFCSP' union all
select 'AD9219ABCPZRL7-40',	'LFCSP' union all
select 'AD9259ABCPZRL7-50',	'LFCSP' union all
select 'ADRF6690ACPZN-R7',	'LFCSP' union all
select 'ADA4870ACPZ-R7',	'LFCSP' union all
select 'AD9633BCPZRL7-105',	'LFCSP' union all
select 'AD9265BCPZRL7-105',	'LFCSP' union all
select 'ADRF6790ACPZ-R7',	'LFCSP' union all
select 'AD9253BCPZRL7-80',	'LFCSP' union all
select 'AD9250BCPZRL7-250',	'LFCSP' union all
select 'ADF7021-NBCPZ-RL7',	'LFCSP' union all
select 'AD9246BCPZRL7-80',	'LFCSP' union all
select 'AD9228ABCPZRL7-40',	'LFCSP' union all
select 'AD9255BCPZRL7-125',	'LFCSP' union all
select 'ADIN2111BCPZ-R7',	'LFCSP' union all
select 'AD9265BCPZRL7-125',	'LFCSP' union all
select 'AD9653BCPZRL7-125',	'LFCSP' union all
select 'ADUCM362BCPZ128RL7',	'LFCSP' union all
select 'AD9254BCPZRL7-150',	'LFCSP' union all
select 'ADF9010BCPZ-RL7',	'LFCSP' union all
select 'AD9265BCPZRL7-80',	'LFCSP' union all
select 'AD5941WBCPZ-RL7',	'LFCSP' union all
select 'AD9246BCPZRL7-125',	'LFCSP' union all
select 'LTC4296AUK-1#PBF',	'LFCSP' union all
select 'ADAR1000ACCZN-R7',	'LGA' union all
select 'ADAR1000ACCZN',	'LGA' union all
select 'ADMV4540ACCZ-RL7',	'LGA' union all
select 'ADF4372BCCZ-RL7',	'LGA' union all
select 'ADF4371BCCZ-RL7',	'LGA' union all
select 'ADPA1122AEHZ',	'LCC_HS' union all
select 'ADPA1122AEHZ-R7',	'LCC_HS' union all
select 'ADAQ4001BBCZ',	'CSP_BGA' union all
select 'ADXRS649BBGZ',	'CBGA' union all
select 'LTC3372IUK#3ZZPBF',	'QFN' union all
select 'LTC3375EUK#TRPBF',	'QFN' union all
select 'LTC2949ILXE#3ZZTRPBF',	'LQFP_EP' union all
select 'ADBMS6817WFSCSWZ-RL',	'LQFP_EP' union all
select 'ADBMS6815WCSWZA-RL',	'LQFP_EP' union all
select 'ADBMS6815WCSWZ-RL',	'LQFP_EP' union all
select 'LTC2949HLXE#3ZZTRPBF',	'LQFP_EP' union all
select 'ADBMS6815WFSCSWZ-RL',	'LQFP_EP' union all
select 'LT3797ILXE#PBF',	'LQFP_EP' union all
select 'LTC7810ELXE#PBF',	'LQFP_EP' union all
select 'ADBMS6815WCSWZ',	'LQFP_EP' union all
select 'ADBMS6815WFSCSWZ',	'LQFP_EP' union all
select 'LTC3871HLXE#3ZZPBF',	'LQFP_EP' union all
select 'LTC3777ILXE#PBF',	'LQFP_EP' union all
select 'LTC2949HLXE#3ZZPBF',	'LQFP_EP' union all
select 'LTC7810HLXE#PBF',	'LQFP_EP' union all
select 'ADBMS6817WFSCSWZ',	'LQFP_EP' union all
select 'LTC7872ILXE#WPBF',	'LQFP_EP' union all
select 'LTC7810ILXE#PBF',	'LQFP_EP' union all
select 'LTC3871HLXE-1#PBF',	'LQFP_EP' union all
select 'ADBMS6815WCSWZA',	'LQFP_EP' union all
select 'LT3797ELXE#PBF',	'LQFP_EP' union all
select 'LTC2949ILXE#3ZZPBF',	'LQFP_EP' union all
select 'LTC3676ILXE#WPBF',	'LQFP_EP' union all
select 'LTC3676ILXE-1#PBF',	'LQFP_EP' union all
select 'LTC3871ELXE#PBF',	'LQFP_EP' union all
select 'LTC3676HLXE-1#PBF',	'LQFP_EP' union all
select 'LT8602ILXE#3ZZPBF',	'LQFP_EP' union all
select 'LTC3300ILXE-2#WPBF',	'LQFP_EP' union all
select 'LTC3871HLXE#PBF',	'LQFP_EP' union all
select 'LTC3871ILXE-1#WPBF',	'LQFP_EP' union all
select 'LTC3871ILXE#PBF',	'LQFP_EP' union all
select 'LTC7872ELXE#PBF',	'LQFP_EP' union all
select 'LTC3676ELXE-1#PBF',	'LQFP_EP' union all
select 'LTC2983CLX#PBF',	'LQFP' union all
select 'LTC2984ILX#PBF',	'LQFP' union all
select 'LTC2986HLX#PBF',	'LQFP' union all
select 'LTC2983ILX#PBF',	'LQFP' union all
select 'LTC2986CLX#PBF',	'LQFP' union all
select 'LTC2983HLX#PBF',	'LQFP' union all
select 'LTC2986CLX-1#PBF',	'LQFP' union all
select 'LTC2984CLX#PBF',	'LQFP' union all
select 'LTC2986ILX#PBF',	'LQFP' union all
select 'ADT7604BSTZ-U1',	'LQFP' union all
select 'LTC2984HLX#PBF',	'LQFP' union all
select 'LTC2986ILX-1#PBF',	'LQFP' union all
select 'ADF5612CCCZ-RL7',	'LGA' union all
select 'ADF5611BCCZ-RL7',	'LGA' union all
select 'ADBMS6815MWCCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS2950WFSCCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS1804BWCCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS2970WCCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS1804BWFSCCSZ-RL',	'LFCSP_SS' union all
select 'ADW91004BCCSZ-RL-U1',	'LFCSP_SS' union all
select 'ADBMS2960WFSCCSZ-RL',	'LFCSP_SS' union all
select 'LTC4286AUKM#TRPBF',	'LFCSP_SS' union all
select 'LTC7822AUKM-1#WTRPBF',	'LFCSP_SS' union all
select 'LTC7822RUKM-1#WTRPBF-ES',	'LFCSP_SS' union all
select 'LTC7822AUKM-2#WTRPBF',	'LFCSP_SS' union all
select 'LTC7822AUKM-2#WTRPBF-ES',	'LFCSP_SS' union all
select 'ADWFS91004BCCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS1804BWCCSZ-R7',	'LFCSP_SS' union all
select 'ADBMS1804BWFSCCSZ-R7',	'LFCSP_SS' union all
select 'ADWFS91004BCCSZ-R7',	'LFCSP_SS' union all
select 'ADBMS1804BWCCSZ',	'LFCSP_SS' union all
select 'ADBMS2950WFSCCSZ',	'LFCSP_SS' union all
select 'ADBMS6815MWCCSZ',	'LFCSP_SS' union all
select 'ADBMS1804WCCSZ',	'LFCSP_SS' union all
select 'ADBMS2970WCCSZ',	'LFCSP_SS' union all
select 'ADBMS1804AWFSCCSZ',	'LFCSP_SS' union all
select 'LTC7822RUKM-1#WPBF',	'LFCSP_SS' union all
select 'LTC7822RUKM-1#WPBF-ES',	'LFCSP_SS' union all
select 'ADW90070WFSCCSZ',	'LFCSP_SS' union all
select 'ADBMS1804BWFSCCSZ',	'LFCSP_SS' union all
select 'LTC7822RUKM-2#WPBF',	'LFCSP_SS' union all
select 'LTC7822AUKM-2#WPBF',	'LFCSP_SS' union all
select 'LTC7822AUKM-3#WPBF-ES',	'LFCSP_SS' union all
select 'ADWFS91004BCCSZ',	'LFCSP_SS' union all
select 'LTC4287AUK#TRPBF',	'LFCSP' union all
select 'LTC4286AUK#TRPBF',	'LFCSP' union all
select 'LTC7878AUK#TRPBF',	'LFCSP' union all
select 'ADAS1280-3BCPZ-65',	'LFCSP' union all
select 'LTC3376EY#PBF',	'BGA' union all
select 'LTC3376IY#PBF',	'BGA' union all
select 'ADAQ8092BBCZ',	'CSP_BGA' union all
select 'LTC4381ADKE-3#TRPBF',	'LFCSP' union all
select 'LT7182SRV#TRPBF',	'LQFN' union all
select 'LT7182SRV#PBF',	'LQFN' union all
select 'LT8648SJV#WPBF',	'LQFN' union all
select 'LT8648SJV#PBF',	'LQFN' union all
select 'LT8648SEV#PBF',	'LQFN' union all
select 'LT8648SEV#WPBF',	'LQFN' union all
select 'LT8648SHV#PBF',	'LQFN' union all
select 'LT7153SPAV#TRPBF',	'LGA' union all
select 'LT8648SPJV#WTRPBF',	'LGA' union all
select 'LT8648SJV#WTRPBF',	'LGA' union all
select 'LT8648SEV#WTRPBF',	'LGA' union all
select 'LT8648SPJV#WPBF',	'LGA' union all
select 'ADMV8909XCCZ',	'LGA' union all
select 'ADAR3007ABCZ-CSL',	'CSP_BGA' union all
select 'ADAR3006ABCZ-RL',	'CSP_BGA' union all
select 'ADAR3001ABCZ-RL',	'CSP_BGA' union all
select 'ADAR3007ABCZ-RL',	'CSP_BGA' union all
select 'ADAR3006ABCZ',	'CSP_BGA' union all
select 'ADAR3007ABCZ',	'CSP_BGA' union all
select 'ADAR3000ABCZ-CSH',	'CSP_BGA' union all
select 'ADAR3000ABCZ',	'CSP_BGA' union all
select 'ADAR3001ABCZ-CSH',	'CSP_BGA' union all
select 'ADAR3001ABCZ',	'CSP_BGA' union all
select 'ADAR3001ABCZ-CSL',	'CSP_BGA' union all
select 'LTC9102AUKJ#TRPBF',	'QFN' union all
select 'LTC9103AUKJ#TRPBF',	'QFN' union all
select 'LT8650SHY-1#3ZZPBF',	'BGA' union all
select 'LTC7130EY#PBF',	'BGA' union all
select 'LTC7130IY#3ZZPBF',	'BGA' union all
select 'LTC2975CY#PBF',	'BGA' union all
select 'LTC2975IY#PBF',	'BGA' union all
select 'ADL8111ACCZN',	'LGA' union all
select 'ADL8111ACCZN-R7',	'LGA' union all
select 'HMC7229LS6TR',	'LCC_HS' union all
select 'ADUCM330WFSBCPZ-RL',	'LFCSP' union all
select 'ADUCM331WFSBCPZ-RL',	'LFCSP' union all
select 'ADUCM332WFSBCPZ-RL',	'LFCSP' union all
select 'ADUC7039WBCPZ-RL',	'LFCSP' union all
select 'ADUCM342WFSBCPZ-RL',	'LFCSP' union all
select 'ADUCM341WFSBCPZ-RL',	'LFCSP' union all
select 'AD7179-1BCPZ-RL',	'LFCSP' union all
select 'ADAS3022BCPZ-RL7',	'LFCSP' union all
select 'AD4114BCPZ-RL7',	'LFCSP' union all
select 'AD4110-1BCPZ-RL7',	'LFCSP' union all
select 'AD4112BCPZ-RL7',	'LFCSP' union all
select 'AD5753BCPZ-RL7',	'LFCSP' union all
select 'AD4111BCPZ-RL7',	'LFCSP' union all
select 'AD4115BCPZ-RL7',	'LFCSP' union all
select 'AD4116BCPZ-RL7',	'LFCSP' union all
select 'AD5410ACPZ-REEL',	'LFCSP' union all
select 'AD5422ACPZ-REEL',	'LFCSP' union all
select 'AD5412ACPZ-REEL',	'LFCSP' union all
select 'AD5420ACPZ-REEL',	'LFCSP' union all
select 'AD5405YCPZ-REEL',	'LFCSP' union all
select 'ADUC7021BCPZ62I-RL',	'LFCSP' union all
select 'ADUC7021BCPZ62-RL',	'LFCSP' union all
select 'AD5422BCPZ-REEL',	'LFCSP' union all
select 'AD5410ACPZ-REEL7',	'LFCSP' union all
select 'ADM1063ACPZ-REEL7',	'LFCSP' union all
select 'AD5412ACPZ-REEL7',	'LFCSP' union all
select 'AD5420ACPZ-REEL7',	'LFCSP' union all
select 'AD5422ACPZ-REEL7',	'LFCSP' union all
select 'AD8195ACPZ-R7',	'LFCSP' union all
select 'ADUC7021BCPZ32-RL7',	'LFCSP' union all
select 'AD8264ACPZ-R7',	'LFCSP' union all
select 'ADUC7021BCPZ62-RL7',	'LFCSP' union all
select 'AD5422BCPZ-REEL7',	'LFCSP' union all
select 'AD5405YCPZ-REEL7',	'LFCSP' union all
select 'AD8123ACPZ-R7',	'LFCSP' union all
select 'AD9557BCPZ-REEL7',	'LFCSP' union all
select 'HMC830LP6GETR',	'LFCSP' union all
select 'ADUC7021BCPZ32',	'LFCSP' union all
select 'ADN4622BCPZ-RL',	'LFCSP' union all
select 'ADN8835ACPZ-R7',	'LFCSP' union all
select 'ADAR4000ACPZ-R7',	'LFCSP' union all
select 'ADAR4001ACPZ-R7',	'LFCSP' union all
select 'ADMV4640BCPZN',	'LFCSP' union all
select 'HMC8415LP6GE',	'LFCSP' union all
select 'ADMV4630BCPZN',	'LFCSP' union all
select 'ADUC7023BCP6Z62IRL',	'LFCSP' union all
select 'ADE7858ACPZ-RL',	'LFCSP' union all
select 'SSM3582ACPZ-RL',	'LFCSP' union all
select 'ADF7030-1BCPZN-RL',	'LFCSP' union all
select 'ADM1069ACPZ-REEL',	'LFCSP' union all
select 'AD7175-8BCPZ-RL',	'LFCSP' union all
select 'ADUC7020BCPZ62I-RL',	'LFCSP' union all
select 'ADF7030BCPZN-RL',	'LFCSP' union all
select 'ADUC7022BCPZ32-RL',	'LFCSP' union all
select 'SSM3582BCPZRL',	'LFCSP' union all
select 'SSM3582ACPZ-RLKL2',	'LFCSP' union all
select 'ADIN1100CCPZ-R7',	'LFCSP' union all
select 'ADUC7023BCP6Z62IR7',	'LFCSP' union all
select 'ADUC7020BCPZ62-RL7',	'LFCSP' union all
select 'ADIN1300BCPZ-R7',	'LFCSP' union all
select 'ADP5014ACPZ-R7',	'LFCSP' union all
select 'ADL5205ACPZ-R7',	'LFCSP' union all
select 'ADMV4640BCPZN-RL7',	'LFCSP' union all
select 'ADMV4630BCPZN-RL7',	'LFCSP' union all
select 'ADIN1110BCPZ-R7',	'LFCSP' union all
select 'AD7175-8BCPZ-RL7',	'LFCSP' union all
select 'SSM3582ACPZ-R7',	'LFCSP' union all
select 'AD9571ACPZLVD-R7',	'LFCSP' union all
select 'ADM1069ACPZ-REEL7',	'LFCSP' union all
select 'SSM3582BCPZR7',	'LFCSP' union all
select 'AD9571ACPZPEC-R7',	'LFCSP' union all
select 'ADIN1300CCPZ-R7',	'LFCSP' union all
select 'ADUC7022BCPZ62-RL7',	'LFCSP' union all
select 'ADUC7020BCPZ62IRL7',	'LFCSP' union all
select 'ADIN1110CCPZ-R7',	'LFCSP' union all
select 'ADIN1100BCPZ-R7',	'LFCSP' union all
select 'HMC8415LP6GETR',	'LFCSP' union all
select 'AD5766BCPZ-RL7',	'LFCSP' union all
select 'ADIN1300BCPZ',	'LFCSP' union all
select 'AD7175-8BCPZ',	'LFCSP' union all
select 'ADMV1013ACCZ-R7',	'LGA' union all
select 'ADL8113ACCZ-R7',	'LGA' union all
select 'ADMV4530BCCZ',	'LGA' union all
select 'ADMV4530BCCZ-RL7',	'LGA' union all
select 'ADPA7006AEHZ',	'LCC_HS' union all
select 'ADXL355BEZ-RL-IMU',	'LCC' union all
select 'ADXL351WBEZ-RL',	'LCC' union all
select 'ADXL357BBEZ-RL7',	'LCC' union all
select 'ADMV4680XBCZ-RL7',	'CSP_BGA' union all
select 'ADMV1128ABBCZ',	'CSP_BGA' union all
select 'ADMV1139ABBCZ',	'CSP_BGA' union all
select 'ADMV8827ACCZ-PT',	'LGA' union all
select 'AD4113BCPZ-RL7',	'LFCSP' union all
select 'LT7200SAV#PBF',	'LGA' union all
select 'LT8685SRV#WTRPBF',	'LGA' union all
select 'LT8685SRV#WPBFKL1',	'LGA' union all
select 'LT8685SRV#TRPBF',	'LGA' union all
select 'LT8685SRV#PBF',	'LGA' union all
select 'LT7200SAV#WTRPBF',	'LGA' union all
select 'LTC7150SIY#PBF',	'BGA' union all
select 'LTC7150SJY-4#WPBF',	'BGA' union all
select 'LTC7150SEY#PBF',	'BGA' union all
select 'LTC7150SJY-4#PBF',	'BGA' union all
select 'LT8645SIV#TRPBF',	'LQFN' union all
select 'LT8646SEV#TRPBF',	'LGA' union all
select 'LT8646SIV#TRPBF',	'LGA' union all
select 'LT8645SIV#WTRPBF',	'LGA' union all
select 'LT8646SIV#TRPBFKL1',	'LGA' union all
select 'LT8350SAV#PBF',	'LGA' union all
select 'LT8350SAV#WPBF',	'LGA' union all
select 'LT8645SHV-2#3ZZPBF',	'LQFN' union all
select 'LT8645SHV-2#3ZZPBFKL1',	'LQFN' union all
select 'LT8646SEV#PBF',	'LQFN_EP' union all
select 'LT8650SIV#TRPBF',	'LQFN' union all
select 'LT8650SEV#TRPBF',	'LQFN' union all
select 'LT8645SIV#WPBF',	'LQFN' union all
select 'LT8645SJV-2#WPBF',	'LQFN' union all
select 'LT8650SIV#3ZZPBF',	'LQFN' union all
select 'LT8645SEV#PBF',	'LQFN' union all
select 'LT8645SEV-2#PBF',	'LQFN' union all
select 'LT8650SEV#PBF',	'LQFN' union all
select 'LT8645SEV-2#WPBF',	'LQFN' union all
select 'LT8645SJV-2#PBF',	'LQFN' union all
select 'LT8645SIV#WPBFKL1',	'LQFN' union all
select 'LT8645SHV-2#PBF',	'LQFN' union all
select 'LT8650SIV#PBF',	'LQFN' union all
select 'LT8646SIV#PBF',	'LQFN' union all
select 'LT8350RV#PBF',	'LGA' union all
select 'LT8350RV#PBFKL1',	'LGA' union all
select 'LT8350RV#3ZZ',	'LGA' union all
select 'LT8350RV#WPBF',	'LGA' union all
select 'LT8650SJV#WTRMPBF',	'LGA' union all
select 'LT8650SPAJV#WTRPBF',	'LGA' union all
select 'LT8650SJV#WTRPBF',	'LGA' union all
select 'LT8650SPJV#WTRPBF',	'LGA' union all
select 'LT8646SAAV#TRPBF-ES',	'LGA' union all
select 'LT8650SPJV#TRPBF',	'LGA' union all
select 'LT8650SHV-CSL#TRPBF',	'LGA' union all
select 'LT8645SAAV#WTRPBF',	'LGA' union all
select 'LT8650SHV#WTRPBF',	'LGA' union all
select 'LT8646SAAV#WTRPBF',	'LGA' union all
select 'LT8646SEV#WPBF',	'LGA' union all
select 'LT8646SIV#WPBF',	'LGA' union all
select 'LT8650SPJV#PBF',	'LGA' union all
select 'LT8650SHV#WPBFKL1',	'LGA' union all
select 'LT8650SHV#WPBF',	'LGA' union all
select 'LT8646SAAV#WPBF',	'LGA' union all
select 'LT8645SAAV#WPBF',	'LGA' union all
select 'LT8650SHV-CSL#PBF',	'LGA' union all
select 'LT8645SAAV#PBF',	'LGA' union all
select 'LT8650SPAJV#WPBF',	'LGA' union all
select 'LT8650SJV#WPBF',	'LGA' union all
select 'ADMV1455XBCZ-R7',	'CSP_BGA' union all
select 'ADMV1355XBCZ-R7',	'CSP_BGA' union all
select 'ADMV1455BBCZ-R7',	'CSP_BGA' union all
select 'ADMV1355BBCZ-R7',	'CSP_BGA' union all
select 'ADMV1420XBCZ',	'CSP_BGA' union all
select 'ADMV1455BBCZ',	'CSP_BGA' union all
select 'ADE1201ACCZ-RL',	'LGA' union all
select 'LT8708EUHG#TRPBF',	'QFN' union all
select 'LTC3899IUHF#TRPBF',	'QFN' union all
select 'LTC4020EUHF#TRPBF',	'QFN' union all
select 'LTC4015EUHF#TRPBF',	'QFN' union all
select 'ADXRS197BEZ-RL7',	'LCC' union all
select 'ADXL1002BCPZ-RL7',	'LFCSP' union all
select 'AD22122Z-RL7',	'LFCSP' union all
select 'ADXL1004BCPZ-RL7',	'LFCSP' union all
select 'ADXL1001BCPZ-RL7',	'LFCSP' union all
select 'ADXL1004BCPZ',	'LFCSP' union all
select 'ADXL1001BCPZ',	'LFCSP' union all
select 'ADXL317WBCSZ-RL',	'LFCSP_SS' union all
select 'ADPA9002ACGZN',	'LFCSP_CAV' union all
select 'ADL9006ACGZN',	'LFCSP_CAV' union all
select 'ADPA9002ACGZN-R7',	'LFCSP_CAV' union all
select 'HMC1099PM5ETR',	'LFCSP_CAV' union all
select 'HMC637BPM5ETR',	'LFCSP_CAV' union all
select 'ADL9006ACGZN-R7',	'LFCSP_CAV' union all
select 'ADPA9007ACGZN',	'LFCSP_CAV' union all
select 'HMC797APM5ETR-R5',	'LFCSP_CAV' union all
select 'HMC8500PM5ETR',	'LFCSP_CAV' union all
select 'ADPA9007ACGZN-R7',	'LFCSP_CAV' union all
select 'HMC943APM5ETR',	'LFCSP_CAV' union all
select 'HMC994APM5ETR',	'LFCSP_CAV' union all
select 'HMC797APM5ETR',	'LFCSP_CAV' union all
select 'HMC998APM5ETR',	'LFCSP_CAV' union all
select 'ADMV8855XCCZ',	'LGA' union all
select 'ADTR1107ACCZ',	'LGA' union all
select 'AD5758BCPZ-RL7',	'LFCSP' union all
select 'AD3552RBCPZ16-RL7',	'LFCSP' union all
select 'AD3551RBCPZ16-RL7',	'LFCSP' union all
select 'ADP2389ACPZ-R7',	'LFCSP' union all
select 'ADF5703BCPZ-R7',	'LFCSP' union all
select 'AD7194BCPZ-REEL',	'LFCSP' union all
select 'AD5750-2BCPZ-RL7',	'LFCSP' union all
select 'ADF4351BCPZ-RL7',	'LFCSP' union all
select 'ADN8831ACPZ-REEL7',	'LFCSP' union all
select 'AD9245BCPZRL7-80',	'LFCSP' union all
select 'ADF4907BCPZ-RL7',	'LFCSP' union all
select 'AD5750ACPZ-REEL7',	'LFCSP' union all
select 'AD7625BCPZRL7',	'LFCSP' union all
select 'ADG1206YCPZ-REEL7',	'LFCSP' union all
select 'AD9665ACPZ-REEL7',	'LFCSP' union all
select 'AD8120ACPZ-R7',	'LFCSP' union all
select 'AD5750BCPZ-REEL7',	'LFCSP' union all
select 'AD8145YCPZ-R7',	'LFCSP' union all
select 'HMC1162LP5ETR',	'LFCSP' union all
select 'ADRF5160BCPZ',	'LFCSP' union all
select 'HMC508LP5ETR',	'LFCSP' union all
select 'HMC1167LP5ETR',	'LFCSP' union all
select 'HMC7911LP5ETR',	'LFCSP' union all
select 'HMC632LP5ETR',	'LFCSP' union all
select 'HMC1113LP5ETR',	'LFCSP' union all
select 'ADBMS6822WCCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS6821WCCSZ-RL',	'LFCSP_SS' union all
select 'ADW90002WCCSZ-RL',	'LFCSP_SS' union all
select 'ADW94002Z-RL',	'LFCSP_SS' union all
select 'ADBMS6821CCSZ-RL',	'LFCSP_SS' union all
select 'ADW90001WCCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS6821WCCSZ-RLKL3',	'LFCSP_SS' union all
select 'ADBMS6822CCSZ-RL',	'LFCSP_SS' union all
select 'LT3391JUHM#WFSTRPBF',	'LFCSP_SS' union all
select 'ADBMS6822WCCSZ',	'LFCSP_SS' union all
select 'ADBMS6821WCCSZ',	'LFCSP_SS' union all
select 'ADBMS6821CCSZ',	'LFCSP_SS' union all
select 'ADBMS6822CCSZ',	'LFCSP_SS' union all
select 'ADW90002WCCSZ',	'LFCSP_SS' union all
select 'ADN2850BCPZ25-RL7',	'LFCSP' union all
select 'ADA4254ACPZ-RL',	'LFCSP' union all
select 'ADA4254ACPZ-R7',	'LFCSP' union all
select 'AD7142ACPZ-1REEL',	'LFCSP' union all
select 'ADEMA124ACPZ-RL',	'LFCSP' union all
select 'AD7142ACPZ-REEL',	'LFCSP' union all
select 'AD7194BCPZ-REEL7',	'LFCSP' union all
select 'AD7142ACPZ-1500RL7',	'LFCSP' union all
select 'AD7142ACPZ-500RL7',	'LFCSP' union all
select 'ADN2816ACPZ-500RL7',	'LFCSP' union all
select 'ADN2805ACPZ-500RL7',	'LFCSP' union all
select 'ADN2814ACPZ-500RL7',	'LFCSP' union all
select 'ADM1281-1ACPZ-RL',	'LFCSP' union all
select 'ADM1281-2ACPZ-RL',	'LFCSP' union all
select 'ADV7992WBCPZ-RL',	'LFCSP' union all
select 'AD45245ACPZN-R7',	'LFCSP' union all
select 'AD5750-1ACPZ-REEL7',	'LFCSP' union all
select 'AD5751ACPZ-REEL7',	'LFCSP' union all
select 'AD7266BCPZ-REEL7',	'LFCSP' union all
select 'ADL5304ACPZ-R7',	'LFCSP' union all
select 'AD7490BCPZ-REEL7',	'LFCSP' union all
select 'AD9266BCPZRL7-40',	'LFCSP' union all
select 'AD9629BCPZRL7-65',	'LFCSP' union all
select 'AD5750-1BCPZ-REEL7',	'LFCSP' union all
select 'ADG1406BCPZ-REEL7',	'LFCSP' union all
select 'ADP2114ACPZ-R7',	'LFCSP' union all
select 'AD7626BCPZ-RL7',	'LFCSP' union all
select 'AD8332ACPZ-R7',	'LFCSP' union all
select 'ADA8282WBCPZ-R7',	'LFCSP' union all
select 'ADL5519ACPZ-R7',	'LFCSP' union all
select 'AD7960BCPZ-RL7',	'LFCSP' union all
select 'ADF4193WCCPZ-RL7',	'LFCSP' union all
select 'AD8194ACPZ-R7',	'LFCSP' union all
select 'ADG1606BCPZ-REEL7',	'LFCSP' union all
select 'ADUC7023BCPZ62I-R7',	'LFCSP' union all
select 'AD8153ACPZ-RL7',	'LFCSP' union all
select 'ADM3307EACPZ-REEL7',	'LFCSP' union all
select 'AD8333ACPZ-REEL7',	'LFCSP' union all
select 'AD8372ACPZ-R7',	'LFCSP' union all
select 'AD9635BCPZRL7-125',	'LFCSP' union all
select 'ADF4356BCPZ-RL7',	'LFCSP' union all
select 'ADF4150HVBCPZ-RL7',	'LFCSP' union all
select 'AD8364ACPZ-REEL7',	'LFCSP' union all
select 'AD5749ACPZ-RL7',	'LFCSP' union all
select 'AD9245BCPZRL7-20',	'LFCSP' union all
select 'ADF5904WCCPZ-RL7',	'LFCSP' union all
select 'ADP2116ACPZ-R7',	'LFCSP' union all
select 'AD5423BCPZ-RL7',	'LFCSP' union all
select 'AD9634BCPZRL7-250',	'LFCSP' union all
select 'AD9649BCPZRL7-80',	'LFCSP' union all
select 'ADG2128BCPZ-HS-RL7',	'LFCSP' union all
select 'AD7265BCPZ-REEL7',	'LFCSP' union all
select 'AD9629BCPZRL7-40',	'LFCSP' union all
select 'AD9609BCPZRL7-80',	'LFCSP' union all
select 'ADF5904ACPZ-RL7',	'LFCSP' union all
select 'ADM3310EACPZ-REEL7',	'LFCSP' union all
select 'AD8366ACPZ-R7',	'LFCSP' union all
select 'AD8143ACPZ-REEL7',	'LFCSP' union all
select 'AD8260ACPZ-R7',	'LFCSP' union all
select 'ADG2128BCPZ-REEL7',	'LFCSP' union all
select 'ADG1207YCPZ-REEL7',	'LFCSP' union all
select 'ADG1607BCPZ-REEL7',	'LFCSP' union all
select 'AD9649BCPZRL7-40',	'LFCSP' union all
select 'AD9629BCPZRL7-20',	'LFCSP' union all
select 'ADP5003ACPZ-R7',	'LFCSP' union all
select 'AD9649BCPZRL7-20',	'LFCSP' union all
select 'AD7196BCPZ-RL7',	'LFCSP' union all
select 'AD8376ACPZ-R7',	'LFCSP' union all
select 'AD5413BCPZ-RL7',	'LFCSP' union all
select 'ADF4355-2BCPZ-RL7',	'LFCSP' union all
select 'AD9235BCPZRL7-40',	'LFCSP' union all
select 'ADF5356BCPZ-RL7',	'LFCSP' union all
select 'ADM3311EACPZ-REEL7',	'LFCSP' union all
select 'ADP5350ACPZ-1-R7',	'LFCSP' union all
select 'ADM3312EACPZ-REEL7',	'LFCSP' union all
select 'AD7938BCPZ-6REEL7',	'LFCSP' union all
select 'ADIN1200BCP32Z-R7',	'LFCSP' union all
select 'ADG2188BCPZ-REEL7',	'LFCSP' union all
select 'ADIN1200CCP32Z-R7',	'LFCSP' union all
select 'AD9649BCPZRL7-65',	'LFCSP' union all
select 'ADN2812ACPZ-RL7',	'LFCSP' union all
select 'ADP1829ACPZ-R7',	'LFCSP' union all
select 'AD4130-4BCPZ-RL7',	'LFCSP' union all
select 'AD8392AACPZ-R7',	'LFCSP' union all
select 'AD9635BCPZRL7-80',	'LFCSP' union all
select 'ADRF6520ACPZ-R7',	'LFCSP' union all
select 'AD4696BCPZ-RL7',	'LFCSP' union all
select 'ADEMA124ACPZ-RL7',	'LFCSP' union all
select 'ADN2817ACPZ-RL7',	'LFCSP' union all
select 'AD4695BCPZ-RL7',	'LFCSP' union all
select 'ADG1207LYCPZ-REEL7',	'LFCSP' union all
select 'AD5421BCPZ-REEL7',	'LFCSP' union all
select 'ADIN1101BCPZ-R7',	'LFCSP' union all
select 'ADG1407BCPZ-REEL7',	'LFCSP' union all
select 'ADIN1111CCPZ-R7',	'LFCSP' union all
select 'ADG2128YCPZ-REEL7',	'LFCSP' union all
select 'AD4130-8BCPZ-RL7',	'LFCSP' union all
select 'ADF4350ABCPZ-RL7',	'LFCSP' union all
select 'AD7938BCPZ-REEL7',	'LFCSP' union all
select 'AD9266BCPZRL7-20',	'LFCSP' union all
select 'ADMV4420ACPZ-RL7',	'LFCSP' union all
select 'ADN2813ACPZ-RL7',	'LFCSP' union all
select 'AD7961BCPZ-RL7',	'LFCSP' union all
select 'AD5748ACPZ-RL7',	'LFCSP' union all
select 'AD5421ACPZ-REEL7',	'LFCSP' union all
select 'ADF5901WCCPZ-RL7',	'LFCSP' union all
select 'AD9645BCPZRL7-80',	'LFCSP' union all
select 'ADG2188YCPZ-REEL7',	'LFCSP' union all
select 'ADIN1101CCPZ-R7',	'LFCSP' union all
select 'ADRF6780ACPZN-R7',	'LFCSP' union all
select 'ADIN1111BCPZ-R7',	'LFCSP' union all
select 'AD9237BCPZRL7-40',	'LFCSP' union all
select 'ADF4355-3BCPZ-RL7',	'LFCSP' union all
select 'ADUC7061BCPZ32-RL',	'LFCSP' union all
select 'AD9215BCPZ-105',	'LFCSP' union all
select 'ADIN1200BCP32Z',	'LFCSP' union all
select 'ADA8282WBCPZ',	'LFCSP' union all
select 'ADIN1200CCP32Z',	'LFCSP' union all
select 'AD9635BCPZ-80',	'LFCSP' union all
select 'AD9235BCPZRL7-20',	'LFCSP' union all
select 'AD9609BCPZ-40',	'LFCSP' union all
select 'AD9642BCPZ-210',	'LFCSP' union all
select 'ADIN1111BCPZ',	'LFCSP' union all
select 'ADRF5538BCRZN-R7',	'LFCSP_RT' union all
select 'ADL6337ACRZB-R7',	'LFCSP_RT' union all
select 'ADL6337ACRZA-R7',	'LFCSP_RT' union all
select 'ADL6337ACRZC-R7',	'LFCSP_RT' union all
select 'ADUM7223ACCZ-RL7',	'LGA' union all
select 'ADUM7223CCCZ-RL7',	'LGA' union all
select 'ADTR1101ACCZ',	'LGA' union all
select 'AD4080BBCZ-RL',	'CSP_BGA' union all
select 'ADUC7029BBCZ62-RL',	'CSP_BGA' union all
select 'AD4087BBCZ-RL',	'CSP_BGA' union all
select 'ADUC7029BBCZ62I-RL',	'CSP_BGA' union all
select 'AD4086BBCZ-RL',	'CSP_BGA' union all
select 'AD4081BBCZ-RL7',	'CSP_BGA' union all
select 'AD4080BBCZ-RL7',	'CSP_BGA' union all
select 'AD4083BBCZ-RL7',	'CSP_BGA' union all
select 'AD4087BBCZ-RL7',	'CSP_BGA' union all
select 'AD4085BBCZ-RL7',	'CSP_BGA' union all
select 'AD4086BBCZ-RL7',	'CSP_BGA' union all
select 'ADUCM410BBCZ-RL7',	'CSP_BGA' union all
select 'ADUCM410BBCZ',	'CSP_BGA' union all
select 'ADP5056ACCZ-R7',	'LGA' union all
select 'ADP5055ACCZ-R7',	'LGA' union all
select 'LTC997CUH#10329PBF',	'QFN' union all
select 'LT8686SJV#WTRPBF',	'LGA' union all
select 'LT8686SJV#PBF',	'LGA' union all
select 'AD2327WCCSZ-RL',	'LFCSP_SS' union all
select 'AD2328WCCSZ-RL',	'LFCSP_SS' union all
select 'AD2328WCCSZ-RL7',	'LFCSP_SS' union all
select 'AD2328BCPZ-RL7',	'LFCSP_SS' union all
select 'ADEMA127ACPZ-RL',	'LFCSP' union all
select 'ADM1281-1AACPZ-RL',	'LFCSP' union all
select 'ADEMA127ACPZ-RL7',	'LFCSP' union all
select 'HMC512LP5ETR',	'LFCSP' union all
select 'LT7809RUH#PBF',	'LFCSP' union all
select 'LT7809RUH#PBF-ES',	'LFCSP' union all
select 'LT1236AILS8-5#PBF',	'LCC' union all
select 'LT1236BILS8-5#PBF',	'LCC' union all
select 'LTC6655CHLS8-5#PBF',	'LCC' union all
select 'LTC6655BHLS8-5#PBF',	'LCC' union all
select 'LT6654BHLS8-5#PBF',	'LCC' union all
select 'LTC3644IY#TRPBF',	'BGA' union all
select 'LTC3644IY-2#PBF',	'BGA' union all
select 'LTC3644IY#PBF',	'BGA' union all
select 'LTC3644EY#PBF',	'BGA' union all
select 'ADGM1144BCCZ-R2',	'LGA' union all
select 'ADGM1144BCCZ-RL7',	'LGA' union all
select 'ADGM1121BCCZ-RL7',	'LGA' union all
select 'LT7184SRV#PBF',	'LGA' union all
select 'LT8638SJV#TRPBF',	'LGA' union all
select 'LT8638SEV#TRPBF',	'LGA' union all
select 'LT8638SJV#WTRPBF',	'LGA' union all
select 'LT8638RV-2#3ZZTRPBF',	'LGA' union all
select 'LT8638RV-2#3ZZPBF',	'LGA' union all
select 'ADUCM450BBCZ-U1',	'CSP_BGA' union all
select 'ADGM1002BCCZ-R2',	'LGA' union all
select 'ADGM1003BCCZ-R2',	'LGA' union all
select 'ADGM1002BCCZ-RL7',	'LGA' union all
select 'LTC7151SEV#TRPBF',	'LQFN' union all
select 'LTC7151SIV#TRPBF',	'LQFN' union all
select 'LT8638SJV#WPBF',	'LQFN' union all
select 'LT3120JV#PBF',	'LQFN' union all
select 'LT8376RV#PBF',	'LQFN' union all
select 'LTC7151SEV#PBF',	'LQFN' union all
select 'LTC7151SIV#PBF',	'LQFN' union all
select 'LTC7151SJV-4#WTRPBF',	'LGA' union all
select 'LT8638SEV#PBF',	'LGA' union all
select 'LT8638SJV#PBF',	'LGA' union all
select 'LTC7151SJV-4#WPBF',	'LGA' union all
select 'LT8638RV-2#WPBF',	'LGA' union all
select 'LTC7151SJV-4#PBF',	'LGA' union all
select 'LT7184SRV#TRPBF',	'LGA' union all
select 'LTC3115EDHD-1#TRMPBF',	'DFN' union all
select 'LTC3115EDHD-2#TRPBF',	'DFN' union all
select 'LTC3115EDHD-1#TRPBF',	'DFN' union all
select 'LTC3115EDHD-1#PBF',	'DFN' union all
select 'LTC3115EDHD-2#PBF',	'DFN' union all
select 'LTC4246AV#PBF',	'LGA' union all
select 'ADRF5534XCPZN',	'LFCSP' union all
select 'ADRF5080BCCZN',	'LGA' union all
select 'ADRF5080BCCZN-R7',	'LGA' union all
select 'LTC3351EUFF#TRPBF',	'QFN' union all
select 'AD4170-4BCPZ-RL7',	'LFCSP' union all
select 'AD4170-4BCPZ',	'LFCSP' union all
select 'LT8645SEV-2#TRPBF',	'LQFN' union all
select 'LT8645SIV#PBF',	'LQFN' union all
select 'AD4195-4BCPZ-RL7',	'LFCSP' union all
select 'AD4190-4BCPZ',	'LFCSP' union all
select 'ADGS1414DBCCZ-RL7',	'LGA' union all
select 'AD5760BCPZ-REEL7',	'LFCSP' union all
select 'AD5780ACPZ-REEL7',	'LFCSP' union all
select 'AD5780BCPZ-REEL7',	'LFCSP' union all
select 'AD5760ACPZ-REEL7',	'LFCSP' union all
select 'LT3390JUFDM#WFSTRPBF',	'LFCSP_SS' union all
select 'LT3390JUFDM-3#WFSTRPBF',	'LFCSP_SS' union all
select 'LT3397JUFDM-2A#WFSTRPBF-ES',	'LFCSP_SS' union all
select 'LT3390JUFDM-3#WFSPBF',	'LFCSP_SS' union all
select 'AD7768-1BCPZ-RL7',	'LFCSP' union all
select 'ADGS2414DBCCZ-RL7',	'LGA' union all
select 'LTC4041EUFD#TRPBF',	'QFN' union all
select 'LTC4041IUFD#TRPBF',	'QFN' union all
select 'LT3922IUFD-1#TRPBF',	'QFN' union all
select 'LTC3787IUFD#TRA1PBF',	'QFN' union all
select 'LTC3787IUFD#TRPBF',	'QFN' union all
select 'LTC3787HUFD#WTRPBF',	'QFN' union all
select 'LTC3787HUFD#TRPBF',	'QFN' union all
select 'LTC3787IUFD#PBF',	'QFN' union all
select 'LT3935HV#3ZZTRPBF',	'LQFN' union all
select 'LT3935RV#PBF',	'LQFN' union all
select 'LT3935HV#3ZZPBF',	'LQFN' union all
select 'ADGS6414DBCCZ-RL7',	'LGA' union all
select 'ADGS6414DBCCZ',	'LGA' union all
select 'LT3398JUFDM-1#WFSTRPBF-ES',	'LFCSP_SS' union all
select 'LT3397JUFDM-2#WFSTRPBF',	'LFCSP_SS' union all
select 'LT3397JUFDM-2#WFSPBF',	'LFCSP_SS' union all
select 'ADXL716WBCSZ-RL',	'LFCSP_SS' union all
select 'ADXL316WBCSZ-RL',	'LFCSP_SS' union all
select 'ADXL151WBCSZ-RL',	'LFCSP_SS' union all
select 'SBXL151WBCSZ-RL',	'LFCSP_SS' union all
select 'ADXL251WBCSZ-RL',	'LFCSP_SS' union all
select 'ADXL316WBCSZ-RL7',	'LFCSP_SS' union all
select 'ADXL316WBCSZ',	'LFCSP_SS' union all
select 'ADXL252WBCPZ-RL',	'LFCSP' union all
select 'ADXL251WBCPZ-RL',	'LFCSP' union all
select 'ADXL321JCP-REEL',	'LFCSP' union all
select 'ADXL327BCPZ-RL',	'LFCSP' union all
select 'ADXL326BCPZ-RL',	'LFCSP' union all
select 'ADXL335BCPZ-RL',	'LFCSP' union all
select 'ADXL335BCPZ-RL7',	'LFCSP' union all
select 'ADXL326BCPZ-RL7',	'LFCSP' union all
select 'ADXL327BCPZ-RL7',	'LFCSP' union all
select 'ADXL325BCPZ-RL7',	'LFCSP' union all
select 'ADXL321JCP-REEL7',	'LFCSP' union all
select 'HMC954LC4BTR',	'LCC' union all
select 'HMC586LC4BTR',	'LCC' union all
select 'ADXL358CCCZ-RL7',	'LGA' union all
select 'ADXL358BCCZ-RL7',	'LGA' union all
select 'AD3306WBCPZ-RL',	'LFCSP' union all
select 'AD3300WBCPZ-RL',	'LFCSP' union all
select 'AD3301WBCPZ-RL',	'LFCSP' union all
select 'AD3304WBCPZ-RL',	'LFCSP' union all
select 'ADGS5412BCPZ-RL7',	'LFCSP' union all
select 'ADG1412LYCPZ-REEL7',	'LFCSP' union all
select 'ADGS1612BCPZ-RL7',	'LFCSP' union all
select 'ADG1634LYCPZ-REEL7',	'LFCSP' union all
select 'AD5674BCPZ-1-RL7',	'LFCSP' union all
select 'AD5679RBCPZ-1-RL7',	'LFCSP' union all
select 'AD3541RBCPZ16-RL7',	'LFCSP' union all
select 'AD3542RBCPZ16-RL7',	'LFCSP' union all
select 'AD3542RBCPZ12-RL7',	'LFCSP' union all
select 'AD5674RBCPZ-1-RL7',	'LFCSP' union all
select 'AD5679RBCPZ-2-RL7',	'LFCSP' union all
select 'AD5673RBCPZ-2-RL7',	'LFCSP' union all
select 'AD5673RBCPZ-1-RL7',	'LFCSP' union all
select 'AD5679RBCPZ-1',	'LFCSP' union all
select 'AD5673RBCPZ-1',	'LFCSP' union all
select 'AD5674RBCPZ-1',	'LFCSP' union all
select 'AD5679BCPZ-1',	'LFCSP' union all
select 'HMC525ALC4TR',	'LCC' union all
select 'HMC641ALC4TR',	'LCC' union all
select 'HMC557ALC4TR',	'LCC' union all
select 'HMC812ALC4TR',	'LCC' union all
select 'HMC521ALC4TR',	'LCC' union all
select 'HMC8193LC4TR',	'LCC' union all
select 'HMC798ALC4TR',	'LCC' union all
select 'ADG1411YCPZ-REEL',	'LFCSP' union all
select 'ADA4004-4ACPZ-RL',	'LFCSP' union all
select 'AD8567ACPZ-REEL',	'LFCSP' union all
select 'AD8318ACPZ-R2',	'LFCSP' union all
select 'AD8556ACPZ-R2',	'LFCSP' union all
select 'ADL5902ACPZ-R2',	'LFCSP' union all
select 'AD8426ACPZ-R7',	'LFCSP' union all
select 'ADG1411YCPZ-REEL7',	'LFCSP' union all
select 'AD8224HBCPZ-R7',	'LFCSP' union all
select 'AD8224HACPZ-R7',	'LFCSP' union all
select 'AD8336ACPZ-R7',	'LFCSP' union all
select 'ADA4858-3ACPZ-R7',	'LFCSP' union all
select 'AD8222HACPZ-R7',	'LFCSP' union all
select 'ADA4859-3ACPZ-R7',	'LFCSP' union all
select 'AD8426BCPZ-R7',	'LFCSP' union all
select 'AD8222HBCPZ-R7',	'LFCSP' union all
select 'ADP2106ACPZ-R7',	'LFCSP' union all
select 'ADA4004-4ACPZ-R7',	'LFCSP' union all
select 'AD8567ACPZ-REEL7',	'LFCSP' union all
select 'AD8295ACPZ-R7',	'LFCSP' union all
select 'ADF4106SCPZ-EP-R7',	'LFCSP' union all
select 'ADG1434YCPZ-REEL',	'LFCSP' union all
select 'ADG759BCPZ-REEL',	'LFCSP' union all
select 'AD7298-1BCPZ-RL',	'LFCSP' union all
select 'ADG1434YCPZ-REEL7',	'LFCSP' union all
select 'AD7949BCPZRL7',	'LFCSP' union all
select 'ADG904BCPZ-REEL7',	'LFCSP' union all
select 'AD7944BCPZ-RL7',	'LFCSP' union all
select 'ADF4106BCPZ-R7',	'LFCSP' union all
select 'AD7986BCPZ-RL7',	'LFCSP' union all
select 'ADA4940-2ACPZ-RL',	'LFCSP' union all
select 'ADA4927-2YCPZ-RL',	'LFCSP' union all
select 'ADF4360-9BCPZRL',	'LFCSP' union all
select 'ADA4940-2ACPZ-R2',	'LFCSP' union all
select 'ADA4930-2YCPZ-R2',	'LFCSP' union all
select 'ADA4932-2YCPZ-R2',	'LFCSP' union all
select 'ADL5330ACPZ-R2',	'LFCSP' union all
select 'ADF4360-7BCPZRL',	'LFCSP' union all
select 'ADL5390ACPZ-REEL7',	'LFCSP' union all
select 'ADF4360-9BCPZRL7',	'LFCSP' union all
select 'ADF4360-7BCPZRL7',	'LFCSP' union all
select 'ADA4932-2YCPZ-R7',	'LFCSP' union all
select 'ADA4930-2YCPZ-R7',	'LFCSP' union all
select 'ADA4938-2ACPZ-R7',	'LFCSP' union all
select 'ADA4950-2YCPZ-R7',	'LFCSP' union all
select 'ADA4940-2ACPZ-R7',	'LFCSP' union all
select 'ADA4927-2YCPZ-R7',	'LFCSP' union all
select 'ADG3246BCPZ-REEL7',	'LFCSP' union all
select 'ADL5382ACPZ-R7',	'LFCSP' union all
select 'ADF4360-3BCPZRL7',	'LFCSP' union all
select 'ADF4360-1BCPZRL7',	'LFCSP' union all
select 'HMC980LP4ETR',	'LFCSP' union all
select 'ADF4360-9BCPZ',	'LFCSP' union all
select 'AD8340ACPZ-WP',	'LFCSP' union all
select 'AD8368ACPZ-WP',	'LFCSP' union all
select 'ADL5380ACPZ-WP',	'LFCSP' union all
select 'ADL6331ACCZA-R7',	'LGA' union all
select 'AD7879WACPZ-R5',	'LFCSP' union all
select 'ADG1604BCPZ-REEL',	'LFCSP' union all
select 'ADG1636BCPZ-REEL',	'LFCSP' union all
select 'ADA4857-2YCPZ-RL',	'LFCSP' union all
select 'ADG1413YCPZ-REEL',	'LFCSP' union all
select 'AD8231WACPZ-RL',	'LFCSP' union all
select 'ADG1404YCPZ-REEL',	'LFCSP' union all
select 'ADG1612BCPZ-REEL',	'LFCSP' union all
select 'ADG1411WBCPZ-REEL',	'LFCSP' union all
select 'ADG1208YCPZ-REEL',	'LFCSP' union all
select 'ADG1436YCPZ-REEL',	'LFCSP' union all
select 'AD8390AACPZ-RL',	'LFCSP' union all
select 'ADG1412YCPZ-REEL',	'LFCSP' union all
select 'ADG1611BCPZ-REEL',	'LFCSP' union all
select 'ADA4091-4ACPZ-RL',	'LFCSP' union all
select 'ADA4622-4ACPZ-RL',	'LFCSP' union all
select 'AD8231ACPZ-RL',	'LFCSP' union all
select 'AD8318SCPZ-EP-R2',	'LFCSP' union all
select 'AD8624ACPZ-R2',	'LFCSP' union all
select 'ADL5906ACPZN-R2',	'LFCSP' union all
select 'AD8557ACPZ-REEL7',	'LFCSP' union all
select 'AD8363ACPZ-R7',	'LFCSP' union all
select 'AD8556ACPZ-REEL7',	'LFCSP' union all
select 'ADG1404YCPZ-REEL7',	'LFCSP' union all
select 'ADG658YCPZ-REEL7',	'LFCSP' union all
select 'ADG1208YCPZ-REEL7',	'LFCSP' union all
select 'ADA4557WHCPZ-R7',	'LFCSP' union all
select 'ADP1755ACPZ-R7',	'LFCSP' union all
select 'ADG1409YCPZ-REEL7',	'LFCSP' union all
select 'ADG659YCPZ-REEL7',	'LFCSP' union all
select 'ADG1636BCPZ-REEL7',	'LFCSP' union all
select 'ADG1436YCPZ-REEL7',	'LFCSP' union all
select 'ADG1612BCPZ-REEL7',	'LFCSP' union all
select 'ADL5902ACPZ-R7',	'LFCSP' union all
select 'AD8224BCPZ-R7',	'LFCSP' union all
select 'ADG633YCPZ-REEL7',	'LFCSP' union all
select 'ADA4622-4ACPZ-R7',	'LFCSP' union all
select 'ADA4817-2ACPZ-R7',	'LFCSP' union all
select 'ADG5209FBCPZ-RL7',	'LFCSP' union all
select 'ADG5412WBCPZ-REEL7',	'LFCSP' union all
select 'ADA4857-2YCPZ-R7',	'LFCSP' union all
select 'ADN4693E-1BCPZ-RL7',	'LFCSP' union all
select 'ADG1413YCPZ-REEL7',	'LFCSP' union all
select 'ADG1433YCPZ-REEL7',	'LFCSP' union all
select 'AD8318ACPZ-REEL7',	'LFCSP' union all
select 'AD5668ACPZ-3-RL7',	'LFCSP' union all
select 'ADP1741ACPZ-R7',	'LFCSP' union all
select 'ADL5906ACPZN-R7',	'LFCSP' union all
select 'AD8224ACPZ-R7',	'LFCSP' union all
select 'ADG1611BCPZ-REEL7',	'LFCSP' union all
select 'AD5668BCPZ-2-RL7',	'LFCSP' union all
select 'AD8270ACPZ-R7',	'LFCSP' union all
select 'AD8624ACPZ-R7',	'LFCSP' union all
select 'AD8222ACPZ-R7',	'LFCSP' union all
select 'ADG1408YCPZ-REEL7',	'LFCSP' union all
select 'ADP2107ACPZ-R7',	'LFCSP' union all
select 'AD8222BCPZ-R7',	'LFCSP' union all
select 'ADA4610-4ACPZ-R7',	'LFCSP' union all
select 'ADP1752ACPZ-1^0-R7',	'LFCSP' union all
select 'ADG888YCPZ-REEL7',	'LFCSP' union all
select 'AD8390AACPZ-R7',	'LFCSP' union all
select 'AD8398AACPZ-R7',	'LFCSP' union all
select 'ADP5600ACPZ-R7',	'LFCSP' union all
select 'ADG1412YCPZ-REEL7',	'LFCSP' union all
select 'ADG2404BCPZ-REEL7',	'LFCSP' union all
select 'ADG6404BCPZ-REEL7',	'LFCSP' union all
select 'ADP1740ACPZ-1^3-R7',	'LFCSP' union all
select 'ADG1209YCPZ-REEL7',	'LFCSP' union all
select 'ADG2412BCPZ-REEL7',	'LFCSP' union all
select 'ADG1233YCPZ-REEL7',	'LFCSP' union all
select 'ADP1752ACPZ-1^2-R7',	'LFCSP' union all
select 'ADG6412BCPZ-REEL7',	'LFCSP' union all
select 'ADA4310-1ACPZ-R7',	'LFCSP' union all
select 'ADG1613BCPZ-REEL7',	'LFCSP' union all
select 'ADP1754ACPZ-1^3-R7',	'LFCSP' union all
select 'ADG1604BCPZ-REEL7',	'LFCSP' union all
select 'AD8231TCPZ-EP-R7',	'LFCSP' union all
select 'ADA4855-3YCPZ-R7',	'LFCSP' union all
select 'ADP1740ACPZ-1^5-R7',	'LFCSP' union all
select 'AD8555ACPZ-REEL7',	'LFCSP' union all
select 'ADG5408TCPZ-EP-RL7',	'LFCSP' union all
select 'ADA4091-4ACPZ-R7',	'LFCSP' union all
select 'AD5668BCPZ-2500RL7',	'LFCSP' union all
select 'AD8231ACPZ-R7',	'LFCSP' union all
select 'AD8318SCPZ-EP-RL7',	'LFCSP' union all
select 'ADP2118ACPZ-R7',	'LFCSP' union all
select 'ADN4693E-1BCPZ',	'LFCSP' union all
select 'ADL5206ACPZ-R7',	'LFCSP' union all
select 'ADF4156BCPZ-RL',	'LFCSP' union all
select 'ADF4002BCPZ-RL',	'LFCSP' union all
select 'AD5676RBCPZ-RL',	'LFCSP' union all
select 'AD8436ACPZ-RL',	'LFCSP' union all
select 'ADG3304BCPZ-REEL',	'LFCSP' union all
select 'ADG788BCPZ-REEL',	'LFCSP' union all
select 'AD5675ACPZ-RL',	'LFCSP' union all
select 'AD7949SCPZ-EP-R2',	'LFCSP' union all
select 'ADG758BCPZ-REEL7',	'LFCSP' union all
select 'ADG788BCPZ-REEL7',	'LFCSP' union all
select 'AD7682BCPZRL7',	'LFCSP' union all
select 'AD7298BCPZ-RL7',	'LFCSP' union all
select 'ADG1634BCPZ-REEL7',	'LFCSP' union all
select 'ADP8863ACPZ-R7',	'LFCSP' union all
select 'AD7699BCPZRL7',	'LFCSP' union all
select 'AD5676ACPZ-REEL7',	'LFCSP' union all
select 'AD7291BCPZ-RL7',	'LFCSP' union all
select 'ADF4156BCPZ-RL7',	'LFCSP' union all
select 'ADF4110BCPZ-RL7',	'LFCSP' union all
select 'ADG784BCPZ-REEL7',	'LFCSP' union all
select 'AD5671RBCPZ-REEL7',	'LFCSP' union all
select 'ADG1234YCPZ-REEL7',	'LFCSP' union all
select 'ADG936BCPZ-RL7',	'LFCSP' union all
select 'ADF4002BCPZ-RL7',	'LFCSP' union all
select 'ADG3308BCPZ-REEL7',	'LFCSP' union all
select 'AD5676RBCPZ-REEL7',	'LFCSP' union all
select 'AD7949SCPZ-EP-RL7',	'LFCSP' union all
select 'ADF4108BCPZ-RL7',	'LFCSP' union all
select 'ADG782BCPZ-REEL7',	'LFCSP' union all
select 'AD8436JCPZ-R7',	'LFCSP' union all
select 'ADG759BCPZ-REEL7',	'LFCSP' union all
select 'ADG1439BCPZ-REEL7',	'LFCSP' union all
select 'AD7689ACPZRL7',	'LFCSP' union all
select 'ADP8861ACPZ-R7',	'LFCSP' union all
select 'AD5676RACPZ-REEL7',	'LFCSP' union all
select 'ADF4113HVBCPZ-RL7',	'LFCSP' union all
select 'AD5672RBCPZ-REEL7',	'LFCSP' union all
select 'AD8436ACPZ-R7',	'LFCSP' union all
select 'AD8324ACPZ-REEL7',	'LFCSP' union all
select 'ADF4157BCPZ-RL7',	'LFCSP' union all
select 'ADG781BCPZ-REEL7',	'LFCSP' union all
select 'AD5676BCPZ-REEL7',	'LFCSP' union all
select 'ADG3304BCPZ-REEL7',	'LFCSP' union all
select 'ADG1438BCPZ-REEL7',	'LFCSP' union all
select 'AD5675ACPZ-REEL7',	'LFCSP' union all
select 'AD5424YCPZ-REEL7',	'LFCSP' union all
select 'ADF4154BCPZ-RL7',	'LFCSP' union all
select 'SSM2604CPZ-REEL7',	'LFCSP' union all
select 'ADF4007BCPZ-RL7',	'LFCSP' union all
select 'AD8232ACPZ-R7',	'LFCSP' union all
select 'ADG1634BCPZ-R7KL3',	'LFCSP' union all
select 'ADF4157BCPZ-R7KL1',	'LFCSP' union all
select 'ADF4212LBCPZ-RL7',	'LFCSP' union all
select 'ADG5243FBCPZ-RL7',	'LFCSP' union all
select 'AD5675BCPZ-REEL7',	'LFCSP' union all
select 'AD7091R-5BCPZ-RL7',	'LFCSP' union all
select 'AD7682BCPZRL7KL2',	'LFCSP' union all
select 'ADF4111BCPZ-RL7',	'LFCSP' union all
select 'AD7291TCPZ-EP',	'LFCSP' union all
select 'AD7147PACPZ-RL',	'LFCSP' union all
select 'AD7147ACPZ-REEL',	'LFCSP' union all
select 'AD7147PACPZ-1RL',	'LFCSP' union all
select 'ADA4939-2YCPZ-RL',	'LFCSP' union all
select 'ADA4937-2YCPZ-RL',	'LFCSP' union all
select 'AD7147ACPZ-1REEL',	'LFCSP' union all
select 'ADN8834ACPZ-R2',	'LFCSP' union all
select 'AD7147ACPZ-1500RL7',	'LFCSP' union all
select 'AD7147ACPZ-500RL7',	'LFCSP' union all
select 'AD7147PACPZ-500R7',	'LFCSP' union all
select 'AD7147PACPZ-1500R7',	'LFCSP' union all
select 'ADF4252BCPZ-RL',	'LFCSP' union all
select 'ADF4159WCCPZ-RL7',	'LFCSP' union all
select 'AD8003ACPZ-REEL7',	'LFCSP' union all
select 'ADN8834WACPZ-R7',	'LFCSP' union all
select 'ADL5310ACPZ-REEL7',	'LFCSP' union all
select 'ADL5380ACPZ-R7',	'LFCSP' union all
select 'AD8146ACPZ-R7',	'LFCSP' union all
select 'ADF4159CCPZ-RL7',	'LFCSP' union all
select 'ADF4360-4BCPZRL7',	'LFCSP' union all
select 'AD7091R-8BCPZ-RL7',	'LFCSP' union all
select 'ADA4939-2YCPZ-R7',	'LFCSP' union all
select 'ADF4252BCPZ-R7',	'LFCSP' union all
select 'ADF4158CCPZ-RL7',	'LFCSP' union all
select 'AD8134ACPZ-REEL7',	'LFCSP' union all
select 'ADN8810ACPZ-REEL7',	'LFCSP' union all
select 'ADL5566ACPZ-R7',	'LFCSP' union all
select 'ADGS1208BCPZ-RL7',	'LFCSP' union all
select 'ADL5385ACPZ-R7',	'LFCSP' union all
select 'ADF4360-8BCPZRL7',	'LFCSP' union all
select 'AD8375ACPZ-R7',	'LFCSP' union all
select 'ADL5375-15ACPZ-R7',	'LFCSP' union all
select 'ADP2443ACPZN-R7',	'LFCSP' union all
select 'ADF4360-5BCPZRL7',	'LFCSP' union all
select 'AD8142ACPZ-R7',	'LFCSP' union all
select 'AD4697BCPZ-RL7',	'LFCSP' union all
select 'AD8133ACPZ-REEL7',	'LFCSP' union all
select 'ADF4150BCPZ-RL7',	'LFCSP' union all
select 'ADF41513BCPZ-RL7',	'LFCSP' union all
select 'ADF4360-2BCPZRL7',	'LFCSP' union all
select 'ADA4937-2YCPZ-R7',	'LFCSP' union all
select 'ADG714BCPZ-REEL7',	'LFCSP' union all
select 'ADL5387ACPZ-R7',	'LFCSP' union all
select 'ADL5370ACPZ-R7',	'LFCSP' union all
select 'AD8341ACPZ-REEL7',	'LFCSP' union all
select 'ADP5520ACPZ-R7',	'LFCSP' union all
select 'ADP5587ACPZ-1-R7',	'LFCSP' union all
select 'ADL5373ACPZ-R7',	'LFCSP' union all
select 'AD8368ACPZ-REEL7',	'LFCSP' union all
select 'AD8340ACPZ-REEL7',	'LFCSP' union all
select 'ADA4961ACPZN-R7',	'LFCSP' union all
select 'ADN2873ACPZ-R7',	'LFCSP' union all
select 'ADL5201ACPZ-R7',	'LFCSP' union all
select 'ADF4360-0BCPZRL7',	'LFCSP' union all
select 'ADN8837ACPZ-R7-U1',	'LFCSP' union all
select 'ADF4155BCPZ-RL7',	'LFCSP' union all
select 'ADF4360-6BCPZRL7',	'LFCSP' union all
select 'AD4693BCPZ-RL7',	'LFCSP' union all
select 'AD4694BCPZ-RL7',	'LFCSP' union all
select 'ADP5092ACPZ-1-R7',	'LFCSP' union all
select 'ADF4360-6BCPZ',	'LFCSP' union all
select 'ADF41513BCPZ',	'LFCSP' union all
select 'AD8432ACPZ-R7',	'LFCSP' union all
select 'ADP5138ACPZ-2-R7',	'LFCSP' union all
select 'AD5706RBCPZ-RL7',	'LFCSP' union all
select 'AD5668BCPZ-1-RL7',	'LFCSP' union all
select 'AD5668ACPZ-2-RL7',	'LFCSP' union all
select 'AD5668BCPZ-1500RL7',	'LFCSP' union all
select 'ADRF5346XCRZ',	'LFCSP_RT' union all
select 'AD7380-4BCPZ-RL7',	'LFCSP' union all
select 'AD7386-4BCPZ-RL7',	'LFCSP' union all
select 'AD7389-4BCPZ-RL7',	'LFCSP' union all
select 'ADF5709BEZ-R7',	'LCC' union all
select 'LTC3220EPF#TRPBF',	'UTQFN' union all
select 'LT3572EUF#TRPBF',	'QFN' union all
select 'LTC3850IUF#TRPBF',	'QFN' union all
select 'LT8643SEV-2#TRPBF',	'LQFN_EP' union all
select 'LT8643SEV-2#PBF',	'LQFN_EP' union all
select 'LT8625SPJV-1#TRMPBF',	'LQFN' union all
select 'LT8625SPJV-1#TRPBF',	'LQFN' union all
select 'LT8643SIV#WTRPBF',	'LQFN' union all
select 'LT8643SIV#TRPBF',	'LQFN' union all
select 'LT8640SHV-2#3ZZTRPBF',	'LQFN' union all
select 'LT8642SEV#TRPBF',	'LQFN' union all
select 'LT8642SIV#TRPBF',	'LQFN' union all
select 'LT8643SEV#TRPBF',	'LQFN' union all
select 'LT8643SIV-2#TRPBF',	'LQFN' union all
select 'LT8640SEV#TRPBF',	'LQFN' union all
select 'LT8640SIV#TRPBF',	'LQFN' union all
select 'LT8643SHV-2#TRPBF',	'LQFN' union all
select 'LT8640SHV-2#3ZZTRPBFKL1',	'LQFN' union all
select 'LT8643SHV-2#WTRPBFKL1',	'LQFN' union all
select 'LT3977JV#WPBF',	'LQFN' union all
select 'LT8644SIV#3ZZPBF',	'LQFN' union all
select 'LT8643SHV-2#WPBF',	'LQFN' union all
select 'LT8643SIV#PBF',	'LQFN' union all
select 'LT8640SHV-2#PBF',	'LQFN' union all
select 'LT8643SEV#WPBF',	'LQFN' union all
select 'LT8643SIV#WPBF',	'LQFN' union all
select 'LT8643SIV#WPBFKL1',	'LQFN' union all
select 'LT8642SEV#PBF',	'LQFN' union all
select 'LT8642SIV#PBF',	'LQFN' union all
select 'LT8640SIV#PBF',	'LQFN' union all
select 'LT8640SEV#WPBF',	'LQFN' union all
select 'LT8640SIV#WPBF',	'LQFN' union all
select 'LT8643SIV-2#PBF',	'LQFN' union all
select 'LT8640SHV-2#WPBF',	'LQFN' union all
select 'LT8640SIV-2#3MOPBF',	'LQFN' union all
select 'LT8640SEV#PBF',	'LQFN' union all
select 'LT3977JV#WPBFKL1',	'LQFN' union all
select 'LT8643SEV#PBF',	'LQFN' union all
select 'LT8643SHV-2#PBF',	'LQFN' union all
select 'LT8640SIV-2#PBF',	'LQFN' union all
select 'LT8627SPJV#TRMPBF',	'LGA' union all
select 'LT8644SIV#TRMPBF',	'LGA' union all
select 'LT8644SIV#WTRMPBF',	'LGA' union all
select 'LT8627SPJV#TRPBF',	'LGA' union all
select 'LT8342RV#TRPBF',	'LGA' union all
select 'LT8644SIV#WTRPBF',	'LGA' union all
select 'LT8644SIV#TRPBF',	'LGA' union all
select 'LT8640SAAV#TRPBF',	'LGA' union all
select 'LT8342RV#TRMPBF',	'LGA' union all
select 'LT8643SAAV#PBF',	'LGA' union all
select 'LT8640SAAV#PBF',	'LGA' union all
select 'ADXL255WBCPZ-RL',	'LFCSP' union all
select 'ADG786BCPZ-REEL7',	'LFCSP' union all
select 'ADG783BCPZ-REEL7',	'LFCSP' union all
select 'AD8432ACPZ-WP',	'LFCSP' union all
select 'AD3302WBCSZ-RL',	'LFCSP' union all
select 'AD3301WBCPZ-AA-RL',	'LFCSP' union all
select 'LT3073AV#TRPBF',	'LGA' union all
select 'LT3073AV#PBF',	'LGA' union all
select 'LT3073AV#PBFKL1',	'LGA' union all
select 'LT3041ADE#TRPBF',	'LFCSP' union all
select 'LT3041ADE#PBF',	'LFCSP' union all
select 'LT7170RV-1#QN64-1TRPBF',	'LGA' union all
select 'LT7170RV-1#E0040-1PBF',	'LGA' union all
select 'LT7176RV#TRPBF',	'LGA' union all
select 'LT7176RV-1#TRPBF',	'LGA' union all
select 'LT7176PRV-1#TRPBF',	'LGA' union all
select 'LT7171RV#TRPBF',	'LGA' union all
select 'LT7171RV#TRMPBF',	'LGA' union all
select 'LT7176RV-1#TRMPBF',	'LGA' union all
select 'LT7176RV-1#TRMPBF-ES',	'LGA' union all
select 'LT8636HV#3ZZTRPBF',	'LQFN' union all
select 'LT8636JV#WTRPBF',	'LQFN' union all
select 'LT8636HV#WTRPBF',	'LQFN' union all
select 'LT8653SEV#TRPBF',	'LQFN' union all
select 'LT8653SIV#TRPBF',	'LQFN' union all
select 'LT8653SEV#PBF',	'LQFN' union all
select 'LT8636JV#PBF',	'LQFN' union all
select 'LT8636EV#WPBF',	'LQFN' union all
select 'LT8653SIV#PBF',	'LQFN' union all
select 'LT8636HV#WPBF',	'LQFN' union all
select 'LT8653SIV#WPBF',	'LQFN' union all
select 'LT8636JV#WPBF',	'LQFN' union all
select 'LT8653SEV#WPBF',	'LQFN' union all
select 'LT3978JV#3ZZPBF',	'LQFN' union all
select 'LTC6419HV#PBF',	'LQFN' union all
select 'LT8637EV#PBF',	'LQFN' union all
select 'LT8636MPV#PBF',	'LQFN' union all
select 'LT8637EV#WPBF',	'LQFN' union all
select 'LT8636HV#3ZZPBF',	'LQFN' union all
select 'LT8637JV#WPBF',	'LQFN' union all
select 'LT8637JV#PBF',	'LQFN' union all
select 'LTC6419IV#PBF',	'LQFN' union all
select 'LTC3312SAJV#WPBF',	'LQFN' union all
select 'LT8624SAV#TRPBF',	'LGA' union all
select 'LT8622SAV#TRPBF',	'LGA' union all
select 'LT8692SIV#WTRPBF',	'LGA' union all
select 'LT8622SAV#PBF',	'LGA' union all
select 'LT8624SAV#PBF',	'LGA' union all
select 'LT8692SIV#WPBF',	'LGA' union all
select 'LT3074AV#TRPBF',	'LGA' union all
select 'LTC3312SAJV#WTRPBF',	'LGA' union all
select 'LT3074AV#PBF',	'LGA' union all
select 'LT3078AV#PBF',	'LGA' union all
select 'ADRF5060BCCZN',	'LGA' union all
select 'LT3099ADE#TRPBF',	'LFCSP' union all
select 'LT3099ADE#PBF-ES',	'LFCSP' union all
select 'LT3099ADE#PBF',	'LFCSP' union all
select 'ADXRS295ABCEZ-RL7',	'LGA_CAV' union all
select 'ADXRS195BCEZ-RL7',	'LGA_CAV' union all
select 'ADXRS295ABCEZ-IMU',	'LGA_CAV' union all
select 'ADXRS295BCEZ-RL',	'LGA_CAV' union all
select 'ADXRS295BCEZ-RL7',	'LGA_CAV' union all
select 'ADXRS295BCEZ-IMU',	'LGA_CAV' union all
select 'ADXRS295BCEZ',	'LGA_CAV' union all
select 'LT8636HV#PBF',	'LQFN' union all
select 'LT8636EV#PBF',	'LQFN' union all
select 'LT8647RCPZ-RL-ES',	'LFCSP' union all
select 'LTC4246IV#TRPBF',	'LQFN' union all
select 'LTC4246IV#PBF',	'LQFN' union all
select 'LT8277RUDCM#WTRPBF',	'LFCSP' union all
select 'LT8277RUDCM#WPBF',	'LFCSP' union all
select 'LT8641JUDC#WPBF',	'QFN' union all
select 'LT8625SIV#TRMPBF',	'LQFN' union all
select 'LT8625SPJV#TRMPBF',	'LQFN' union all
select 'LT8625SIV#TRPBF',	'LQFN' union all
select 'LT8625SPJV#TRPBF',	'LQFN' union all
select 'LT8642EV-A1#TRMPBF',	'LGA' union all
select 'LT8673RUDCM#WTRMPBF',	'LFCSP_SS' union all
select 'LT8673RUDCM#WTRPBF',	'LFCSP_SS' union all
select 'LT8673RUDCM#WTRPBFKL1',	'LFCSP_SS' union all
select 'ADGM3144BCCZ-U2',	'LGA' union all
select 'LTC3313JV#WTRPBF',	'LGA' union all
select 'LTC3313JV#WTRMPBF',	'LGA' union all
select 'LTC3313JV#WPBF',	'LGA' union all
select 'LTC3313EV#TRMPBF',	'LGA' union all
select 'LTC3313EV#TRPBF',	'LGA' union all
select 'LTC3313EV#PBF',	'LGA' union all
select 'AD8337BCPZ-WP',	'LFCSP' union all
select 'AD8330ACPZ-R2',	'LFCSP' union all
select 'HMC576LC3BTR',	'LCC' union all
select 'LT1915JUDM#WTRPBF',	'LFCSP_SS' union all
select 'LT8615RUDM#TRPBF',	'LFCSP_SS' union all
select 'LT8615RUDM#PBF',	'LFCSP_SS' union all
select 'LT1915JUDM#WPBF',	'LFCSP_SS' union all
select 'ADG918BCPZ-500RL7',	'LFCSP' union all
select 'ADG918BCPZ-REEL7',	'LFCSP' union all
select 'ADA4807-2ACPZ-R2',	'LFCSP' union all
select 'ADM3066EACPZ',	'LFCSP' union all
select 'ADG1236YCPZ-500RL7',	'LFCSP' union all
select 'ADG1204YCPZ-500RL7',	'LFCSP' union all
select 'ADG1236YCPZ-REEL7',	'LFCSP' union all
select 'ADG836YCPZ-REEL7',	'LFCSP' union all
select 'ADG1204YCPZ-REEL7',	'LFCSP' union all
select 'ADN2891ACPZ-RL',	'LFCSP' union all
select 'ADG1211YCPZ-500RL7',	'LFCSP' union all
select 'ADG1213YCPZ-500RL7',	'LFCSP' union all
select 'ADG1212YCPZ-500RL7',	'LFCSP' union all
select 'ADN2526ACPZ-R7',	'LFCSP' union all
select 'ADG1211YCPZ-REEL7',	'LFCSP' union all
select 'ADG1212YCPZ-REEL7',	'LFCSP' union all
select 'ADM8845ACPZ-REEL7',	'LFCSP' union all
select 'ADN2891ACPZ-RL7',	'LFCSP' union all
select 'ADF5001BCPZ-RL7',	'LFCSP' union all
select 'AD5592RWBCPZ-RL7',	'LFCSP' union all
select 'ADF5000BCPZ-RL7',	'LFCSP' union all
select 'AD5592RWBCPZ-1-RL7',	'LFCSP' union all
select 'LT7826ACPZ-U1',	'LFCSP' union all
select 'LT3154AV#TRPBF',	'LGA' union all
select 'LT3154AV#PBF',	'LGA' union all
select 'SG3154AV#PBF',	'LGA' union all
select 'AD22365Z-3D-RL7',	'LGA' union all
select 'AD22365Z-3DHS-RL7',	'LGA' union all
select 'AD22365Z-1B-RL7',	'LGA' union all
select 'AD22365Z-1-RL7',	'LGA' union all
select 'LTC7804IUD#TRPBF',	'QFN' union all
select 'LTC3786IUD#TRPBF',	'QFN' union all
select 'LTC3554EUD#TRPBF',	'QFN' union all
select 'LT8609SIV#WTRPBF',	'LQFN' union all
select 'LT8336HV#WTRPBF',	'LQFN' union all
select 'LT8336JV#TRPBF',	'LQFN' union all
select 'LT8337EV#TRPBF',	'LQFN' union all
select 'LT8337JV#TRPBF',	'LQFN' union all
select 'LT8609SIV#TRPBF',	'LQFN' union all
select 'LT8337EV-1#TRPBF',	'LQFN' union all
select 'LT8336HV#TRPBF',	'LQFN' union all
select 'LT8609SIV#WPBF',	'LQFN' union all
select 'LT8337JV#PBF',	'LQFN' union all
select 'LT8336JV#PBF',	'LQFN' union all
select 'LT8336HV#PBF',	'LQFN' union all
select 'LTC4249AV-1#PBF',	'LQFN' union all
select 'LT8337EV-1#PBF',	'LQFN' union all
select 'LT8609SIV#PBF',	'LQFN' union all
select 'LT8609SIV#3ZZPBF',	'LQFN' union all
select 'LT8337JV-1#PBF',	'LQFN' union all
select 'LTC3311JV#WTRMPBF',	'LQFN' union all
select 'LTC3310JV-1#WTRMPBF',	'LQFN' union all
select 'LTC3310HV-1#TRMPBF',	'LQFN' union all
select 'LTC3311JV-1#TRMPBF',	'LQFN' union all
select 'LTC3311SIV#TRMPBF',	'LQFN' union all
select 'LTC3310JV-1#TRMPBF',	'LQFN' union all
select 'LTC3310JV#TRMPBF',	'LQFN' union all
select 'LTC3311SEV#TRMPBF',	'LQFN' union all
select 'LTC3311JV-0^75#WTRPBF',	'LQFN' union all
select 'LTC3310JV-1#WTRPBF',	'LQFN' union all
select 'LTC3311JV#WTRPBF',	'LQFN' union all
select 'LTC3311SIV#TRPBF',	'LQFN' union all
select 'LTC3310JV-1#TRPBF',	'LQFN' union all
select 'LTC3311JV-1#TRPBF',	'LQFN' union all
select 'LTC3311HV#WTRPBF',	'LQFN' union all
select 'LTC3310SIV-1#TRPBF',	'LQFN' union all
select 'LT8722AV#PBF',	'LQFN' union all
select 'LTC3311JV#WPBF',	'LQFN' union all
select 'LTC3311SIV#PBF',	'LQFN' union all
select 'LTC3311JV-1#PBF',	'LQFN' union all
select 'LTC3310JV-1#PBF',	'LQFN' union all
select 'LTC3310SIV-1#PBF',	'LQFN' union all
select 'LTC3310JV-1#WPBF',	'LQFN' union all
select 'LTC3311HV#3ZZPBF',	'LQFN' union all
select 'LT8336EV#TRPBF',	'LGA' union all
select 'LT8336EV#WTRPBF',	'LGA' union all
select 'LT8336EV#PBF',	'LGA' union all
select 'LT8336EV#WPBF',	'LGA' union all
select 'LTC3310SEV#TRMPBF',	'LGA' union all
select 'LTC3310HV#TRMPBF',	'LGA' union all
select 'LTC3310SIV#TRMPBF',	'LGA' union all
select 'LTC3310HV#WTRMPBF',	'LGA' union all
select 'LTC3310SIV#WTRMPBF',	'LGA' union all
select 'LTC3310HV#3ZZTRPBF',	'LGA' union all
select 'LTC3310SIV#WTRPBF',	'LGA' union all
select 'LTC3310SEV#TRPBF',	'LGA' union all
select 'LTC3310SIV#TRPBF',	'LGA' union all
select 'RHP50000IV-CSL#TRPBF',	'LGA' union all
select 'LTC3311JV#3ZZPBF',	'LGA' union all
select 'LTC3310SIV#3ZZPBF',	'LGA' union all
select 'LTC3310SEV#WPBF',	'LGA' union all
select 'LTC3310HV#3ZZPBF',	'LGA' union all
select 'LTC3310HV#PBF',	'LGA' union all
select 'LTC3310SIV#PBF',	'LGA' union all
select 'LTC3310SEV#PBF',	'LGA' union all
select 'LTC3310SIV#WPBF',	'LGA' union all
select 'LT8615RUDM#WPBF',	'LFCSP_SS' union all
select 'ADL6346ACRZB-R7',	'LFCSP_RT' union all
select 'ADRF5292BCRZN',	'LFCSP_RT' union all
select 'ADRF5292XCRZN',	'LFCSP_RT' union all
select 'ADRF5292BCRZN-RL',	'LFCSP_RT' union all
select 'ADRF5292BCRZN-RL7',	'LFCSP_RT' union all
select 'ADF6957-2KDDZRL-U1',	'LFCSP' union all
select 'ADF6957-3KDDZRL-U1',	'LFCSP' union all
select 'ADF6957-4KDDZRL-U1',	'LFCSP' union all
select 'LT3080EDD#TRPBF',	'DFN' union all
select 'LT8609AJDDM#WTRPBF',	'DFN' union all
select 'LT3463EDD#TRPBF',	'DFN' union all
select 'LT3466EDD#TRPBF',	'DFN' union all
select 'LT3040EDD#TRPBF',	'DFN' union all
select 'LT3090HDD#TRPBF',	'DFN' union all
select 'LT1938EDD#TRPBF',	'DFN' union all
select 'LT3480IDD#TRPBF',	'DFN' union all
select 'LT3437EDD#TRPBF',	'DFN' union all
select 'LT3027IDD#TRPBF',	'DFN' union all
select 'ADBMS6830MWCCSZG-RL',	'LFCSP_SS' union all
select 'AD5562KBCZ-RL',	'CSP_BGA' union all
select 'LT9890AV#PBF',	'LGA' union all
select 'AD5390BSTZ-5',	'LQFN' union all
select 'ADBMS6830MWCSWZ-RL',	'LQFP_EP' union all
select 'ADBMS6830MWFSCCSZ-RL',	'LFCSP_SS' union all
select 'ADATE319KCPZ-24',	'LFCSP' union all
select 'AD80497BBBPZ-REEL',	'BGA_ED' union all
select 'LT8708ILWE#WPBF',	'LQFP_EP' union all
select 'LT8609SEV#TRPBF',	'LQFN' union all
select 'ADBMS1818ASWAZ-RL',	'LQFP_EP' union all
select 'AD5522JSVUZ-RL',	'TQFN_EP' union all
select 'LTC2979IY#3NUPBF',	'BGA' union all
select 'AD7760BSVZ-REEL',	'TQFP_EP' union all
select 'ADBMS6830MWFSCSWZ',	'LFCSP_SS' union all
select 'ADXL362WBCCZ-RL',	'LGA' union all
select 'ADES1831CCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS6830MWCCSZ-RL',	'LFCSP_SS' union all
select 'ADBMS6830MWCSWZ',	'LQFP_EP' union all
select 'ADATE325-2KBCZ-RL',	'CSP_BGA' union all
select 'AD9988BBPZRL-4D4AC',	'BGA_ED' union all
select 'aduc848bsz62-5',	'MQFP' union all
select 'ADSP1801WBCPZ400-RL',	'LFCSP' union all
select 'ADXRS910AWBRGZ-RL',	'SOIC_CAV' union all
select 'SBXRS910WBRGZ-RL',	'SOIC_CAV' union all
select 'AD9652BBCZRL7-310',	'CSP_BGA' union all
select 'ADBMS1818ASWZ-RL',	'LQFP_EP' union all
select 'adbms6830mwccsz',	'LFCSP_SS' union all
select 'ADXL318-2WBCCZ-RL7',	'LGA' union all
select 'ADATE328KBCZ-RL',	'CSP_BGA' union all
select 'AD8284WCSVZ-RL',	'TQFP_EP' union all
select 'ADBMS6842WFSCCSZ-RL',	'LFCSP_SS' union all
select 'ADXRS910WBRGZ-RL',	'SOIC_CAV' union all
select 'ADATE325-2KBCZ',	'CSP_BGA' union all
select 'ADATE328KBCZ',	'CSP_BGA' union all
select 'LTC6813HLWE-1#3ZZTRPBF',	'LQFP_EP' union all
select 'ADES1830CCSZ-RL',	'LFCSP' union all
select 'AD8285WBCPZ-RL',	'LFCSP' union all
select 'ADXL318-1WBCCZ-RL',	'LGA' union all
select 'AD80507BBPZ-REEL',	'CSP_BGA' union all
select 'LTC2980CY#PBF',	'BGA' union all
select 'adin6310cbcz',	'CSP_BGA' union all
select 'adm3252eabcz',	'CSP_BGA' union all
select 'ADRV9024BBCZ',	'CSP_BGA' union all
select 'ADUC848BSZ8-5',	'MQFP' union all
select 'ADUC847BSZ8-5',	'MQFP' union all
select 'AD80548BBBPZ-REEL',	'BGA_ED' union all
select 'ADBMS6842AWCCSZ-RL',	'LFCSP' union all
select 'AD80497BBPZ-REEL',	'BGA_ED' union all
select 'ADUC845BSZ8-5',	'MQFP' union all
select 'AD80546BBPZ-REEL',	'BGA_ED' union all
select 'ADUC845BSZ62-5',	'MQFP' union all
select 'ADBMS6836WFSCCSZ-RL',	'LFCSP_SS' union all
select 'AD80516BBCZ-REEL',	'CSP_BGA' union all
select 'AD5371BSTZ-REEL',	'LQFP' union all
select 'ADIN1320BCPZ',	'LFCSP' union all
select 'AD53581KBCZ-U3',	'CSP_BGA' union all
select 'LTC2980IY#PBF',	'BGA' union all
select 'ADWFS91004CCCSZ-U1',	'LFCSP_SS' union all
select 'AD7768BSTZ-RL',	'LQFP' union all
select 'LTC833HLWE#3NWPBF',	'LQFP_EP' union all
select 'AD9467BCPZRL7-200',	'LFCSP' union all
select 'adw90030wccsz-rl',	'LFCSP_SS' union all
select 'ADWFS81218CSWZ-RL',	'LQFP' union all
select 'LT8708HLWE-1#3ZZPBF',	'LQFP_EP' union all
select 'ltc7132ey#pbf',	'BGA' union all
select 'lt8648sev#trpbf',	'LGA' union all
select 'ADN4604ASVZ-RL',	'TQFP_EP' union all
select 'ltc6813hlwe-1#3zzpbf',	'LQFP_EP' union all
select 'ad8197astz-rl',	'LQFP' union all
select 'adh8413bcpz-csh',	'LFCSP' union all
select 'AD9887AKSZ-100',	'MQFP' union all
select 'ADBMS6830MWCCSZG',	'LFCSP_SS' union all
select 'SBXL362BCCZ-MI-RL7',	'LGA' union all
select 'ltc6812hlwe-1#3zztrpbf',	'LQFP_EP' union all
select 'ad7658ystz-1',	'LQFP' union all
select 'adbms6843wccsz-rl',	'LFCSP_SS' union all
select 'ADRV9025ABBCZ',	'CSP_BGA' union all
select 'AD9681BBCZRL7-125',	'CSP_BGA' union all
select 'AD7568BSZ-REEL',	'MQFP' union all
select 'ADIN1102CCPZ-R7',	'LFCSP' union all
select 'AD7879-1ACPZ-RL',	'LFCSP' union all
select 'ADUC842BSZ62-5',	'MQFP' union all
select 'ADBMS1818ASWAZ-R7',	'LQFP_EP' union all
select 'ad7656bstz-1',	'lqfp' union all
select 'ADL6317ACCZ-R7',	'LGA' union all
select 'LT8609SEV#PBF',	'LQFN' union all
select 'ad8283wbcpz-rl',	'LFCSP' union all
select 'adbms6830mwfscswz-rl',	'LQFP_EP' union all
select 'ADXL362BCCZ-MI-RL7',	'LGA' union all
select 'ADUC845BSZ62-3',	'MQFP' union all
select 'ADMV48281BBCZ',	'CSP_BGA'
) AS my_list
LEFT JOIN ppc.customer_data_wip t 
       ON my_list.device = t.Part_Name 
      AND my_list.package = t.Package_Name
WHERE t.Part_Name IS NULL;