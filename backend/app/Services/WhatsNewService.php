<?php

namespace App\Services;

use App\Models\SubSystem;
use App\Models\WhatsNewItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WhatsNewService
{
    public function list(array $filters = []): array
    {
        $perPage = (int) ($filters['per_page'] ?? 9);
        $query = WhatsNewItem::query()
            ->with('subSystem')
            ->where('published', true)
            ->when($filters['year'] ?? null, fn ($q, $year) => $q->where('year', (int) $year))
            ->when($filters['sub_system_id'] ?? null, fn ($q, $id) => $q->where('sub_system_id', (int) $id))
            ->when($filters['category'] ?? null, fn ($q, $category) => $q->where('category', $category))
            ->when(trim((string) ($filters['search'] ?? '')) !== '', function ($q) use ($filters): void {
                $like = '%' . trim((string) $filters['search']) . '%';
                $q->where(function ($inner) use ($like): void {
                    $inner->where('public_title', 'like', $like)
                        ->orWhere('raw_title', 'like', $like)
                        ->orWhere('summary', 'like', $like);
                });
            })
            ->orderByDesc('closed_at')
            ->orderByDesc('id');

        if (isset($filters['limit'])) {
            $items = $query->limit((int) $filters['limit'])->get();
            return [
                'data' => $items->map(fn ($item) => $this->serializeItem($item))->all(),
                'filters' => $this->filters(),
            ];
        }

        $paginator = $query->paginate(min(max($perPage, 1), 100));
        $paginator->setCollection($paginator->getCollection()->map(fn ($item) => $this->serializeItem($item)));

        return [
            'data' => $paginator,
            'filters' => $this->filters(),
        ];
    }

    public function filters(bool $publishedOnly = true): array
    {
        $query = WhatsNewItem::query()->with('subSystem');
        if ($publishedOnly) {
            $query->where('published', true);
        }

        $items = $query->get();

        return [
            'years' => $items->pluck('year')->filter()->unique()->sortDesc()->values()->all(),
            'sub_systems' => $items->pluck('subSystem')->filter()->unique('id')->sortBy('name')->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'slug' => $item->slug,
            ])->values()->all(),
            'categories' => $items->pluck('category')->filter()->unique()->sort()->values()->all(),
        ];
    }

    public function sync(): array
    {
        $created = 0;
        $updated = 0;

        foreach ($this->fetchIssues() as $issue) {
            if (isset($issue['pull_request'])) {
                continue;
            }

            foreach ($this->normalizeIssue($issue) as $payload) {
                $record = WhatsNewItem::query()
                    ->where('github_issue_id', $payload['github_issue_id'])
                    ->where('sub_system_id', $payload['sub_system_id'])
                    ->first();

                if ($record) {
                    $record->fill([
                        'github_issue_number' => $payload['github_issue_number'],
                        'github_url' => $payload['github_url'],
                        'raw_title' => $payload['raw_title'],
                        'category' => $payload['category'],
                        'urgency' => $payload['urgency'],
                        'closed_at' => $payload['closed_at'],
                        'year' => $payload['year'],
                        'synced_at' => now(),
                    ])->save();
                    $updated++;
                    continue;
                }

                WhatsNewItem::create([
                    ...$payload,
                    'public_title' => $this->narrateTitle($payload['raw_title'], $payload['category']),
                    'summary' => null,
                    'published' => false,
                    'synced_at' => now(),
                ]);
                $created++;
            }
        }

        Cache::forget('whats_new.items');

        return ['created' => $created, 'updated' => $updated];
    }

    private function fetchIssues(): array
    {
        $repo = (string) config('whats_new.github_repo');
        $token = config('whats_new.github_token');
        $perPage = (int) config('whats_new.per_page', 100);
        $maxPages = max(1, (int) config('whats_new.max_pages', 5));
        $issues = [];

        for ($page = 1; $page <= $maxPages; $page += 1) {
            $response = $this->requestIssuesPage($repo, $page, $perPage, is_string($token) ? $token : null);

            if ($response->status() === 404 && $token) {
                $fallbackResponse = $this->requestIssuesPage($repo, $page, $perPage, null);
                if ($fallbackResponse->ok()) {
                    $response = $fallbackResponse;
                }
            }

            if (!$response->ok()) {
                Log::warning('Whats New GitHub API request failed.', [
                    'repo' => $repo,
                    'page' => $page,
                    'status' => $response->status(),
                    'message' => $response->json('message') ?? $response->body(),
                    'hint' => 'If this repository is private, the GitHub token must have repository Issues read-only access. Issue fields/types permissions are not enough for the issues list API.',
                ]);
                break;
            }

            $pageItems = $response->json();
            if (!is_array($pageItems) || count($pageItems) === 0) {
                break;
            }

            array_push($issues, ...$pageItems);
        }

        return $issues;
    }

    private function requestIssuesPage(string $repo, int $page, int $perPage, ?string $token)
    {
        $request = Http::acceptJson()
            ->withHeaders([
                'User-Agent' => 'KRISNApedia',
                'X-GitHub-Api-Version' => '2022-11-28',
            ]);

        if ($token) {
            $request = $request->withToken($token);
        }

        return $request->get("https://api.github.com/repos/{$repo}/issues", [
            'state' => 'closed',
            'per_page' => $perPage,
            'page' => $page,
            'sort' => 'updated',
            'direction' => 'desc',
        ]);
    }

    private function normalizeIssue(array $issue): array
    {
        if (($issue['state'] ?? '') !== 'closed' || empty($issue['closed_at'])) {
            return [];
        }

        $labels = collect($issue['labels'] ?? [])
            ->map(fn ($label) => strtolower((string) ($label['name'] ?? '')))
            ->filter()
            ->values();

        $category = $this->categoryFromIssue($issue, $labels->all());
        if (!$category) {
            return [];
        }

        $title = (string) ($issue['title'] ?? '');
        $subSystems = $this->subSystemsFromIssue($title, $labels->all());
        if (count($subSystems) === 0) {
            return [];
        }

        $closedAt = Carbon::parse($issue['closed_at']);
        $subSystemIds = SubSystem::query()->whereIn('slug', $subSystems)->pluck('id', 'slug');

        return collect($subSystems)
            ->map(fn ($slug) => $subSystemIds[$slug] ?? null)
            ->filter()
            ->unique()
            ->map(fn ($subSystemId) => [
                'github_issue_id' => (int) ($issue['id'] ?? 0),
                'github_issue_number' => (int) ($issue['number'] ?? 0),
                'github_url' => (string) ($issue['html_url'] ?? ''),
                'sub_system_id' => (int) $subSystemId,
                'raw_title' => $title,
                'category' => $category,
                'urgency' => $this->urgencyFromLabels($labels->all()),
                'closed_at' => $closedAt->toDateString(),
                'year' => $closedAt->year,
            ])
            ->values()
            ->all();
    }

    private function categoryFromIssue(array $issue, array $labels): ?string
    {
        $type = strtolower((string) data_get($issue, 'type.name', ''));
        $candidates = array_values(array_unique(array_filter([...$labels, $type])));

        if (in_array('feature', $candidates, true)) {
            return 'Fitur baru';
        }

        if (in_array('bug', $candidates, true)) {
            return 'Perbaikan bug';
        }

        if (in_array('task', $candidates, true)) {
            return 'Pembaruan';
        }

        return null;
    }

    private function urgencyFromLabels(array $labels): string
    {
        return count(array_intersect($labels, ['urgent', 'high'])) > 0
            ? 'Wajib diketahui'
            : 'Informasi tambahan';
    }

    private function subSystemsFromIssue(string $title, array $labels): array
    {
        $candidates = $labels;

        if (preg_match_all('/\[([^\]]+)\]/', $title, $matches)) {
            foreach ($matches[1] as $match) {
                array_push($candidates, ...preg_split('/[,&|\/]+/', $match) ?: []);
            }
        }

        return collect($candidates)
            ->map(fn ($candidate) => $this->normalizeSubSystem((string) $candidate))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function normalizeSubSystem(string $value): ?string
    {
        $normalized = Str::of($value)
            ->lower()
            ->replaceMatches('/^all about\s+/', '')
            ->replace(['_', '.'], '-')
            ->replaceMatches('/\s+/', '-')
            ->trim('-')
            ->toString();

        $aliases = config('whats_new.aliases', []);
        foreach ($aliases as $alias => $subSystem) {
            if ($normalized === $alias || str_starts_with($normalized, $alias . '-')) {
                return $subSystem;
            }
        }

        foreach (config('whats_new.sub_systems', []) as $slug => $name) {
            if ($normalized === $slug || str_starts_with($normalized, $slug . '-')) {
                return $slug;
            }
        }

        return null;
    }

    private function cleanTitle(string $title): string
    {
        $clean = preg_replace('/^\s*(\[[^\]]+\]\s*)+/', '', $title) ?? $title;
        $clean = str_replace(['_', '-'], ' ', $clean);

        return trim(preg_replace('/\s+/', ' ', $clean) ?? $clean);
    }

    public function narrateTitle(string $title, string $category = ''): string
    {
        $clean = $this->cleanTitle($title);
        $clean = preg_replace('/`([^`]+)`/', '$1', $clean) ?? $clean;
        $lower = strtolower($clean);

        $replacements = [
            '/^bugfix:\s*/i' => 'Perbaikan ',
            '/^fix:\s*/i' => 'Perbaikan ',
            '/^add\s+/i' => 'Penambahan ',
            '/^adding\s+/i' => 'Penambahan ',
            '/^create\s+/i' => 'Pembuatan ',
            '/^update\s+/i' => 'Pembaruan ',
            '/^remove\s+/i' => 'Penghapusan ',
        ];

        foreach ($replacements as $pattern => $replacement) {
            if (preg_match($pattern, $clean)) {
                $clean = preg_replace($pattern, $replacement, $clean) ?? $clean;
                break;
            }
        }

        $clean = preg_replace('/\babout\b/i', 'terkait', $clean) ?? $clean;
        $clean = preg_replace('/\bfor\b/i', 'untuk', $clean) ?? $clean;
        $clean = preg_replace('/\bon\b/i', 'pada', $clean) ?? $clean;
        $clean = preg_replace('/\s+/', ' ', trim($clean)) ?? $clean;

        if ($clean === $lower && function_exists('mb_convert_case')) {
            $clean = mb_convert_case($clean, MB_CASE_TITLE, 'UTF-8');
        }

        $terms = ['RPJMN', 'RKP', 'DAK', 'K/L', 'PPN', 'SBSN', 'API', 'XLSX', 'PDF'];
        foreach ($terms as $term) {
            $clean = preg_replace('/\b' . preg_quote(strtolower($term), '/') . '\b/i', $term, $clean) ?? $clean;
        }

        return $clean;
    }

    private function serializeItem(WhatsNewItem $item): array
    {
        return [
            'id' => $item->id,
            'number' => $item->github_issue_number,
            'title' => $item->public_title,
            'raw_title' => $item->raw_title,
            'summary' => $item->summary,
            'category' => $item->category,
            'urgency' => $item->urgency,
            'sub_system' => $item->subSystem?->name,
            'sub_system_id' => $item->sub_system_id,
            'closed_at' => $item->closed_at?->toDateString(),
            'year' => $item->year,
            'url' => $item->github_url,
            'published' => $item->published,
            'is_new' => $item->closed_at
                ? $item->closed_at->betweenIncluded(now()->startOfWeek(), now()->endOfWeek())
                : false,
        ];
    }
}
