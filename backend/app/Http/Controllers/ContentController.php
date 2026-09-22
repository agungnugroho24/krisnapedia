<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\ContentItem;
use App\Models\SubCategory;
use App\Models\SubSystem;
use App\Services\AdminActivityLogService;
use App\Services\PresentationPreviewService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ContentController extends Controller
{
    public function __construct(
        private readonly PresentationPreviewService $presentationPreviewService,
    ) {
    }
    private function type(Request $request): string
    {
        $type = $request->route('content_type');

        if (!$type) {
            $type = match ($request->segment(3)) {
                'insights' => 'insight',
                'manuals' => 'manual',
                'regulations' => 'regulation',
                default => null,
            };
        }

        abort_unless($type, 404);

        return $type;
    }

    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:200'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'include_unpublished' => ['nullable', 'boolean'],
            'year' => ['nullable', 'integer', 'min:1990', 'max:2100'],
            'sub_system_id' => ['nullable', 'integer', 'exists:sub_systems,id'],
        ]);

        $q = ContentItem::with(['category', 'subCategoryItem', 'subSystem'])->where('content_type', $this->type($request));
        $includeUnpublished = (bool) ($filters['include_unpublished'] ?? false);
        $search = trim((string) ($filters['search'] ?? ''));

        if (!$request->attributes->has('admin_user') && !$includeUnpublished) {
            $q->where('published', true);
        }

        if ($search !== '') {
            $like = '%' . $search . '%';
            $q->where(function ($query) use ($like): void {
                $query->where('title', 'like', $like)
                    ->orWhere('slug', 'like', $like)
                    ->orWhere('category_text', 'like', $like)
                    ->orWhere('sub_category', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhere('author', 'like', $like)
                    ->orWhere('regulation_status', 'like', $like)
                    ->orWhere('jurisdiction', 'like', $like)
                    ->orWhere('version', 'like', $like)
                    ->orWhereHas('category', fn ($category) => $category->where('name', 'like', $like))
                    ->orWhereHas('subCategoryItem', fn ($subCategory) => $subCategory->where('name', 'like', $like));
            });
        }

        if (isset($filters['year'])) {
            $q->where('year', (int) $filters['year']);
        }

        if (isset($filters['sub_system_id'])) {
            $q->where('sub_system_id', (int) $filters['sub_system_id']);
        }

        return ['data' => $q->orderByDesc('id')->paginate((int) ($filters['per_page'] ?? 15))];
    }

    public function show(Request $request, ContentItem $content)
    {
        abort_unless($content->content_type === $this->type($request), 404);

        return ['data' => $content->load(['category', 'subCategoryItem', 'subSystem'])];
    }

    public function previewAsset(Request $request)
    {
        $validated = $request->validate([
            'url' => ['required', 'url'],
            'variant' => ['nullable', 'in:original,thumb'],
        ]);

        $path = $this->storedPathFromUrl($validated['url']);
        abort_unless($path && Storage::disk('public')->exists($path), 404);

        if (($validated['variant'] ?? 'original') === 'thumb') {
            $thumbnailPath = $this->thumbnailPathFromPath($path);
            if ($thumbnailPath && !Storage::disk('public')->exists($thumbnailPath) && $this->isImagePath($path)) {
                $this->generateThumbnail($path, $thumbnailPath);
            }

            if ($thumbnailPath && Storage::disk('public')->exists($thumbnailPath)) {
                return Storage::disk('public')->response($thumbnailPath);
            }
        }

        if ($this->presentationPreviewService->isPresentationPath($path)) {
            try {
                $previewPath = $this->presentationPreviewService->ensurePreviewPdf($path);
                abort_unless(Storage::disk('public')->exists($previewPath), 404);

                return Storage::disk('public')->response($previewPath);
            } catch (\Throwable $e) {
                report($e);

                return response()->make(
                    $this->presentationPreviewFallbackHtml($validated['url']),
                    200,
                    ['Content-Type' => 'text/html; charset=UTF-8'],
                );
            }
        }

        return Storage::disk('public')->response($path);
    }

    private function presentationPreviewFallbackHtml(string $downloadUrl): string
    {
        $safeUrl = e($downloadUrl);
    }

    public function store(Request $request)
    {
        $data = $this->buildData($request);
        $content = ContentItem::create($data);
        $this->recordActivity($request, 'create', $content, null, $this->contentSnapshot($content->load(['category', 'subCategoryItem', 'subSystem'])));

        return response()->json(['data' => $content], 201);
    }

    public function update(Request $request, ContentItem $content)
    {
        abort_unless($content->content_type === $this->type($request), 404);

        $before = $this->contentSnapshot($content->loadMissing(['category', 'subCategoryItem', 'subSystem']));
        $data = $this->buildData($request, $content);
        $content->update($data);
        $updated = $content->fresh()->load(['category', 'subCategoryItem', 'subSystem']);
        $this->recordActivity($request, 'update', $updated, $before, $this->contentSnapshot($updated));

        return ['data' => $updated];
    }

    public function destroy(Request $request, ContentItem $content)
    {
        abort_unless($content->content_type === $this->type($request), 404);

        $before = $this->contentSnapshot($content->loadMissing(['category', 'subCategoryItem', 'subSystem']));
        $this->deleteStoredAsset($content->cover_image_url);
        $this->deleteStoredAsset($content->file_url);
        $content->delete();
        $this->recordActivity($request, 'delete', $content, $before, null);

        return response()->noContent();
    }

    private function buildData(Request $request, ?ContentItem $content = null): array
    {
        $this->normalizePublishedInput($request);

        $validated = $this->validateData($request, $content !== null);
        $type = $this->type($request);
        $slug = $this->sanitizeSlug($validated['slug'] ?? $content?->slug ?? '');

        $categoryId = $validated['category_id'] ?? $content?->category_id;
        $categoryText = $this->sanitizeTextField($validated['category_text'] ?? $content?->category_text);
        $subCategoryId = $validated['sub_category_id'] ?? $content?->sub_category_id;
        $subCategoryText = $this->sanitizeTextField($validated['sub_category'] ?? $content?->sub_category);
        $subSystemId = $validated['sub_system_id'] ?? $content?->sub_system_id;
        $category = null;

        if ($categoryId) {
            $category = Category::query()->find($categoryId);
            if (!$category) {
                throw ValidationException::withMessages(['category_id' => ['Category tidak ditemukan.']]);
            }

            if ($category->content_type !== null && $category->content_type !== $type) {
                throw ValidationException::withMessages(['category_id' => ['Category harus sesuai dengan content type.']]);
            }

            if (!$categoryText) {
                $categoryText = $this->sanitizeTextField($category->name);
            }
        }

        if ($subCategoryId) {
            $subCategory = SubCategory::query()->with('category')->find($subCategoryId);
            if (!$subCategory) {
                throw ValidationException::withMessages(['sub_category_id' => ['Sub-category tidak ditemukan.']]);
            }

            if ($subCategory->content_type !== null && $subCategory->content_type !== $type) {
                throw ValidationException::withMessages(['sub_category_id' => ['Sub-category harus sesuai dengan content type.']]);
            }

            if ($categoryId && (int) $subCategory->category_id !== (int) $categoryId) {
                throw ValidationException::withMessages(['sub_category_id' => ['Sub-category harus berada di dalam category yang sama.']]);
            }

            $categoryId = $categoryId ?? $subCategory->category_id;
            $category = $category ?? $subCategory->category;
            $subCategoryText = $this->sanitizeTextField($subCategory->name);

            if (!$categoryText && $subCategory->category) {
                $categoryText = $this->sanitizeTextField($subCategory->category->name);
            }
        } elseif (is_string($subCategoryText) && $subCategoryText !== '' && $categoryId) {
            $matchedSubCategory = SubCategory::query()
                ->where('category_id', $categoryId)
                ->where('name', $subCategoryText)
                ->first();

            if ($matchedSubCategory) {
                if ($matchedSubCategory->content_type !== null && $matchedSubCategory->content_type !== $type) {
                    throw ValidationException::withMessages(['sub_category_id' => ['Sub-category harus sesuai dengan content type.']]);
                }

                $subCategoryId = $matchedSubCategory->id;
                $subCategoryText = $this->sanitizeTextField($matchedSubCategory->name);
            }
        }

        if ($category && $category->content_type !== null && $category->content_type !== $type) {
            throw ValidationException::withMessages(['category_id' => ['Category harus sesuai dengan content type.']]);
        }

        if ($categoryId && !$categoryText && $category) {
            $categoryText = $this->sanitizeTextField($category->name);
        }

        if ($subSystemId) {
            $subSystem = SubSystem::query()->find($subSystemId);
            if (!$subSystem) {
                throw ValidationException::withMessages(['sub_system_id' => ['Sub-sistem tidak ditemukan.']]);
            }
        }

        $youtubeUrl = array_key_exists('youtube_url', $validated)
            ? $this->normalizeHttpUrl($this->normalizeNullableString($validated['youtube_url']))
            : $content?->youtube_url;
        $fileType = $youtubeUrl
            ? 'VIDEO'
            : $this->sanitizeTextField($validated['file_type'] ?? $content?->file_type);

        $data = [
            'content_type' => $type,
            'title' => $this->sanitizeTextField($validated['title'] ?? $content?->title),
            'slug' => $slug !== '' ? $slug : $content?->slug,
            'category_id' => $categoryId,
            'category_text' => $categoryText,
            'sub_category_id' => $subCategoryId,
            'sub_category' => $subCategoryText,
            'sub_system_id' => $subSystemId,
            'year' => $validated['year'] ?? $content?->year,
            'description' => $this->sanitizeTextField($validated['description'] ?? $content?->description),
            'long_description' => $this->parseBlocks($request->input('long_description')),
            'youtube_url' => $youtubeUrl,
            'video_duration' => $this->sanitizeTextField($validated['video_duration'] ?? $content?->video_duration),
            'viewer' => $validated['viewer'] ?? $content?->viewer ?? 'pdf',
            'file_type' => $fileType !== null ? strtoupper($fileType) : null,
            'author' => $this->sanitizeTextField($validated['author'] ?? $content?->author),
            'published_date' => $validated['published_date'] ?? $content?->published_date,
            'effective_date' => $validated['effective_date'] ?? $content?->effective_date,
            'version' => $this->sanitizeTextField($validated['version'] ?? $content?->version),
            'pages' => $validated['pages'] ?? $content?->pages,
            'file_size' => $this->sanitizeTextField($validated['file_size'] ?? $content?->file_size),
            'language' => $this->sanitizeTextField($validated['language'] ?? $content?->language ?? 'Bahasa Indonesia'),
            'read_time' => $this->sanitizeTextField($validated['read_time'] ?? $content?->read_time),
            'tags' => $this->parseTags($request->input('tags')),
            'display_status' => $this->sanitizeTextField($validated['display_status'] ?? $content?->display_status ?? 'Aktif'),
            'regulation_status' => $this->sanitizeTextField($validated['regulation_status'] ?? $content?->regulation_status),
            'jurisdiction' => $this->sanitizeTextField($validated['jurisdiction'] ?? $content?->jurisdiction),
            'published' => $request->has('published') ? $request->boolean('published') : ($content?->published ?? true),
        ];

        $data['cover_image_url'] = $this->resolveAssetUrl(
            $request,
            'cover_image',
            'cover_image_url',
            $content?->cover_image_url,
            sprintf('content/%s/%s/cover', $type, Str::slug($data['slug'] ?? $slug ?: 'item')),
        );

        [$fileUrl, $fileName] = $this->resolveFileAsset(
            $request,
            'file',
            $content?->file_url,
            $content?->file_name,
            sprintf('content/%s/%s/file', $type, Str::slug($data['slug'] ?? $slug ?: 'item')),
        );

        $data['file_url'] = $fileUrl;
        $data['file_name'] = $fileName;

        return $data;
    }

    private function normalizePublishedInput(Request $request): void
    {
        if (!$request->exists('published')) {
            return;
        }

        $request->merge([
            'published' => $request->boolean('published'),
        ]);
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function sanitizeTextField(mixed $value): ?string
    {
        $normalized = $this->normalizeNullableString($value);
        if ($normalized === null) {
            return null;
        }

        $normalized = preg_replace('/[\x00-\x1F\x7F]/u', '', $normalized) ?? $normalized;
        $normalized = strip_tags($normalized);

        return trim($normalized) === '' ? null : trim($normalized);
    }

    private function sanitizeSlug(mixed $value): string
    {
        $normalized = $this->normalizeNullableString($value) ?? '';
        $normalized = preg_replace('/[\x00-\x1F\x7F]/u', '', $normalized) ?? $normalized;
        $normalized = Str::slug($normalized, '-');

        return trim($normalized, '-');
    }

    private function normalizeHttpUrl(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        if (!filter_var($trimmed, FILTER_VALIDATE_URL)) {
            return null;
        }

        $scheme = strtolower((string) parse_url($trimmed, PHP_URL_SCHEME));
        if (!in_array($scheme, ['http', 'https'], true)) {
            return null;
        }

        return $trimmed;
    }

    private function validateData(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$required, 'string', 'max:300'],
            'slug' => [$required, 'string', 'max:120'],
            'description' => [$required, 'string', 'max:5000'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'category_text' => ['nullable', 'string', 'max:255'],
            'sub_category_id' => ['nullable', 'integer', 'exists:sub_categories,id'],
            'sub_category' => ['nullable', 'string', 'max:255'],
            'sub_system_id' => ['nullable', 'integer', 'exists:sub_systems,id'],
            'year' => ['nullable', 'integer', 'min:1990', 'max:2100'],
            'long_description' => ['nullable'],
            'cover_image' => ['nullable', 'file', 'image', 'max:500'],
            'cover_image_url' => ['nullable', 'url'],
            'remove_cover_image' => ['nullable', 'boolean'],
            'file' => ['nullable', 'file', 'mimes:pdf', 'max:30720'],
            'file_url' => ['nullable', 'url'],
            'remove_file' => ['nullable', 'boolean'],
            'file_name' => ['nullable', 'string', 'max:255'],
            'youtube_url' => ['nullable', 'url'],
            'video_duration' => ['nullable', 'string', 'max:50'],
            'viewer' => ['nullable', 'in:pdf,image,video,web'],
            'file_type' => ['nullable', 'string', 'max:100'],
            'author' => ['nullable', 'string', 'max:255'],
            'published_date' => ['nullable', 'date'],
            'effective_date' => ['nullable', 'date'],
            'version' => ['nullable', 'string', 'max:100'],
            'pages' => ['nullable', 'integer', 'min:0'],
            'file_size' => ['nullable', 'string', 'max:50'],
            'language' => ['nullable', 'string', 'max:80'],
            'read_time' => ['nullable', 'string', 'max:50'],
            'tags' => ['nullable'],
            'display_status' => ['nullable', 'string', 'max:50'],
            'regulation_status' => ['nullable', 'string', 'max:80'],
            'jurisdiction' => ['nullable', 'string', 'max:120'],
            'published' => ['nullable', 'boolean'],
        ]);
    }

    private function parseBlocks(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }

    private function parseTags(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }

    private function resolveAssetUrl(Request $request, string $field, string $urlField, ?string $currentUrl, string $directory): ?string
    {
        if ($request->boolean('remove_' . $field)) {
            $this->deleteStoredAsset($currentUrl);
            return null;
        }

        $upload = $request->file($field);
        if ($upload instanceof UploadedFile) {
            $this->deleteStoredAsset($currentUrl);
            $url = $this->storeUploadedAsset($upload, $directory);
            $this->ensureThumbnailForUrl($url);
            return $url;
        }

        $submittedUrl = $request->input($urlField);
        if (is_string($submittedUrl) && $submittedUrl !== '') {
            if ($currentUrl !== $submittedUrl) {
                $this->deleteStoredAsset($currentUrl);
            }

            return $submittedUrl;
        }

        return $currentUrl;
    }

    private function resolveFileAsset(Request $request, string $field, ?string $currentUrl, ?string $currentName, string $directory): array
    {
        if ($request->boolean('remove_' . $field)) {
            $this->deleteStoredAsset($currentUrl);
            return [null, null];
        }

        $upload = $request->file($field);
        if ($upload instanceof UploadedFile) {
            $this->deleteStoredAsset($currentUrl);
            return $this->storeUploadedFile($upload, $directory);
        }

        $submittedUrl = $request->input($field . '_url');
        if (is_string($submittedUrl) && $submittedUrl !== '') {
            if ($currentUrl !== $submittedUrl) {
                $this->deleteStoredAsset($currentUrl);
            }

            $submittedName = $request->input('file_name');

            return [$submittedUrl, is_string($submittedName) && $submittedName !== '' ? $submittedName : $currentName];
        }

        $submittedName = $request->input('file_name');

        return [$currentUrl, is_string($submittedName) && $submittedName !== '' ? $submittedName : $currentName];
    }

    private function storeUploadedAsset(UploadedFile $file, string $directory): string
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'bin');
        $baseName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME) ?: 'asset';
        $filename = Str::slug($baseName) . '-' . Str::random(12) . '.' . $extension;
        $path = trim($directory, '/') . '/' . $filename;

        Storage::disk('public')->putFileAs($directory, $file, $filename);

        return Storage::disk('public')->url($path);
    }

    private function storeUploadedFile(UploadedFile $file, string $directory): array
    {
        $url = $this->storeUploadedAsset($file, $directory);
        return [$url, $file->getClientOriginalName()];
    }

    private function ensureThumbnailForUrl(?string $url): void
    {
        $path = $this->storedPathFromUrl($url);
        if (!$path || !$this->isImagePath($path)) {
            return;
        }

        $thumbnailPath = $this->thumbnailPathFromPath($path);
        if ($thumbnailPath && !Storage::disk('public')->exists($thumbnailPath)) {
            $this->generateThumbnail($path, $thumbnailPath);
        }
    }

    private function isImagePath(string $path): bool
    {
        return (bool) preg_match('/\.(jpe?g|png|gif|webp|bmp|avif)$/i', $path);
    }

    private function thumbnailPathFromPath(string $path): ?string
    {
        if (!$this->isImagePath($path)) {
            return null;
        }

        $directory = trim(dirname($path), '.');
        $filename = pathinfo($path, PATHINFO_FILENAME);
        $thumb = 'thumb-' . $filename . '.jpg';

        return ($directory !== '' ? $directory . '/' : '') . $thumb;
    }

    private function generateThumbnail(string $sourcePath, string $thumbnailPath): void
    {
        $disk = Storage::disk('public');
        $binary = $disk->get($sourcePath);
        $image = imagecreatefromstring($binary);

        if (!$image) {
            return;
        }

        $width = imagesx($image);
        $height = imagesy($image);
        if ($width <= 0 || $height <= 0) {
            imagedestroy($image);
            return;
        }

        $maxWidth = 480;
        $scale = min(1, $maxWidth / $width);
        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));

        $thumb = imagecreatetruecolor($targetWidth, $targetHeight);
        $white = imagecolorallocate($thumb, 255, 255, 255);
        imagefilledrectangle($thumb, 0, 0, $targetWidth, $targetHeight, $white);
        imagecopyresampled($thumb, $image, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        ob_start();
        imagejpeg($thumb, null, 82);
        $jpeg = ob_get_clean();

        if (is_string($jpeg) && $jpeg !== '') {
            $disk->put($thumbnailPath, $jpeg, 'public');
        }

        imagedestroy($thumb);
        imagedestroy($image);
    }

    private function deleteStoredAsset(?string $url): void
    {
        $path = $this->storedPathFromUrl($url);
        if (!$path) {
            return;
        }

        Storage::disk('public')->delete($path);

        $thumbnailPath = $this->thumbnailPathFromPath($path);
        if ($thumbnailPath) {
            Storage::disk('public')->delete($thumbnailPath);
        }
    }

    private function storedPathFromUrl(?string $url): ?string
    {
        if (!$url) {
            return null;
        }

        $path = parse_url($url, PHP_URL_PATH);
        if (!is_string($path) || $path === '') {
            return null;
        }

        $path = ltrim($path, '/');
        if (str_starts_with($path, 'storage/')) {
            return substr($path, strlen('storage/'));
        }

        if (str_contains($path, '/storage/')) {
            return substr($path, strpos($path, '/storage/') + strlen('/storage/'));
        }

        return null;
    }

    private function contentSnapshot(ContentItem $content): array
    {
        return [
            'id' => $content->id,
            'content_type' => $content->content_type,
            'title' => $content->title,
            'slug' => $content->slug,
            'category_id' => $content->category_id,
            'category_text' => $content->category_text,
            'sub_category_id' => $content->sub_category_id,
            'sub_category' => $content->sub_category,
            'sub_system_id' => $content->sub_system_id,
            'sub_system' => $content->subSystem?->only(['id', 'uuid', 'name', 'slug', 'sort_order', 'active']),
            'year' => $content->year,
            'description' => $content->description,
            'long_description' => $content->long_description,
            'cover_image_url' => $content->cover_image_url,
            'file_url' => $content->file_url,
            'file_name' => $content->file_name,
            'youtube_url' => $content->youtube_url,
            'video_duration' => $content->video_duration,
            'viewer' => $content->viewer,
            'file_type' => $content->file_type,
            'author' => $content->author,
            'published_date' => $content->published_date?->toDateString(),
            'effective_date' => $content->effective_date?->toDateString(),
            'version' => $content->version,
            'pages' => $content->pages,
            'file_size' => $content->file_size,
            'language' => $content->language,
            'read_time' => $content->read_time,
            'tags' => $content->tags,
            'published' => $content->published,
            'display_status' => $content->display_status,
            'regulation_status' => $content->regulation_status,
            'jurisdiction' => $content->jurisdiction,
        ];
    }

    private function recordActivity(Request $request, string $action, ContentItem $content, ?array $before, ?array $after): void
    {
        try {
            AdminActivityLogService::record(
                actor: $request->attributes->get('admin_user'),
                action: $action,
                entityType: 'content_item',
                entityId: (string) $content->id,
                entityName: $content->title,
                before: $before,
                after: $after,
                request: $request,
            );
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
