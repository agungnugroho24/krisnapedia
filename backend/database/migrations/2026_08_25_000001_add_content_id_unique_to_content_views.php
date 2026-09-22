<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('content_views')) {
            return;
        }

        $constraints = collect(DB::select("select constraint_name from information_schema.table_constraints where table_schema = current_schema() and table_name = 'content_views'"))
            ->pluck('constraint_name')
            ->all();

        if (in_array('content_views_unique', $constraints, true)) {
            DB::statement('ALTER TABLE content_views DROP CONSTRAINT content_views_unique');
        }

        if (in_array('content_views_content_type_slug_unique', $constraints, true)) {
            DB::statement('ALTER TABLE content_views DROP CONSTRAINT content_views_content_type_slug_unique');
        }

        if (!in_array('content_views_type_content_id_unique', $constraints, true)) {
            DB::statement('ALTER TABLE content_views ADD CONSTRAINT content_views_type_content_id_unique UNIQUE (content_type, content_id)');
        }

        DB::statement('CREATE INDEX IF NOT EXISTS content_views_slug_idx ON content_views (slug)');
        DB::statement('CREATE INDEX IF NOT EXISTS content_views_type_content_id_idx ON content_views (content_type, content_id)');
    }

    public function down(): void
    {
        if (!Schema::hasTable('content_views')) {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS content_views_slug_idx');
        DB::statement('DROP INDEX IF EXISTS content_views_type_content_id_idx');
        DB::statement('ALTER TABLE content_views DROP CONSTRAINT IF EXISTS content_views_type_content_id_unique');
        DB::statement('ALTER TABLE content_views ADD CONSTRAINT content_views_unique UNIQUE (content_type, slug)');
    }
};