<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminActivityLog extends Model
{
    protected $table = 'admin_activity_logs';
    protected $guarded = ['id'];
    protected $casts = [
        'changes' => 'array',
    ];

    public function adminUser(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'admin_user_id');
    }
}
