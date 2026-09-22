<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminToken extends Model
{
    public $timestamps = false;
    protected $table = 'admin_tokens';
    protected $guarded = ['id'];
    protected $casts = ['last_used_at' => 'datetime', 'created_at' => 'datetime', 'expires_at' => 'datetime'];

    public function adminUser(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class);
    }
}