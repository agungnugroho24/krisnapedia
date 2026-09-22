<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\ContentItem;
use App\Models\SubCategory;
use Illuminate\Console\Command;

class BackfillContentRelations extends Command
{
    protected $signature = 'content:backfill-relations {--dry-run : Report changes without writing to the database}';

    protected $description = 'Backfill category_id and sub_category_id on content_items from legacy text fields.';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $cache = [];
        $stats = [
            'processed' => 0,
            'categories_resolved' => 0,
            'sub_categories_resolved' => 0,
            'skipped' => 0,
        ];

        ContentItem::query()
            ->orderBy('id')
            ->chunkById(100, function ($items) use (&$cache, &$stats, $dryRun): void {
                foreach ($items as $item) {
                    $stats['processed']++;

                    $contentType = $this->normalizeText($item->content_type);
                    $categoryId = $item->category_id;
                    $categoryText = $this->normalizeText($item->category_text);
                    $subCategoryText = $this->normalizeText($item->sub_category);
                    $dirty = false;

                    if (!$categoryId && $categoryText !== '') {
                        $category = $this->resolveCategory($contentType, $categoryText, $cache);
                        if ($category) {
                            $categoryId = $category->id;
                            $dirty = true;
                            $stats['categories_resolved']++;
                        }
                    }

                    if (!$categoryId || $subCategoryText === '') {
                        if (!$item->sub_category_id && $subCategoryText !== '') {
                            $stats['skipped']++;
                        }
                        continue;
                    }

                    $subCategory = $this->resolveSubCategory($categoryId, $contentType, $subCategoryText, $cache, $dryRun);
                    if (!$subCategory) {
                        $stats['skipped']++;
                        continue;
                    }

                    if ((int) $item->sub_category_id !== (int) $subCategory->id) {
                        $item->sub_category_id = $subCategory->id;
                        $dirty = true;
                        $stats['sub_categories_resolved']++;
                    }

                    if ($categoryId && (int) $item->category_id !== (int) $categoryId) {
                        $item->category_id = $categoryId;
                        $dirty = true;
                    }

                    if ($categoryId && $categoryText === '' && $subCategory->relationLoaded('category') && $subCategory->category) {
                        $item->category_text = $subCategory->category->name;
                        $dirty = true;
                    }

                    if (!$dryRun && $dirty) {
                        $item->save();
                    }
                }
            });

        $this->info(sprintf('Processed: %d', $stats['processed']));
        $this->info(sprintf('Categories resolved: %d', $stats['categories_resolved']));
        $this->info(sprintf('Sub-categories resolved: %d', $stats['sub_categories_resolved']));
        $this->info(sprintf('Skipped: %d', $stats['skipped']));

        $stats['category_types_resolved'] = $this->syncCategoryTypes($dryRun);
        $this->info(sprintf('Category types resolved: %d', $stats['category_types_resolved']));

        if ($dryRun) {
            $this->warn('Dry run only. No data was written.');
        }

        return self::SUCCESS;
    }

    private function syncCategoryTypes(bool $dryRun): int
    {
        $rows = ContentItem::query()
            ->selectRaw('category_id, min(content_type) as content_type')
            ->whereNotNull('category_id')
            ->groupBy('category_id')
            ->havingRaw('count(distinct content_type) = 1')
            ->get();

        $count = 0;

        foreach ($rows as $row) {
            if (!$row->category_id || !$row->content_type) {
                continue;
            }

            if ($dryRun) {
                $count++;
                continue;
            }

            $count += Category::query()
                ->where('id', $row->category_id)
                ->update(['content_type' => $row->content_type]);
        }

        return $count;
    }
    private function resolveCategory(?string $contentType, string $name, array &$cache): ?Category
    {
        $key = sprintf('category|%s|%s', $contentType ?: 'any', mb_strtolower($name));
        if (array_key_exists($key, $cache)) {
            return $cache[$key];
        }

        $query = Category::query()->where('name', $name);
        if ($contentType !== '') {
            $query->where(function ($builder) use ($contentType): void {
                $builder->where('content_type', $contentType)->orWhereNull('content_type');
            });
        }

        $category = $query->orderByRaw('content_type is null')->first();
        $cache[$key] = $category;

        return $category;
    }

    private function resolveSubCategory(int $categoryId, ?string $contentType, string $name, array &$cache, bool $dryRun): ?SubCategory
    {
        $key = sprintf('subcategory|%d|%s|%s', $categoryId, $contentType ?: 'any', mb_strtolower($name));
        if (array_key_exists($key, $cache)) {
            return $cache[$key];
        }

        $query = SubCategory::query()->with('category')->where('category_id', $categoryId)->where('name', $name);
        if ($contentType !== '') {
            $query->where(function ($builder) use ($contentType): void {
                $builder->where('content_type', $contentType)->orWhereNull('content_type');
            });
        }

        $subCategory = $query->orderByRaw('content_type is null')->first();
        if (!$subCategory && !$dryRun) {
            $subCategory = SubCategory::create([
                'category_id' => $categoryId,
                'content_type' => $contentType !== '' ? $contentType : null,
                'name' => $name,
            ])->load('category');
        }

        $cache[$key] = $subCategory;

        return $subCategory;
    }

    private function normalizeText(mixed $value): string
    {
        if (is_string($value)) {
            return trim($value);
        }

        if (is_int($value) || is_float($value) || is_bool($value)) {
            return trim((string) $value);
        }

        return '';
    }
}

