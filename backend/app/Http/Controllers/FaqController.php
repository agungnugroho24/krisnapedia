<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Faq;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FaqController extends Controller
{
    public function index(Request $request)
    {
        $q = Faq::with('faqCategory')->orderBy('order_index')->orderBy('id');
        $includeUnpublished = $request->boolean('include_unpublished');
        $search = trim((string) $request->input('search', ''));

        if (!$request->attributes->has('admin_user') && !$includeUnpublished) {
            $q->where('published', true);
        }

        if ($search !== '') {
            $like = '%' . $search . '%';
            $q->where(function ($query) use ($like): void {
                $query->where('question', 'like', $like)
                    ->orWhere('category', 'like', $like)
                    ->orWhere('answer', 'like', $like)
                    ->orWhereHas('faqCategory', fn ($category) => $category->where('name', 'like', $like));
            });
        }

        return ['data' => $q->paginate($request->integer('per_page', 30))];
    }

    public function store(Request $request)
    {
        return response()->json(['data' => Faq::create($this->data($request))], 201);
    }

    public function show(Faq $faq)
    {
        return ['data' => $faq->load('faqCategory')];
    }

    public function update(Request $request, Faq $faq)
    {
        $faq->update($this->data($request, true));
        return ['data' => $faq->fresh()->load('faqCategory')];
    }

    public function destroy(Faq $faq)
    {
        $faq->delete();
        return response()->noContent();
    }

    private function data(Request $request, bool $partial = false): array
    {
        $this->normalizePublishedInput($request);

        $required = $partial ? 'sometimes' : 'required';
        $faq = $request->route('faq');

        $validated = $request->validate([
            'question' => [$required, 'string', 'max:300'],
            'answer' => [$required, 'array'],
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where(fn ($query) => $query->where('content_type', 'faq'))],
            'category' => ['nullable', 'string', 'max:150'],
            'order_index' => ['nullable', 'integer'],
            'published' => ['nullable', 'boolean'],
        ]);

        $categoryId = array_key_exists('category_id', $validated) ? $validated['category_id'] : $faq?->faq_category_id;
        $category = null;
        $categoryName = array_key_exists('category', $validated)
            ? trim((string) $validated['category'])
            : trim((string) ($faq?->faqCategory?->name ?? $faq?->category ?? ''));

        if ($categoryId) {
            $category = Category::query()->find($categoryId);
            if (!$category) {
                throw ValidationException::withMessages(['category_id' => ['Category tidak ditemukan.']]);
            }

            if ($category->content_type !== 'faq') {
                throw ValidationException::withMessages(['category_id' => ['Category FAQ harus memakai content type faq.']]);
            }

            $categoryName = $category->name;
        } elseif ($categoryName !== '') {
            $matchedCategory = Category::query()
                ->where('content_type', 'faq')
                ->where('name', $categoryName)
                ->first();

            if ($matchedCategory) {
                $categoryId = $matchedCategory->id;
                $category = $matchedCategory;
                $categoryName = $matchedCategory->name;
            }
        }

        $orderIndex = $validated['order_index'] ?? $faq?->order_index;
        if ($orderIndex === null && !$partial) {
            $orderIndex = (int) (Faq::query()->max('order_index') ?? 0) + 1;
        }

        return [
            'question' => $validated['question'] ?? $faq?->question,
            'answer' => $validated['answer'] ?? $faq?->answer,
            'faq_category_id' => $categoryId ?: null,
            'category' => $categoryName !== '' ? $categoryName : null,
            'order_index' => $orderIndex ?? 0,
            'published' => $validated['published'] ?? $faq?->published ?? true,
        ];
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
}



