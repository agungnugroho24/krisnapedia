<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\SubCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SubCategoryController extends Controller
{
    public function index(Request $request)
    {
        $contentType = $this->requestedContentType($request);
        $categoryId = $request->integer('category_id');

        $q = SubCategory::query()
            ->with('category')
            ->orderBy('name');

        if ($contentType) {
            $q->where('content_type', $contentType);
        }

        if ($categoryId > 0) {
            $q->where('category_id', $categoryId);
        }

        return ['data' => $q->paginate($request->integer('per_page', 30))];
    }

    public function show(Request $request, SubCategory $subCategory)
    {
        $contentType = $this->requestedContentType($request) ?? $subCategory->content_type;
        abort_unless(!$contentType || $subCategory->content_type === $contentType, 404);

        return ['data' => $subCategory->load('category')];
    }

    public function store(Request $request)
    {
        return response()->json(['data' => $this->persist($request)], 201);
    }

    public function update(Request $request, SubCategory $subCategory)
    {
        $contentType = $this->requestedContentType($request);
        abort_unless(!$contentType || $subCategory->content_type === $contentType, 404);

        return ['data' => $this->persist($request, $subCategory)];
    }

    public function destroy(Request $request, SubCategory $subCategory)
    {
        $contentType = $this->requestedContentType($request);
        abort_unless(!$contentType || $subCategory->content_type === $contentType, 404);

        $subCategory->delete();
        return response()->noContent();
    }

    private function persist(Request $request, ?SubCategory $subCategory = null): SubCategory
    {
        $required = $subCategory ? 'sometimes' : 'required';

        $validated = $request->validate([
            'category_id' => [$required, 'integer', 'exists:categories,id'],
            'name' => [$required, 'string', 'max:150'],
            'content_type' => [$required, 'nullable', 'in:insight,manual,regulation'],
        ]);

        $categoryId = $validated['category_id'] ?? $subCategory?->category_id;
        $name = $validated['name'] ?? $subCategory?->name;
        $contentType = array_key_exists('content_type', $validated) ? $validated['content_type'] : $subCategory?->content_type;

        if (!$categoryId) {
            throw ValidationException::withMessages(['category_id' => ['Category wajib dipilih.']]);
        }

        $category = Category::query()->find($categoryId);
        if (!$category) {
            throw ValidationException::withMessages(['category_id' => ['Category tidak ditemukan.']]);
        }

        if ($category->content_type !== null && $contentType !== null && $category->content_type !== $contentType) {
            throw ValidationException::withMessages(['content_type' => ['Content type sub-category harus sama dengan category induknya.']]);
        }

        if ($contentType === null && $category->content_type !== null) {
            $contentType = $category->content_type;
        }

        if (!$name) {
            throw ValidationException::withMessages(['name' => ['Nama sub-category wajib diisi.']]);
        }

        $duplicate = SubCategory::query()->where('category_id', $categoryId)->where('name', $name);
        if ($contentType === null || $contentType === '') {
            $duplicate->whereNull('content_type');
        } else {
            $duplicate->where('content_type', $contentType);
        }

        if ($subCategory) {
            $duplicate->where('id', '!=', $subCategory->id);
        }

        if ($duplicate->exists()) {
            throw ValidationException::withMessages(['name' => ['Nama sub-category sudah digunakan untuk category ini.']]);
        }

        $data = [
            'category_id' => $categoryId,
            'name' => $name,
            'content_type' => $contentType,
        ];

        if ($subCategory) {
            $subCategory->update($data);
            return $subCategory->fresh()->load('category');
        }

        return tap(SubCategory::create($data), fn (SubCategory $created) => $created->load('category'));
    }

    private function requestedContentType(Request $request): ?string
    {
        $contentType = $request->string('content_type')->toString();

        return in_array($contentType, ['insight', 'manual', 'regulation'], true) ? $contentType : null;
    }
}
