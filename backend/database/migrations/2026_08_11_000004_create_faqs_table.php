<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('faqs')) {
            return;
        }


        Schema::create('faqs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('question', 300);
            $table->jsonb('answer')->default('[]');
            $table->string('category')->nullable();
            $table->integer('order_index')->default(0);
            $table->boolean('published')->default(true);
            $table->timestampsTz();
            $table->index(['order_index', 'created_at']);
        });
    }

    public function down(): void { Schema::dropIfExists('faqs'); }
};

