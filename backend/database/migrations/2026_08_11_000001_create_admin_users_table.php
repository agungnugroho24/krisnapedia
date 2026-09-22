<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('admin_users')) {
            return;
        }


        Schema::create('admin_users', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('email')->unique();
            $table->string('password_hash');
            $table->string('name');
            $table->string('role')->default('editor');
            $table->timestampsTz();
        });

        Schema::create('admin_tokens', function (Blueprint $table): void {
            $table->id();
            $table->foreignUuid('admin_user_id')->constrained('admin_users')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestampTz('expires_at')->nullable();
            $table->timestampTz('last_used_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_tokens');
        Schema::dropIfExists('admin_users');
    }
};

