<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $contentType = $this->requestedContentType($request);

        $search = trim($request->string('search')->toString());

        $q = Category::query()
            ->with(['subCategories' => function ($subCategories) use ($contentType): void {
                if ($contentType) {
                    $subCategories->where('content_type', $contentType);
                }

                $subCategories->orderBy('name');
            }])
            ->orderBy('name');

        if ($contentType) {
            $q->where('content_type', $contentType);
        }

        if ($search !== '') {
            $q->where('name', 'like', "%{$search}%");
        }

        return ['data' => $q->paginate($request->integer('per_page', 30))];
    }

    public function show(Request $request, Category $category)
    {
        $contentType = $this->requestedContentType($request) ?? $category->content_type;
        abort_unless(!$contentType || $category->content_type === $contentType, 404);

        return ['data' => $category->load(['subCategories' => function ($subCategories) use ($contentType): void {
            if ($contentType) {
                $subCategories->where('content_type', $contentType);
            }

            $subCategories->orderBy('name');
        }])];
    }

    public function store(Request $request)
    {
        return response()->json(['data' => $this->persist($request)], 201);
    }

    public function update(Request $request, Category $category)
    {
        $contentType = $this->requestedContentType($request);
        abort_unless(!$contentType || $category->content_type === $contentType, 404);

        return ['data' => $this->persist($request, $category)];
    }

    public function destroy(Request $request, Category $category)
    {
        $contentType = $this->requestedContentType($request);
        abort_unless(!$contentType || $category->content_type === $contentType, 404);

        $category->delete();
        return response()->noContent();
    }

    private function persist(Request $request, ?Category $category = null): Category
    {
        $required = $category ? 'sometimes' : 'required';

        $validated = $request->validate([
            'name' => [$required, 'string', 'max:150'],
            'content_type' => [$required, 'nullable', 'in:insight,manual,regulation,faq'],
        ]);

        $name = $validated['name'] ?? $category?->name;
        $contentType = array_key_exists('content_type', $validated) ? $validated['content_type'] : $category?->content_type;

        if (!$name) {
            throw ValidationException::withMessages(['name' => ['Nama category wajib diisi.']]);
        }

        $duplicate = Category::query()->where('name', $name);
        if ($contentType === null || $contentType === '') {
            $duplicate->whereNull('content_type');
        } else {
            $duplicate->where('content_type', $contentType);
        }

        if ($category) {
            $duplicate->where('id', '!=', $category->id);
        }

        if ($duplicate->exists()) {
            throw ValidationException::withMessages(['name' => ['Nama category sudah digunakan untuk content type ini.']]);
        }

        $data = ['name' => $name];

        if (array_key_exists('content_type', $validated)) {
            $data['content_type'] = $validated['content_type'];
        } elseif ($category && $category->content_type !== null) {
            $data['content_type'] = $category->content_type;
        }

        if ($category) {
            $category->update($data);
            return $category->fresh()->load(['subCategories' => fn ($subCategories) => $subCategories->orderBy('name')]);
        }

        return tap(Category::create($data), fn (Category $created) => $created->load(['subCategories' => fn ($subCategories) => $subCategories->orderBy('name')]));
    }

    private function requestedContentType(Request $request): ?string
    {
        $contentType = $request->string('content_type')->toString();

        return in_array($contentType, ['insight', 'manual', 'regulation', 'faq'], true) ? $contentType : null;
    }
}
