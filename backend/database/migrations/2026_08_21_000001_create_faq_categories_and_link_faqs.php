<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('faqs') && !Schema::hasColumn('faqs', 'faq_category_id')) {
            Schema::table('faqs', function (Blueprint $table): void {
                $table->foreignId('faq_category_id')->nullable()->after('category')->constrained('categories')->nullOnDelete();
            });
        }

        if (!Schema::hasTable('faqs') || !Schema::hasTable('categories')) {
            return;
        }

        $rows = DB::table('faqs')
            ->select(['id', 'category'])
            ->whereNotNull('category')
            ->get();

        $categoryMap = [];

        foreach ($rows as $row) {
            $name = trim((string) $row->category);
            if ($name === '') {
                continue;
            }

            if (!array_key_exists($name, $categoryMap)) {
                $existing = DB::table('categories')
                    ->where('content_type', 'faq')
                    ->where('name', $name)
                    ->first();

                if ($existing) {
                    $categoryMap[$name] = $existing->id;
                } else {
                    $categoryMap[$name] = DB::table('categories')->insertGetId([
                        'uuid' => (string) Str::uuid(),
                        'name' => $name,
                        'content_type' => 'faq',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            DB::table('faqs')
                ->where('id', $row->id)
                ->update(['faq_category_id' => $categoryMap[$name]]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('faqs') && Schema::hasColumn('faqs', 'faq_category_id')) {
            Schema::table('faqs', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('faq_category_id');
            });
        }
    }
};
