<?php

namespace App\Models;

use App\Models\Concerns\SyncsPrimaryKeySequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class SubSystem extends Model
{
    use SyncsPrimaryKeySequence;

    public $incrementing = true;
    protected $keyType = 'int';
    protected $table = 'sub_systems';
    protected $guarded = ['id'];
    protected $casts = ['active' => 'boolean', 'sort_order' => 'integer'];

    protected static function booted(): void
    {
        static::creating(function (SubSystem $subSystem): void {
            if (!$subSystem->uuid) {
                $subSystem->uuid = (string) Str::uuid();
            }

            if (!$subSystem->slug && $subSystem->name) {
                $subSystem->slug = Str::slug($subSystem->name);
            }

            if (!$subSystem->id) {
                self::syncPrimaryKeySequence('sub_systems');
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'id';
    }

    public function contentItems(): HasMany
    {
        return $this->hasMany(ContentItem::class);
    }
}
