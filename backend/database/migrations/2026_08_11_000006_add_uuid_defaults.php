<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        foreach (['admin_users', 'categories', 'content_items', 'faqs', 'content_views'] as $table) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            if ($this->columnType($table, 'id') !== 'uuid') {
                continue;
            }

            DB::statement("ALTER TABLE {$table} ALTER COLUMN id SET DEFAULT gen_random_uuid()");
        }
    }

    public function down(): void
    {
        foreach (['admin_users', 'categories', 'content_items', 'faqs', 'content_views'] as $table) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            if ($this->columnType($table, 'id') !== 'uuid') {
                continue;
            }

            DB::statement("ALTER TABLE {$table} ALTER COLUMN id DROP DEFAULT");
        }
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
