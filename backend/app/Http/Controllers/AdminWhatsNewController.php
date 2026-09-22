<?php

namespace App\Http\Controllers;

use App\Models\WhatsNewItem;
use App\Services\WhatsNewService;
use Illuminate\Http\Request;

class AdminWhatsNewController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:200'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'published' => ['nullable', 'boolean'],
            'sub_system_id' => ['nullable', 'integer', 'exists:sub_systems,id'],
            'category' => ['nullable', 'string', 'max:80'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        $q = WhatsNewItem::query()->with('subSystem');
        $categories = WhatsNewItem::query()
            ->whereNotNull('category')
            ->where('category', '<>', '')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->values();
        $summary = [
            'total' => WhatsNewItem::query()->count(),
            'draft' => WhatsNewItem::query()->where('published', false)->count(),
            'published' => WhatsNewItem::query()->where('published', true)->count(),
            'last_synced_at' => WhatsNewItem::query()->max('synced_at'),
        ];
        $search = trim((string) ($filters['search'] ?? ''));

        if ($search !== '') {
            $like = '%' . $search . '%';
            $status = strtolower($search);
            $q->where(function ($query) use ($like, $status): void {
                $query->where('public_title', 'like', $like)
                    ->orWhere('raw_title', 'like', $like)
                    ->orWhere('summary', 'like', $like)
                    ->orWhere('category', 'like', $like)
                    ->orWhere('urgency', 'like', $like)
                    ->orWhere('github_url', 'like', $like)
                    ->orWhere('github_issue_number', 'like', $like)
                    ->orWhere('closed_at', 'like', $like)
                    ->orWhere('year', 'like', $like)
                    ->orWhereHas('subSystem', fn ($subSystem) => $subSystem
                        ->where('name', 'like', $like)
                        ->orWhere('slug', 'like', $like));

                if (str_contains('published', $status) || str_contains('publish', $status)) {
                    $query->orWhere('published', true);
                }

                if (str_contains('draft', $status) || str_contains('unpublished', $status) || str_contains('unpublish', $status)) {
                    $query->orWhere('published', false);
                }
            });
        }

        if (array_key_exists('published', $filters)) {
            $q->where('published', (bool) $filters['published']);
        }

        if (isset($filters['sub_system_id'])) {
            $q->where('sub_system_id', (int) $filters['sub_system_id']);
        }

        if (isset($filters['category'])) {
            $q->where('category', $filters['category']);
        }

        if (isset($filters['date_from'])) {
            $q->whereDate('closed_at', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to'])) {
            $q->whereDate('closed_at', '<=', $filters['date_to']);
        }

        if (isset($filters['year'])) {
            $q->where('year', (int) $filters['year']);
        }

        return [
            'data' => $q->orderByDesc('closed_at')->paginate((int) ($filters['per_page'] ?? 10)),
            'filters' => [
                'categories' => $categories,
                'summary' => $summary,
            ],
        ];
    }

    public function update(Request $request, WhatsNewItem $whatsNewItem)
    {
        $validated = $request->validate([
            'public_title' => ['sometimes', 'required', 'string', 'max:500'],
            'summary' => ['nullable', 'string', 'max:5000'],
            'category' => ['sometimes', 'required', 'string', 'max:80'],
            'urgency' => ['sometimes', 'required', 'string', 'max:80'],
            'sub_system_id' => ['sometimes', 'required', 'integer', 'exists:sub_systems,id'],
            'closed_at' => ['nullable', 'date'],
            'published' => ['nullable', 'boolean'],
        ]);

        if (array_key_exists('closed_at', $validated)) {
            $validated['year'] = $validated['closed_at'] ? (int) date('Y', strtotime($validated['closed_at'])) : null;
        }

        $whatsNewItem->update($validated);

        return ['data' => $whatsNewItem->fresh()->load('subSystem')];
    }

    public function destroy(WhatsNewItem $whatsNewItem)
    {
        $whatsNewItem->delete();

        return response()->noContent();
    }

    public function sync(WhatsNewService $service)
    {
        $result = $service->sync();

        return [
            'message' => 'Whats New sync completed.',
            'data' => $result,
        ];
    }
}
