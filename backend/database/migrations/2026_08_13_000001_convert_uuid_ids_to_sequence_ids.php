<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function (): void {
            $this->convertPrimaryTable('admin_users', "COALESCE(created_at, 'epoch'::timestamptz), uuid");
            $this->convertPrimaryTable('categories', "COALESCE(created_at, 'epoch'::timestamptz), uuid");
            $this->convertPrimaryTable('content_items', "COALESCE(created_at, 'epoch'::timestamptz), uuid");
            $this->convertPrimaryTable('faqs', "COALESCE(created_at, 'epoch'::timestamptz), uuid");
            $this->convertPrimaryTable('content_views', "COALESCE(updated_at, 'epoch'::timestamptz), uuid");

            $this->convertForeignKeyColumn(
                table: 'admin_tokens',
                column: 'admin_user_id',
                parentTable: 'admin_users',
                constraintName: 'admin_tokens_admin_user_id_foreign',
                nullable: false,
                onDelete: 'cascade',
            );

            $this->convertForeignKeyColumn(
                table: 'content_items',
                column: 'category_id',
                parentTable: 'categories',
                constraintName: 'content_items_category_id_foreign',
                nullable: true,
                onDelete: 'set null',
            );

            $this->convertForeignKeyColumn(
                table: 'content_views',
                column: 'content_id',
                parentTable: 'content_items',
                constraintName: 'content_views_content_id_foreign',
                nullable: true,
                onDelete: 'cascade',
            );
        });
    }

    public function down(): void
    {
        // Intentionally left blank. Reverting would require rebuilding the original UUID PK/FK shape.
    }

    private function convertPrimaryTable(string $table, string $orderBy): void
    {
        $idType = $this->columnType($table, 'id');
        $hasUuid = Schema::hasColumn($table, 'uuid');

        if ($hasUuid && $idType === 'bigint') {
            return;
        }

        $sequence = $table . '_id_seq';

        if (!$hasUuid && $idType === 'uuid') {
            DB::statement("ALTER TABLE {$table} RENAME COLUMN id TO uuid");
            $hasUuid = true;
        }

        if (!Schema::hasColumn($table, 'id')) {
            DB::statement("ALTER TABLE {$table} ADD COLUMN id BIGINT");
        }

        DB::statement(<<<SQL
WITH ordered AS (
    SELECT uuid, ROW_NUMBER() OVER (ORDER BY {$orderBy}) AS new_id
    FROM {$table}
)
UPDATE {$table} AS target
SET id = ordered.new_id
FROM ordered
WHERE target.uuid = ordered.uuid
SQL);

        DB::statement("CREATE SEQUENCE IF NOT EXISTS {$sequence}");
        DB::statement("ALTER TABLE {$table} ALTER COLUMN id SET DEFAULT nextval('{$sequence}'::regclass)");
        DB::statement("ALTER SEQUENCE {$sequence} OWNED BY {$table}.id");
        DB::statement("ALTER TABLE {$table} ALTER COLUMN id SET NOT NULL");
        DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$table}_id_unique UNIQUE (id)");

        $maxId = DB::table($table)->max('id');
        if ($maxId !== null) {
            DB::statement("SELECT setval('{$sequence}'::regclass, {$maxId}, true)");
        } else {
            DB::statement("ALTER SEQUENCE {$sequence} RESTART WITH 1");
        }
    }

    private function convertForeignKeyColumn(
        string $table,
        string $column,
        string $parentTable,
        string $constraintName,
        bool $nullable,
        string $onDelete,
    ): void {
        $columnType = $this->columnType($table, $column);
        if ($columnType === 'bigint' || $columnType === 'integer' || $columnType === 'smallint') {
            return;
        }

        if (!Schema::hasColumn($table, $column)) {
            return;
        }

        $tempColumn = $column . '_new';

        DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$constraintName}");

        if (!Schema::hasColumn($table, $tempColumn)) {
            DB::statement("ALTER TABLE {$table} ADD COLUMN {$tempColumn} BIGINT");
        }

        DB::statement(<<<SQL
UPDATE {$table} AS child
SET {$tempColumn} = parent.id
FROM {$parentTable} AS parent
WHERE parent.uuid = child.{$column}
SQL);

        DB::statement("ALTER TABLE {$table} DROP COLUMN {$column}");
        DB::statement("ALTER TABLE {$table} RENAME COLUMN {$tempColumn} TO {$column}");

        if (!$nullable) {
            DB::statement("ALTER TABLE {$table} ALTER COLUMN {$column} SET NOT NULL");
        }

        $onDeleteClause = strtoupper($onDelete) === 'SET NULL' ? 'ON DELETE SET NULL' : 'ON DELETE CASCADE';
        DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$constraintName} FOREIGN KEY ({$column}) REFERENCES {$parentTable}(id) {$onDeleteClause}");
    }

    private function columnType(string $table, string $column): ?string
    {
        $row = DB::selectOne(
            'select data_type from information_schema.columns where table_schema = current_schema() and table_name = ? and column_name = ?',
            [$table, $column],
        );

        return $row->data_type ?? null;
    }
};
