<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('content_items')) {
            return;
        }


        Schema::create('content_items', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('content_type');
            $table->string('title', 300);
            $table->string('slug', 120);
            $table->foreignUuid('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('category_text')->nullable();
            $table->string('sub_category')->nullable();
            $table->text('description');
            $table->jsonb('long_description')->default('[]');
            $table->text('cover_image_url')->nullable();
            $table->text('file_url')->nullable();
            $table->string('file_name')->nullable();
            $table->text('youtube_url')->nullable();
            $table->string('viewer')->default('pdf');
            $table->string('file_type')->nullable();
            $table->string('author')->nullable();
            $table->date('published_date')->useCurrent();
            $table->date('effective_date')->nullable();
            $table->string('version')->nullable();
            $table->unsignedInteger('pages')->nullable();
            $table->string('file_size')->nullable();
            $table->string('language')->default('Bahasa Indonesia');
            $table->string('read_time')->nullable();
            $table->jsonb('tags')->default('[]');
            $table->string('display_status')->default('Aktif');
            $table->string('regulation_status')->nullable();
            $table->string('jurisdiction')->nullable();
            $table->boolean('published')->default(true);
            $table->timestampsTz();
            $table->unique(['content_type', 'slug']);
            $table->index(['content_type', 'published', 'published_date']);
        });

        DB::statement("ALTER TABLE content_items ADD CONSTRAINT content_items_type_check CHECK (content_type IN ('insight','manual','regulation'))");
        DB::statement("ALTER TABLE content_items ADD CONSTRAINT content_items_viewer_check CHECK (viewer IN ('pdf','slides','image','video','web'))");
    }

    public function down(): void { Schema::dropIfExists('content_items'); }
};

