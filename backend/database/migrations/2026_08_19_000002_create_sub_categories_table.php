<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('sub_categories')) {
            return;
        }

        Schema::create('sub_categories', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->string('content_type')->nullable();
            $table->string('name');
            $table->timestampsTz();
            $table->unique(['category_id', 'content_type', 'name'], 'sub_categories_category_content_type_name_unique');
            $table->index(['content_type', 'name'], 'sub_categories_content_type_name_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sub_categories');
    }
};
