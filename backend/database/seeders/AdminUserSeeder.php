<?php

namespace Database\Seeders;

use App\Models\AdminRole;
use App\Models\AdminUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');
        if (!$email || !$password) return;

        $adminRole = AdminRole::firstOrCreate(
            ['slug' => 'admin'],
            ['name' => 'Admin', 'description' => 'Akses penuh untuk administrasi studio'],
        );

        AdminRole::firstOrCreate(
            ['slug' => 'operator'],
            ['name' => 'Operator', 'description' => 'Akses pengelolaan konten'],
        );

        AdminUser::updateOrCreate(
            ['email' => $email],
            [
                'name' => env('ADMIN_NAME', 'KRISNApedia Admin'),
                'password_hash' => Hash::make($password),
                'role' => 'admin',
                'role_id' => $adminRole->id,
            ],
        );
    }
}