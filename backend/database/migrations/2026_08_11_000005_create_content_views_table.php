<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('content_views')) {
            return;
        }


        Schema::create('content_views', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('content_type');
            $table->foreignUuid('content_id')->nullable()->constrained('content_items')->cascadeOnDelete();
            $table->string('slug');
            $table->unsignedInteger('views')->default(0);
            $table->timestampTz('updated_at')->useCurrent();
            $table->unique(['content_type', 'slug']);
        });
    }

    public function down(): void { Schema::dropIfExists('content_views'); }
};

