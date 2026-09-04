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