<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        foreach (['categories', 'content_items', 'faqs'] as $table) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            if (Schema::hasColumn($table, 'source_id')) {
                continue;
            }

            Schema::table($table, function (Blueprint $table): void {
                $table->string('source_id')->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['categories', 'content_items', 'faqs'] as $table) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            if (!Schema::hasColumn($table, 'source_id')) {
                continue;
            }

            Schema::table($table, function (Blueprint $table): void {
                $table->dropColumn('source_id');
            });
        }
    }
};
