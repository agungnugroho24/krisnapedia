<?php

namespace App\Models;

use App\Models\Concerns\SyncsPrimaryKeySequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class SubCategory extends Model
{
    use SyncsPrimaryKeySequence;

    public $incrementing = true;
    protected $keyType = 'int';
    protected $table = 'sub_categories';
    protected $guarded = ['id'];
    protected $casts = ['content_type' => 'string'];

    protected static function booted(): void
    {
        static::creating(function (SubCategory $subCategory): void {
            if (!$subCategory->uuid) {
                $subCategory->uuid = (string) Str::uuid();
            }

            if (!$subCategory->id) {
                self::syncPrimaryKeySequence('sub_categories');
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'id';
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function contentItems(): HasMany
    {
        return $this->hasMany(ContentItem::class);
    }
}