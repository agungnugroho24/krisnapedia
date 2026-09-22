<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('admin_password_reset_tokens')) {
            return;
        }

        Schema::create('admin_password_reset_tokens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('admin_user_id')->constrained('admin_users')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestampTz('expires_at');
            $table->timestampTz('used_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['admin_user_id', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_password_reset_tokens');
    }
};
