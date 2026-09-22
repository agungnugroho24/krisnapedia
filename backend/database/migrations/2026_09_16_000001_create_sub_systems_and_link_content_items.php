<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('sub_systems')) {
            Schema::create('sub_systems', function (Blueprint $table): void {
                $table->id();
                $table->uuid('uuid')->unique();
                $table->string('name', 150);
                $table->string('slug', 170)->unique();
                $table->unsignedInteger('sort_order')->default(0);
                $table->boolean('active')->default(true);
                $table->timestampsTz();
                $table->unique('name');
                $table->index(['active', 'sort_order', 'name']);
            });
        }

        $defaultSubSystems = [
            'RKP',
            'Renja K/L',
            'Renja Perangkat Daerah',
            'DAK Fisik',
            'DAK Nonfisik',
            'Pagu Indikatif',
            'Prioritas Nasional',
            'Tagging Anggaran',
            'e-Musrenbang',
            'Monev',
            'Data Referensi',
            'PKPN',
        ];

        foreach ($defaultSubSystems as $index => $name) {
            DB::table('sub_systems')->updateOrInsert(
                ['slug' => Str::slug($name)],
                [
                    'uuid' => (string) Str::uuid(),
                    'name' => $name,
                    'sort_order' => $index + 1,
                    'active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );
        }

        if (Schema::hasTable('content_items')) {
            Schema::table('content_items', function (Blueprint $table): void {
                if (!Schema::hasColumn('content_items', 'sub_system_id')) {
                    $table->foreignId('sub_system_id')->nullable()->after('sub_category_id')->constrained('sub_systems')->nullOnDelete();
                }

                if (!Schema::hasColumn('content_items', 'year')) {
                    $table->unsignedSmallInteger('year')->nullable()->after('sub_system_id');
                }
            });

            DB::statement('CREATE INDEX IF NOT EXISTS content_items_sub_system_year_index ON content_items (sub_system_id, year)');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('content_items')) {
            DB::statement('DROP INDEX IF EXISTS content_items_sub_system_year_index');

            Schema::table('content_items', function (Blueprint $table): void {
                if (Schema::hasColumn('content_items', 'sub_system_id')) {
                    $table->dropConstrainedForeignId('sub_system_id');
                }

                if (Schema::hasColumn('content_items', 'year')) {
                    $table->dropColumn('year');
                }
            });
        }

        Schema::dropIfExists('sub_systems');
    }
};
