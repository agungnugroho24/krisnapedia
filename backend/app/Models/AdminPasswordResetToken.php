<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminPasswordResetToken extends Model
{
    public $timestamps = false;

    protected $table = 'admin_password_reset_tokens';
    protected $guarded = ['id'];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function adminUser(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class);
    }
}
