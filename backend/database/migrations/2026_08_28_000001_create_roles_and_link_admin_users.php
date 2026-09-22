<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('roles')) {
            Schema::create('roles', function (Blueprint $table): void {
                $table->id();
                $table->string('slug')->unique();
                $table->string('name');
                $table->string('description')->nullable();
                $table->timestampsTz();
            });
        }

        if (Schema::hasTable('roles')) {
            DB::table('roles')->updateOrInsert(
                ['slug' => 'admin'],
                ['name' => 'Admin', 'description' => 'Akses penuh untuk administrasi studio', 'updated_at' => now(), 'created_at' => now()],
            );
            DB::table('roles')->updateOrInsert(
                ['slug' => 'operator'],
                ['name' => 'Operator', 'description' => 'Akses pengelolaan konten', 'updated_at' => now(), 'created_at' => now()],
            );
        }

        if (Schema::hasTable('admin_users')) {
            if (!Schema::hasColumn('admin_users', 'role_id')) {
                Schema::table('admin_users', function (Blueprint $table): void {
                    $table->foreignId('role_id')->nullable()->after('role')->constrained('roles')->restrictOnDelete();
                });
            }

            DB::table('admin_users')
                ->whereNull('role')
                ->update(['role' => 'operator']);

            $operatorRoleId = DB::table('roles')->where('slug', 'operator')->value('id');
            $adminRoleId = DB::table('roles')->where('slug', 'admin')->value('id');

            if ($operatorRoleId && $adminRoleId) {
                DB::table('admin_users')
                    ->where('role', 'admin')
                    ->update(['role_id' => $adminRoleId]);

                DB::table('admin_users')
                    ->where(function ($query): void {
                        $query->whereNull('role')->orWhere('role', '!=', 'admin');
                    })
                    ->update(['role' => 'operator', 'role_id' => $operatorRoleId]);

                DB::statement('ALTER TABLE admin_users ALTER COLUMN role_id SET NOT NULL');
            }

            DB::statement("ALTER TABLE admin_users ALTER COLUMN role SET DEFAULT 'operator'");
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('admin_users') && Schema::hasColumn('admin_users', 'role_id')) {
            Schema::table('admin_users', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('role_id');
            });
        }

        Schema::dropIfExists('roles');
    }
};