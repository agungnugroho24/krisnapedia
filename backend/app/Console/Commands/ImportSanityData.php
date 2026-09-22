<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\ContentItem;
use App\Models\Faq;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImportSanityData extends Command
{
    protected $signature = 'sanity:import
        {--wipe : Clear local content tables before importing}
        {--download-assets : Download Sanity files and images into local storage}';

    protected $description = 'Import KRISNApedia content from Sanity into local PostgreSQL and storage.';

    private const SANITY_PROJECT_ID = 'l6d1o9wo';
    private const SANITY_DATASET = 'production';
    private const SANITY_API_VERSION = 'v2026-06-09';

    public function handle(): int
    {
        $this->info('Connecting to Sanity...');

        if ($this->option('wipe')) {
            $this->wipeLocalContent();
        }

        $categories = $this->importCategories();
        $counts = [
            'insight' => $this->importContentType('insight', $categories),
            'manual' => $this->importContentType('manual', $categories),
            'regulation' => $this->importContentType('regulation', $categories),
            'faq' => $this->importFaqs(),
        ];

        $this->newLine();
        $this->info('Import complete.');
        $this->line(sprintf('Categories: %d', $categories->count()));
        $this->line(sprintf('Insights: %d', $counts['insight']));
        $this->line(sprintf('Manuals: %d', $counts['manual']));
        $this->line(sprintf('Regulations: %d', $counts['regulation']));
        $this->line(sprintf('FAQs: %d', $counts['faq']));

        $typedCategories = $this->syncCategoryContentTypes();
        $this->line(sprintf('Category types synced: %d', $typedCategories));

        return self::SUCCESS;
    }

    private function wipeLocalContent(): void
    {
        $this->warn('Wiping local content tables before import...');

        DB::statement('TRUNCATE TABLE content_views, content_items, faqs, categories RESTART IDENTITY CASCADE');
    }

    private function importCategories()
    {
        $this->line('Importing categories...');

        $docs = $this->sanityQuery('*[_type == "category"] | order(title asc) { _id, title }');
        $categoryMap = collect();

        foreach ($docs as $doc) {
            $name = $this->stringValue($doc['title'] ?? null);
            if ($name === '') {
                continue;
            }

            $category = Category::query()
                ->where('source_id', $doc['_id'] ?? null)
                ->orWhere('name', $name)
                ->first();

            if (!$category) {
                $category = new Category();
            }

            $category->source_id = $doc['_id'] ?? $category->source_id;
            $category->name = $name;
            $category->save();

            $categoryMap->put($doc['_id'], $category);
        }

        return $categoryMap;
    }

    private function importContentType(string $sanityType, $categories): int
    {
        $this->line(sprintf('Importing %s...', $sanityType));

        $docs = $this->sanityQuery($this->contentQuery($sanityType));
        $count = 0;

        foreach ($docs as $doc) {
            $sourceId = $this->stringValue($doc['_id'] ?? null);
            $slug = $this->stringValue($doc['slug'] ?? null);
            $title = $this->stringValue($doc['title'] ?? null);

            if ($sourceId === '' || $slug === '' || $title === '') {
                continue;
            }

            $categoryId = $this->resolveCategoryId($doc, $categories);
            $categoryText = $this->stringValue($doc['category'] ?? null);
            $content = [
                'content_type' => $sanityType,
                'source_id' => $sourceId,
                'title' => $title,
                'slug' => $slug,
                'category_id' => $categoryId,
                'category_text' => $categoryText !== '' ? $categoryText : null,
                'sub_category' => $this->stringValue($doc['subCategory'] ?? null) ?: null,
                'description' => $this->stringValue($doc['description'] ?? null),
                'long_description' => $this->arrayValue($doc['longDescription'] ?? null),
                'youtube_url' => $this->stringValue($doc['youtubeUrl'] ?? null) ?: null,
                'viewer' => $this->normalizeViewer($sanityType, $doc),
                'file_type' => $this->stringValue($doc['fileType'] ?? null) ?: null,
                'author' => $this->stringValue($doc['author'] ?? null) ?: null,
                'published_date' => $this->dateValue($doc['date'] ?? null),
                'effective_date' => $this->dateValue($doc['effectiveDate'] ?? null),
                'version' => $this->stringValue($doc['version'] ?? null) ?: null,
                'pages' => $this->integerValue($doc['pages'] ?? null),
                'file_size' => $this->stringValue($doc['fileSize'] ?? null) ?: null,
                'language' => $this->stringValue($doc['language'] ?? null) ?: 'Bahasa Indonesia',
                'read_time' => $this->stringValue($doc['readTime'] ?? null) ?: null,
                'tags' => $this->stringArrayValue($doc['tags'] ?? null),
                'display_status' => $this->stringValue($doc['status'] ?? null) ?: 'Aktif',
                'regulation_status' => $this->stringValue($doc['regulasiStatus'] ?? null) ?: null,
                'jurisdiction' => $this->stringValue($doc['jurisdiction'] ?? null) ?: null,
                'published' => (bool) ($doc['published'] ?? true),
            ];

            if (true) {
                $content['cover_image_url'] = $this->downloadAsset(
                    $doc['coverImage']['asset']['url'] ?? null,
                    sprintf('sanity/%s/%s/cover', $sanityType, $slug),
                    $doc['coverImage']['asset']['originalFilename'] ?? null,
                );

                $content['file_url'] = $this->downloadAsset(
                    $doc['file']['asset']['url'] ?? null,
                    sprintf('sanity/%s/%s/file', $sanityType, $slug),
                    $doc['file']['asset']['originalFilename'] ?? null,
                );

                $content['file_name'] = $this->stringValue($doc['file']['asset']['originalFilename'] ?? null) ?: null;
            }

            $model = ContentItem::query()
                ->where('source_id', $sourceId)
                ->orWhere(function ($query) use ($sanityType, $slug): void {
                    $query->where('content_type', $sanityType)->where('slug', $slug);
                })
                ->first();

            if (!$model) {
                $model = new ContentItem();
            }

            $model->fill($content);
            $model->save();
            $count++;
        }

        return $count;
    }

    private function importFaqs(): int
    {
        $this->line('Importing faqs...');

        $docs = $this->sanityQuery('*[_type == "faq"] | order(orderIndex asc, _createdAt asc) { _id, question, answer, category, orderIndex, published }');
        $count = 0;

        foreach ($docs as $doc) {
            $sourceId = $this->stringValue($doc['_id'] ?? null);
            $question = $this->stringValue($doc['question'] ?? null);

            if ($sourceId === '' || $question === '') {
                continue;
            }

            $faq = Faq::query()
                ->where('source_id', $sourceId)
                ->orWhere('question', $question)
                ->first();

            if (!$faq) {
                $faq = new Faq();
            }

            $faq->source_id = $sourceId;
            $faq->question = $question;
            $faq->answer = $this->arrayValue($doc['answer'] ?? null);
            $faq->category = $this->stringValue($doc['category'] ?? null) ?: null;
            $faq->order_index = $this->integerValue($doc['orderIndex'] ?? null) ?? 0;
            $faq->published = (bool) ($doc['published'] ?? true);
            $faq->save();
            $count++;
        }

        return $count;
    }

    private function syncCategoryContentTypes(): int
    {
        $rows = DB::table('content_items')
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

            $count += Category::query()
                ->where('id', $row->category_id)
                ->update(['content_type' => $row->content_type]);
        }

        return $count;
    }
    private function contentQuery(string $sanityType): string
    {
        $projection = <<<'GROQ'
_id,
title,
"slug": slug.current,
"categoryId": category._ref,
"category": category->title,
subCategory,
description,
longDescription,
coverImage{asset->{_ref, url, originalFilename, extension, mimeType, size}},
file{asset->{_ref, url, originalFilename, extension, mimeType, size}},
youtubeUrl,
viewer,
fileType,
author,
"date": coalesce(date, _createdAt),
pages,
fileSize,
language,
readTime,
tags,
status,
published,
version,
jurisdiction,
effectiveDate,
regulasiStatus
GROQ;

        return sprintf('*[_type == "%s"] | order(date desc, _createdAt desc) { %s }', $sanityType, $projection);
    }

    private function sanityQuery(string $query): array
    {
        $url = sprintf(
            'https://%s.api.sanity.io/%s/data/query/%s',
            self::SANITY_PROJECT_ID,
            self::SANITY_API_VERSION,
            self::SANITY_DATASET,
        );

        $response = Http::retry(3, 500)
            ->timeout(120)
            ->acceptJson()
            ->get($url, ['query' => $query])
            ->throw()
            ->json();

        return $response['result'] ?? [];
    }

    private function resolveCategoryId(array $doc, $categories): ?int
    {
        $categoryId = $this->stringValue($doc['categoryId'] ?? null);
        if ($categoryId !== '' && $categories->has($categoryId)) {
            return $categories->get($categoryId)->id;
        }

        $categoryText = $this->stringValue($doc['category'] ?? null);
        if ($categoryText === '') {
            return null;
        }

        $category = Category::query()->where('name', $categoryText)->first();
        return $category?->id;
    }

    private function downloadAsset(?string $url, string $directory, ?string $originalFilename): ?string
    {
        if (!$url) {
            return null;
        }

        $response = Http::retry(3, 500)
            ->timeout(240)
            ->get($url)
            ->throw();

        $filename = $this->safeFilename($originalFilename ?? basename(parse_url($url, PHP_URL_PATH) ?? '') ?: 'asset');
        $extension = $this->extensionFromFilename($filename) ?: $this->extensionFromUrl($url) ?: 'bin';
        $base = pathinfo($filename, PATHINFO_FILENAME) ?: 'asset';
        $storedPath = trim($directory, '/').'/'.Str::slug($base ?: 'asset').'-'.substr(hash('sha1', $url), 0, 12).'.'.$extension;

        Storage::disk('public')->put($storedPath, $response->body());

        return Storage::disk('public')->url($storedPath);
    }

    private function normalizeViewer(string $sanityType, array $doc): string
    {
        $viewer = strtolower($this->stringValue($doc['viewer'] ?? null));
        if (in_array($viewer, ['pdf', 'slides', 'image', 'video', 'web'], true)) {
            return $viewer;
        }

        if ($sanityType === 'regulation') {
            return 'pdf';
        }

        if ($this->stringValue($doc['youtubeUrl'] ?? null) !== '') {
            return 'video';
        }

        $fileUrl = $this->stringValue($doc['file']['asset']['url'] ?? null);
        if ($fileUrl !== '') {
            $extension = strtolower($this->extensionFromUrl($fileUrl));
            if (in_array($extension, ['ppt', 'pptx', 'key', 'odp'], true)) {
                return 'slides';
            }
            if (in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'], true)) {
                return 'image';
            }
        }

        return 'pdf';
    }

    private function stringValue(mixed $value): string
    {
        if (is_string($value)) {
            return trim($value);
        }

        if (is_int($value) || is_float($value) || is_bool($value)) {
            return trim((string) $value);
        }

        return '';
    }

    private function integerValue(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value;
        }

        if (is_string($value) && is_numeric($value)) {
            return (int) $value;
        }

        return null;
    }

    private function dateValue(mixed $value): ?string
    {
        $text = $this->stringValue($value);
        if ($text === '') {
            return null;
        }

        try {
            return Carbon::parse($text)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    private function stringArrayValue(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }

        return array_values(array_filter(array_map(fn ($item) => $this->stringValue($item), $value)));
    }

    private function arrayValue(mixed $value): array
    {
        return is_array($value) ? $value : [];
    }

    private function safeFilename(string $filename): string
    {
        $filename = trim($filename);
        if ($filename === '') {
            return 'asset.bin';
        }

        $extension = $this->extensionFromFilename($filename);
        $base = $extension !== '' ? pathinfo($filename, PATHINFO_FILENAME) : $filename;
        $slug = Str::slug((string) $base);

        if ($slug === '') {
            $slug = 'asset';
        }

        return $extension !== '' ? $slug . '.' . $extension : $slug . '.bin';
    }

    private function extensionFromFilename(string $filename): string
    {
        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        return is_string($extension) ? strtolower($extension) : '';
    }

    private function extensionFromUrl(string $url): string
    {
        $path = parse_url($url, PHP_URL_PATH) ?: '';
        $extension = pathinfo($path, PATHINFO_EXTENSION);
        return is_string($extension) ? strtolower($extension) : '';
    }
}


