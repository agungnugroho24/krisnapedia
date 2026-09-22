<?php

namespace App\Http\Controllers;

use App\Models\Category;

class StudioTaxonomyController extends Controller
{
    public function show(string $contentType)
    {
        $contentType = $this->normalizeContentType($contentType);
        abort_unless($contentType, 404);

        $categories = Category::query()
            ->where('content_type', $contentType)
            ->with(['subCategories' => function ($subCategories) use ($contentType): void {
                $subCategories->where('content_type', $contentType)->orderBy('name');
            }])
            ->orderBy('name')
            ->get();

        return [
            'data' => [
                'content_type' => $contentType,
                'categories' => $categories,
            ],
        ];
    }

    private function normalizeContentType(string $contentType): ?string
    {
        return in_array($contentType, ['insight', 'manual', 'regulation'], true) ? $contentType : null;
    }
}
