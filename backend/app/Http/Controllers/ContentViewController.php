<?php

namespace App\Http\Controllers;

use App\Models\ContentItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ContentViewController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(['insight', 'manual', 'regulation'])],
        ]);

        $rows = DB::table('content_views as cv')
            ->join('content_items as ci', 'ci.id', '=', 'cv.content_id')
            ->where('cv.content_type', $validated['type'])
            ->where('ci.published', true)
            ->orderByDesc('cv.views')
            ->orderBy('ci.slug')
            ->get([
                'ci.slug as slug',
                'cv.views as views',
            ]);

        $map = [];
        foreach ($rows as $row) {
            $map[(string) $row->slug] = (int) $row->views;
        }

        return ['data' => $map];
    }

    public function increment(Request $request)
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(['insight', 'manual', 'regulation'])],
            'slug' => ['required', 'string', 'max:200'],
            'content_id' => ['required', 'integer', 'exists:content_items,id'],
        ]);

        $content = ContentItem::query()
            ->select(['id', 'slug', 'content_type'])
            ->findOrFail($validated['content_id']);

        abort_unless($content->content_type === $validated['type'], 422, 'Content type mismatch.');

        $row = DB::selectOne(
            <<<'SQL'
INSERT INTO content_views (content_type, slug, content_id, views, updated_at)
VALUES (?, ?, ?, 1, now())
ON CONFLICT (content_type, content_id)
DO UPDATE SET
  slug = EXCLUDED.slug,
  views = content_views.views + 1,
  updated_at = now()
RETURNING views
SQL,
            [$validated['type'], $content->slug, $content->id],
        );

        return ['data' => ['views' => (int) ($row->views ?? 0)]];
    }
}