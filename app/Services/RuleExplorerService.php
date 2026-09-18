<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Read-only aggregation of every rule table into one plain-English feed.
 * Deliberately read-only for the interdependent tables (setup_states,
 * transition_rules, part_rules, axis_rules) -- creating/editing those
 * safely requires real business logic (e.g. a new setup_state usually
 * needs paired transition rows too), not a generic CRUD form. The flat,
 * independent tables (auto_part_rules, focus_group_rules,
 * part_exclusions, package_groups) are simple enough for direct CRUD --
 * see RuleExplorerController for those endpoints.
 */
class RuleExplorerService
{
    public function getAllRules(?string $machineFilter = null): array
    {
        $sql = <<<SQL
            WITH state_desc AS (
                SELECT s.setup_state_id, s.machine_id,
                    CONCAT(
                        'Factory ', s.factory, ', ',
                        COALESCE(s.package_name, 'ANY package'), ', ',
                        COALESCE(s.body_size, 'any body size'),
                        IF(s.thickness IS NOT NULL, CONCAT(' (thickness ', s.thickness, ')'), ''),
                        ', leadcount ',
                        CASE
                            WHEN s.leadcount_include IS NOT NULL THEN CONCAT('ONLY [', s.leadcount_include, ']')
                            WHEN s.leadcount_min IS NOT NULL OR s.leadcount_max IS NOT NULL THEN
                                CONCAT(COALESCE(s.leadcount_min, 'any'), '-', COALESCE(s.leadcount_max, 'any'),
                                    IF(s.leadcount_exclude IS NOT NULL, CONCAT(' except [', s.leadcount_exclude, ']'), ''))
                            ELSE 'any'
                        END,
                        ', process: ', s.process_type
                    ) AS description
                FROM machine_setup_states s
            )

            SELECT 'CAPABILITY' AS rule_type, s.setup_state_id AS rule_id, m.machine_num,
                CONCAT('Machine ', m.machine_num, ' can run: ', sd.description) AS rule_in_plain_english,
                s.setup_state_id AS state_id
            FROM machine_setup_states s
            JOIN machine_list m ON m.id = s.machine_id
            JOIN state_desc sd ON sd.setup_state_id = s.setup_state_id

            UNION ALL

            SELECT 'PART ROUTING', r.rule_id, m.machine_num,
                CONCAT('Part "', r.match_value, '" (', r.match_type, ') is ONLY allowed on Machine ',
                    m.machine_num, ' as: ', sd.description),
                r.setup_state_id AS state_id
            FROM machine_capability_part_rules r
            JOIN machine_setup_states s ON s.setup_state_id = r.setup_state_id
            JOIN state_desc sd ON sd.setup_state_id = r.setup_state_id
            JOIN machine_list m ON m.id = s.machine_id

            UNION ALL

            SELECT 'TRANSITION COST', t.rule_id, m.machine_num,
                CONCAT('On ', m.machine_num, ': [', COALESCE(sd_from.description, 'ANY state'),
                    '] -> [', sd_to.description, '] = ', t.operation_type,
                    IF(t.est_duration_minutes IS NOT NULL, CONCAT(' (~', t.est_duration_minutes, ' min)'), '')),
                t.to_state_id AS state_id
            FROM machine_transition_rules t
            JOIN machine_list m ON m.id = t.machine_id
            LEFT JOIN state_desc sd_from ON sd_from.setup_state_id = t.from_state_id
            JOIN state_desc sd_to ON sd_to.setup_state_id = t.to_state_id

            UNION ALL

            SELECT 'TRANSITION EXCEPTION', e.id, m.machine_num,
                CONCAT('On ', m.machine_num, ', ONLY part "', e.part_name, '": [',
                    COALESCE(sd_from.description, 'ANY state'), '] -> [', sd_to.description,
                    '] = ', e.operation_type,
                    IF(e.est_duration_minutes IS NOT NULL, CONCAT(' (~', e.est_duration_minutes, ' min)'), ''),
                    ' -- part-specific override'),
                e.to_state_id AS state_id
            FROM machine_transition_rule_exceptions e
            JOIN machine_list m ON m.id = e.machine_id
            LEFT JOIN state_desc sd_from ON sd_from.setup_state_id = e.from_state_id
            JOIN state_desc sd_to ON sd_to.setup_state_id = e.to_state_id

            UNION ALL

            SELECT 'TRANSITION AXIS', a.id, m.machine_num,
                CONCAT('On ', m.machine_num, ': changing ', a.axis, ' costs ', a.operation_type,
                    ' (~', a.est_duration_minutes, ' min), combined via ', a.combination_rule),
                NULL AS state_id
            FROM machine_transition_axis_rules a
            JOIN machine_list m ON m.id = a.machine_id

            UNION ALL

            SELECT 'AUTO-PART RULE', r.id, m.machine_num,
                CONCAT('On ', m.machine_num, ': auto lots of ', COALESCE(r.package_name, 'ANY package'),
                    ' are ', UPPER(r.rule_type), ' (', COALESCE(r.notes, 'no notes'), ')'),
                NULL AS state_id
            FROM machine_auto_part_rules r
            JOIN machine_list m ON m.id = r.machine_id

            UNION ALL

            SELECT 'FOCUS GROUP RULE', r.id, m.machine_num,
                CONCAT('On ', m.machine_num, ': Focus_Group "', r.focus_group, '" is ',
                    UPPER(r.rule_type), ' (', COALESCE(r.notes, 'no notes'), ')'),
                NULL AS state_id
            FROM machine_focus_group_rules r
            JOIN machine_list m ON m.id = r.machine_id

            UNION ALL

            SELECT 'PART EXCLUSION', e.id, m.machine_num,
                CONCAT('Part "', e.part_name, '" is EXCLUDED from ', m.machine_num,
                    ' (', COALESCE(e.notes, 'no notes'), ') -- eligible elsewhere as normal'),
                NULL AS state_id
            FROM machine_part_exclusions e
            JOIN machine_list m ON m.id = e.machine_id

            ORDER BY rule_type, machine_num
        SQL;

        $bindings = [];
        if ($machineFilter) {
            $sql = "SELECT * FROM ({$sql}) x WHERE machine_num LIKE ?";
            $bindings[] = "%{$machineFilter}%";
        }

        return DB::connection('qdn_db')->select($sql, $bindings);
    }

    public function getPackageGroups(): array
    {
        return DB::connection('qdn_db')->table('package_groups')
            ->orderBy('group_name')->orderBy('package_name')->get()->toArray();
    }
}
