<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('admin_activity_logs')) {
            return;
        }

        Schema::create('admin_activity_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('admin_user_id')->nullable()->constrained('admin_users')->nullOnDelete();
            $table->string('action', 20);
            $table->string('entity_type', 80);
            $table->string('entity_id', 80)->nullable();
            $table->string('entity_name')->nullable();
            $table->jsonb('changes')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestampsTz();

            $table->index(['action', 'entity_type']);
            $table->index(['entity_type', 'entity_id']);
            $table->index(['admin_user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_activity_logs');
    }
};
