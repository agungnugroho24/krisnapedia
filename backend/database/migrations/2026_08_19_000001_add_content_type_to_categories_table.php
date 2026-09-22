<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('categories')) {
            return;
        }

        if (!Schema::hasColumn('categories', 'content_type')) {
            Schema::table('categories', function (Blueprint $table): void {
                $table->string('content_type')->nullable()->after('name');
            });
        }

        DB::statement('ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_unique');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS categories_content_type_name_unique ON categories (content_type, name)');
    }

    public function down(): void
    {
        if (!Schema::hasTable('categories')) {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS categories_content_type_name_unique');
        DB::statement('ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_unique');
        DB::statement('ALTER TABLE categories ADD CONSTRAINT categories_name_unique UNIQUE (name)');

        if (Schema::hasColumn('categories', 'content_type')) {
            Schema::table('categories', function (Blueprint $table): void {
                $table->dropColumn('content_type');
            });
        }
    }
};
