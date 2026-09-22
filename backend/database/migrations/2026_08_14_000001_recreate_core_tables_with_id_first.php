<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * @var array<string, array<string, mixed>>
     */
    private array $tableStates = [];

    public function up(): void
    {
        DB::transaction(function (): void {
            $tables = [
                'admin_users',
                'categories',
                'content_items',
                'faqs',
                'content_views',
                'admin_tokens',
            ];

            foreach ($tables as $table) {
                if (!Schema::hasTable($table)) {
                    continue;
                }

                $this->tableStates[$table] = $this->captureTableState($table);
            }

            foreach ($this->tableStates as $table => $state) {
                foreach ($state['foreign_keys'] as $foreignKey) {
                    DB::statement(sprintf(
                        'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s',
                        $this->qi($table),
                        $this->qi($foreignKey['name']),
                    ));
                }
            }

            foreach (['admin_users', 'categories', 'content_items', 'faqs', 'content_views'] as $table) {
                if (!isset($this->tableStates[$table])) {
                    continue;
                }

                if ($this->needsRebuild($this->tableStates[$table])) {
                    $this->rebuildTable($table, $this->tableStates[$table]);
                }
            }

            foreach ($this->tableStates as $table => $state) {
                if ($this->needsRebuild($state)) {
                    $this->restoreConstraints($table, $state);
                    $this->restoreIndexes($table, $state);
                    $this->resequenceIdColumn($table);
                }
            }

            foreach ($this->tableStates as $table => $state) {
                foreach ($state['foreign_keys'] as $foreignKey) {
                    DB::statement(sprintf(
                        'ALTER TABLE %s ADD CONSTRAINT %s %s',
                        $this->qi($table),
                        $this->qi($foreignKey['name']),
                        $foreignKey['definition'],
                    ));
                }
            }
        });
    }

    public function down(): void
    {
        // Reverting a table rebuild safely would require rebuilding the original shape again.
    }

    /**
     * @return array<string, mixed>
     */
    private function captureTableState(string $table): array
    {
        $columns = DB::select(
            <<<'SQL'
SELECT
    column_name,
    ordinal_position,
    data_type,
    udt_name,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    datetime_precision,
    is_identity,
    identity_generation,
    is_generated,
    generation_expression,
    collation_name
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = ?
ORDER BY ordinal_position
SQL,
            [$table],
        );

        $constraints = DB::select(
            <<<'SQL'
SELECT
    conname AS name,
    contype,
    pg_get_constraintdef(oid, true) AS definition
FROM pg_constraint
WHERE conrelid = ?::regclass
ORDER BY contype, conname
SQL,
            [$table],
        );

        $indexes = DB::select(
            <<<'SQL'
SELECT
    ci.relname AS name,
    pg_get_indexdef(i.indexrelid) AS definition,
    i.indisprimary,
    i.indisunique
FROM pg_index i
JOIN pg_class ct ON ct.oid = i.indrelid
JOIN pg_class ci ON ci.oid = i.indexrelid
JOIN pg_namespace n ON n.oid = ct.relnamespace
WHERE n.nspname = current_schema()
  AND ct.relname = ?
ORDER BY ci.relname
SQL,
            [$table],
        );

        $foreignKeys = [];
        $otherConstraints = [];

        foreach ($constraints as $constraint) {
            if ($constraint->contype === 'f') {
                $foreignKeys[] = [
                    'name' => $constraint->name,
                    'definition' => $constraint->definition,
                ];
                continue;
            }

            $otherConstraints[] = [
                'name' => $constraint->name,
                'type' => $constraint->contype,
                'definition' => $constraint->definition,
            ];
        }

        return [
            'columns' => $columns,
            'constraints' => $otherConstraints,
            'foreign_keys' => $foreignKeys,
            'indexes' => array_values(array_filter(
                array_map(static function ($index): ?array {
                    if ($index->indisprimary || $index->indisunique) {
                        return null;
                    }

                    return [
                        'name' => $index->name,
                        'definition' => $index->definition,
                    ];
                }, $indexes),
            )),
        ];
    }

    /**
     * @param array<string, mixed> $state
     */
    private function needsRebuild(array $state): bool
    {
        foreach ($state['columns'] as $column) {
            if ($column->column_name === 'id') {
                $isFirst = (int) $column->ordinal_position === 1;
                $isAutoIncrement = $column->is_identity === 'YES' || str_contains((string) $column->column_default, 'nextval(');

                return !($isFirst && $isAutoIncrement);
            }
        }

        return true;
    }

    /**
     * @param array<string, mixed> $state
     */
    private function rebuildTable(string $table, array $state): void
    {
        $tempTable = $table . '__rebuild';

        DB::statement(sprintf(
            'CREATE TABLE %s (%s)',
            $this->qi($tempTable),
            $this->buildColumnDefinitions($state),
        ));

        $sourceColumns = [];
        $targetColumns = [];
        $hasId = false;

        foreach ($state['columns'] as $column) {
            if ($column->column_name === 'id') {
                $hasId = true;
                continue;
            }

            $sourceColumns[] = $this->qi($column->column_name);
            $targetColumns[] = $this->qi($column->column_name);
        }

        array_unshift($targetColumns, $this->qi('id'));

        if ($hasId) {
            array_unshift($sourceColumns, $this->qi('id'));
        } else {
            array_unshift($sourceColumns, 'ROW_NUMBER() OVER (ORDER BY ' . $this->buildFallbackOrderExpression($state) . ')');
        }

        DB::statement(sprintf(
            'INSERT INTO %s (%s) SELECT %s FROM %s',
            $this->qi($tempTable),
            implode(', ', $targetColumns),
            implode(', ', $sourceColumns),
            $this->qi($table),
        ));

        DB::statement(sprintf('ALTER TABLE %s RENAME TO %s', $this->qi($table), $this->qi($table . '__backup')));
        DB::statement(sprintf('ALTER TABLE %s RENAME TO %s', $this->qi($tempTable), $this->qi($table)));
        DB::statement(sprintf('DROP TABLE %s', $this->qi($table . '__backup')));
    }

    /**
     * @param array<string, mixed> $state
     */
    private function buildColumnDefinitions(array $state): string
    {
        $definitions = ['id BIGSERIAL NOT NULL'];

        foreach ($state['columns'] as $column) {
            if ($column->column_name === 'id') {
                continue;
            }

            $definitions[] = $this->buildColumnDefinition($column);
        }

        return implode(', ', $definitions);
    }

    /**
     * @param object $column
     */
    private function buildColumnDefinition(object $column): string
    {
        $type = $this->columnTypeSql($column);
        $definition = [$this->qi($column->column_name), $type];

        if (!empty($column->collation_name)) {
            $definition[] = 'COLLATE ' . $this->qi($column->collation_name);
        }

        if ($column->is_generated === 'ALWAYS' || $column->is_generated === 'BY DEFAULT') {
            $definition[] = 'GENERATED ' . $column->is_generated . ' AS (' . $column->generation_expression . ') STORED';
        } elseif ($column->column_default !== null) {
            $definition[] = 'DEFAULT ' . $column->column_default;
        }

        if ($column->is_nullable === 'NO') {
            $definition[] = 'NOT NULL';
        }

        return implode(' ', $definition);
    }

    /**
     * @param object $column
     */
    private function columnTypeSql(object $column): string
    {
        $baseType = $column->data_type === 'USER-DEFINED' ? $column->udt_name : $column->data_type;

        if ($baseType === 'character varying' && $column->character_maximum_length !== null) {
            return $baseType . '(' . $column->character_maximum_length . ')';
        }

        if ($baseType === 'numeric' && $column->numeric_precision !== null) {
            if ($column->numeric_scale !== null) {
                return $baseType . '(' . $column->numeric_precision . ',' . $column->numeric_scale . ')';
            }

            return $baseType . '(' . $column->numeric_precision . ')';
        }

        return $baseType;
    }

    /**
     * @param array<string, mixed> $state
     */
    private function restoreConstraints(string $table, array $state): void
    {
        $hasIdPrimaryKey = false;

        foreach ($state['constraints'] as $constraint) {
            $definition = $constraint['definition'];

            if ($constraint['type'] === 'p') {
                if (preg_match('/PRIMARY KEY\s*\(\s*id\s*\)/i', $definition)) {
                    $hasIdPrimaryKey = true;
                    continue;
                }

                $legacyName = $constraint['name'] . '_legacy_unique';
                $legacyDefinition = preg_replace('/^PRIMARY KEY/i', 'UNIQUE', $definition);

                DB::statement(sprintf(
                    'ALTER TABLE %s ADD CONSTRAINT %s %s',
                    $this->qi($table),
                    $this->qi($legacyName),
                    $legacyDefinition,
                ));
                continue;
            }

            if ($constraint['type'] === 'u' && preg_match('/\(\s*id\s*\)/i', $definition)) {
                continue;
            }

            DB::statement(sprintf(
                'ALTER TABLE %s ADD CONSTRAINT %s %s',
                $this->qi($table),
                $this->qi($constraint['name']),
                $definition,
            ));
        }

        if ($this->hasColumn($state['columns'], 'id') && !$hasIdPrimaryKey) {
            DB::statement(sprintf(
                'ALTER TABLE %s ADD CONSTRAINT %s PRIMARY KEY (id)',
                $this->qi($table),
                $this->qi($table . '_pkey'),
            ));
        }
    }

    /**
     * @param array<string, mixed> $state
     */
    private function restoreIndexes(string $table, array $state): void
    {
        foreach ($state['indexes'] as $index) {
            DB::statement($index['definition']);
        }
    }

    private function resequenceIdColumn(string $table): void
    {
        $sequence = DB::selectOne(
            'SELECT pg_get_serial_sequence(?, ? ) AS sequence_name',
            [$table, 'id'],
        );

        $sequenceName = $sequence->sequence_name ?? null;

        if ($sequenceName === null) {
            return;
        }

        $maxId = DB::table($table)->max('id');

        if ($maxId === null) {
            DB::statement(sprintf("SELECT setval(%s, 1, false)", DB::getPdo()->quote($sequenceName)));
            return;
        }

        DB::statement(sprintf("SELECT setval(%s, %d, true)", DB::getPdo()->quote($sequenceName), $maxId));
    }

    /**
     * @param array<int, object> $columns
     */
    private function hasColumn(array $columns, string $name): bool
    {
        foreach ($columns as $column) {
            if ($column->column_name === $name) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param array<string, mixed> $state
     */
    private function buildFallbackOrderExpression(array $state): string
    {
        $preferred = ['created_at', 'updated_at', 'published_date', 'uuid', 'slug', 'name', 'title'];
        $available = [];

        foreach ($state['columns'] as $column) {
            $available[] = $column->column_name;
        }

        foreach ($preferred as $candidate) {
            if (in_array($candidate, $available, true)) {
                return $this->qi($candidate);
            }
        }

        return 'ctid';
    }

    private function qi(string $identifier): string
    {
        return '"' . str_replace('"', '""', $identifier) . '"';
    }
};
