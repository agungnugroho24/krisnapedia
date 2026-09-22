<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('content_items') && Schema::hasColumn('content_items', 'sub_system_id')) {
            DB::table('content_items')->update(['sub_system_id' => null]);
        }

        if (Schema::hasTable('sub_systems')) {
            DB::table('sub_systems')->delete();

            foreach (config('whats_new.sub_systems', []) as $index => $name) {
                $slug = is_string($index) ? $index : Str::slug($name);
                DB::table('sub_systems')->insert([
                    'uuid' => (string) Str::uuid(),
                    'name' => $name,
                    'slug' => $slug,
                    'sort_order' => is_int($index) ? $index + 1 : count(DB::table('sub_systems')->get()) + 1,
                    'active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        if (!Schema::hasTable('whats_new_items')) {
            Schema::create('whats_new_items', function (Blueprint $table): void {
                $table->id();
                $table->uuid('uuid')->unique();
                $table->unsignedBigInteger('github_issue_id');
                $table->unsignedBigInteger('github_issue_number');
                $table->string('github_url', 500)->nullable();
                $table->foreignId('sub_system_id')->constrained('sub_systems')->cascadeOnDelete();
                $table->string('raw_title', 500);
                $table->string('public_title', 500);
                $table->text('summary')->nullable();
                $table->string('category', 80);
                $table->string('urgency', 80)->default('Informasi tambahan');
                $table->date('closed_at')->nullable();
                $table->unsignedSmallInteger('year')->nullable();
                $table->boolean('published')->default(false);
                $table->timestampTz('synced_at')->nullable();
                $table->timestampsTz();
                $table->unique(['github_issue_id', 'sub_system_id']);
                $table->index(['published', 'closed_at']);
                $table->index(['sub_system_id', 'year']);
                $table->index(['category', 'urgency']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('whats_new_items');
    }
};
