<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class ContentItem extends Model
{
    public $incrementing = true;
    protected $keyType = 'int';
    protected $table = 'content_items';
    protected $guarded = ['id'];
    protected $appends = ['cover_preview_url', 'cover_thumbnail_url', 'file_preview_url'];
    protected $casts = ['long_description' => 'array', 'tags' => 'array', 'published' => 'boolean', 'published_date' => 'date', 'effective_date' => 'date', 'year' => 'integer'];

    protected static function booted(): void
    {
        static::creating(function (ContentItem $content): void {
            if (!$content->uuid) {
                $content->uuid = (string) Str::uuid();
            }

            if (!$content->id) {
                self::syncPrimaryKeySequence();
            }
        });
    }

    private static function syncPrimaryKeySequence(): void
    {
        $sequence = DB::selectOne("SELECT pg_get_serial_sequence('content_items', 'id') AS sequence_name");
        $sequenceName = $sequence->sequence_name ?? null;

        if (!$sequenceName) {
            return;
        }

        $maxId = DB::table('content_items')->max('id');
        if ($maxId === null) {
            DB::statement('SELECT setval(' . DB::getPdo()->quote($sequenceName) . ', 1, false)');
            return;
        }

        DB::statement('SELECT setval(' . DB::getPdo()->quote($sequenceName) . ', ' . ((int) $maxId) . ', true)');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function subCategoryItem(): BelongsTo
    {
        return $this->belongsTo(SubCategory::class, 'sub_category_id');
    }

    public function subSystem(): BelongsTo
    {
        return $this->belongsTo(SubSystem::class);
    }

    public function getRouteKeyName(): string
    {
        return 'id';
    }

    public function getCoverPreviewUrlAttribute(): ?string
    {
        if (!$this->cover_image_url) {
            return null;
        }

        return URL::temporarySignedRoute('api.storage.preview', now()->addMinutes(30), ['url' => $this->cover_image_url]);
    }

    public function getCoverThumbnailUrlAttribute(): ?string
    {
        if (!$this->cover_image_url) {
            return null;
        }

        return URL::temporarySignedRoute('api.storage.preview', now()->addMinutes(30), [
            'url' => $this->cover_image_url,
            'variant' => 'thumb',
        ]);
    }

    public function getFilePreviewUrlAttribute(): ?string
    {
        if (!$this->file_url) {
            return null;
        }

        return URL::temporarySignedRoute('api.storage.preview', now()->addMinutes(30), ['url' => $this->file_url]);
    }
}
