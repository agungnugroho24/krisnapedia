<?php

namespace App\Models;

use App\Models\Concerns\SyncsPrimaryKeySequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class AdminUser extends Model
{
    use SyncsPrimaryKeySequence;
    use Notifiable;

    public $incrementing = true;
    protected $keyType = 'int';
    protected $table = 'admin_users';
    protected $guarded = ['id'];
    protected $hidden = ['password_hash'];

    protected static function booted(): void
    {
        static::creating(function (AdminUser $user): void {
            if (!$user->uuid) {
                $user->uuid = (string) Str::uuid();
            }

            if (!$user->role) {
                $user->role = 'operator';
            }

            if (!$user->id) {
                self::syncPrimaryKeySequence('admin_users');
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'id';
    }

    public function tokens()
    {
        return $this->hasMany(AdminToken::class);
    }

    public function roleRecord(): BelongsTo
    {
        return $this->belongsTo(AdminRole::class, 'role_id');
    }
}