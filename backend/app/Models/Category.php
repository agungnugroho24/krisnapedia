<?php

namespace App\Models;

use App\Models\Concerns\SyncsPrimaryKeySequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Category extends Model
{
    use SyncsPrimaryKeySequence;

    public $incrementing = true;
    protected $keyType = 'int';
    protected $table = 'categories';
    protected $guarded = ['id'];
    protected $casts = ['content_type' => 'string'];

    protected static function booted(): void
    {
        static::creating(function (Category $category): void {
            if (!$category->uuid) {
                $category->uuid = (string) Str::uuid();
            }

            if (!$category->id) {
                self::syncPrimaryKeySequence('categories');
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'id';
    }

    public function subCategories(): HasMany
    {
        return $this->hasMany(SubCategory::class);
    }

    public function contentItems(): HasMany
    {
        return $this->hasMany(ContentItem::class);
    }

    public function faqItems(): HasMany
    {
        return $this->hasMany(Faq::class, 'faq_category_id');
    }
}
