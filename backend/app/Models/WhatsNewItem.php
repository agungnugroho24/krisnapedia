<?php

namespace App\Models;

use App\Models\Concerns\SyncsPrimaryKeySequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class WhatsNewItem extends Model
{
    use SyncsPrimaryKeySequence;

    public $incrementing = true;
    protected $keyType = 'int';
    protected $table = 'whats_new_items';
    protected $guarded = ['id'];
    protected $casts = [
        'published' => 'boolean',
        'closed_at' => 'date',
        'synced_at' => 'datetime',
        'year' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (WhatsNewItem $item): void {
            if (!$item->uuid) {
                $item->uuid = (string) Str::uuid();
            }

            if (!$item->id) {
                self::syncPrimaryKeySequence('whats_new_items');
            }
        });
    }

    public function subSystem(): BelongsTo
    {
        return $this->belongsTo(SubSystem::class);
    }
}
