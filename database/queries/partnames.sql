select * from qdn_db.package_list where devicename in
(
'AD22122Z-RL',
'AD22365NZ-3-RL7',
'AD3305WBCPZ-RL',
'AD3541RBCPZ12-RL7',
'AD4080BBCC-A0Z',
'AD4084XBCZ-U1',
'AD4170-4BCPZ-U3',
'AD45248ACCZRL',
'AD45248ACCZRL',
'AD45271-57',
'AD45336KSTZ-RL',
'AD45336KSTZ-RL',
'AD45336KSTZ-RL',
'AD4854BBCZ-RL-13',
'AD4857-',
'AD4857BBCZ-RL-13',
'AD4880BBCZ',
'AD4880BBCZ',
'AD4880BBCZ-RL',
'AD4880BBCZ-RL',
'AD4880BBCZ-RL7',
'AD4880BBCZ-RL7',
'AD4883BBCZ',
'AD4883BBCZ-RL7',
'AD4883BBCZ-U1',
'AD4883BBCZ-U1',
'AD4884BBCZ',
'AD4884BBCZ   (NEW)',
'AD4884BBCZ-RL',
'AD4884BBCZ-RL',
'AD4884BBCZ-RL',
'AD4884BBCZ-RL'
)

select * from ppc.customer_data_wip where part_name = 'ADRV9061BBPZ-RL' limit 9999;

SELECT devicename, focus_grp, allocation, recipe, ramp_category
FROM (
    SELECT
        devicename, focus_grp, allocation, recipe,
        CASE
            WHEN allocation LIKE '%TAPE%' THEN 'taping'
            WHEN allocation = 'TUBE' THEN 'tubing'
            WHEN allocation IN (
                'R2','RL','RL5','REEL_7','500RL7','RL7','R250','500REEL','REEL5','REEL500','MINIREEL'
            ) THEN 'reel'
            ELSE 'other'
        END AS ramp_category,
        ROW_NUMBER() OVER (
            PARTITION BY focus_grp,
                CASE
                    WHEN allocation LIKE '%TAPE%' THEN 'taping'
                    WHEN allocation = 'TUBE' THEN 'tubing'
                    WHEN allocation IN (
                        'R2','RL','RL5','REEL_7','500RL7','RL7','R250','500REEL','REEL5','REEL500','MINIREEL'
                    ) THEN 'reel'
                    ELSE 'other'
                END
            ORDER BY devicename
        ) AS rn
    FROM qdn_db.package_list
    WHERE devicename IS NOT NULL
      AND focus_grp IS NOT NULL
      AND allocation IS NOT NULL
      AND recipe IS NOT NULL
) ranked
WHERE rn = 1
ORDER BY focus_grp, ramp_category;