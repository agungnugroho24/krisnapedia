<?php

namespace App\Models;

use App\Models\Concerns\SyncsPrimaryKeySequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Faq extends Model
{
    use SyncsPrimaryKeySequence;

    public $incrementing = true;
    protected $keyType = 'int';
    protected $table = 'faqs';
    protected $guarded = ['id'];
    protected $casts = ['answer' => 'array', 'published' => 'boolean', 'faq_category_id' => 'integer'];

    protected static function booted(): void
    {
        static::creating(function (Faq $faq): void {
            if (!$faq->uuid) {
                $faq->uuid = (string) Str::uuid();
            }

            if (!$faq->id) {
                self::syncPrimaryKeySequence('faqs');
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'id';
    }

    public function faqCategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'faq_category_id');
    }
}
