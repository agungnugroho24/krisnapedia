<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('content_items')) {
            return;
        }

        if (!Schema::hasColumn('content_items', 'sub_category_id')) {
            Schema::table('content_items', function (Blueprint $table): void {
                $table->foreignId('sub_category_id')->nullable()->after('category_id')->constrained('sub_categories')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('content_items')) {
            return;
        }

        if (Schema::hasColumn('content_items', 'sub_category_id')) {
            Schema::table('content_items', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('sub_category_id');
            });
        }
    }
};
