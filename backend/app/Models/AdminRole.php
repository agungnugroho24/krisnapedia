<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdminRole extends Model
{
    protected $table = 'roles';
    protected $guarded = ['id'];

    public function users(): HasMany
    {
        return $this->hasMany(AdminUser::class, 'role_id');
    }
}