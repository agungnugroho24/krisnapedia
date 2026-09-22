<?php

namespace App\Http\Controllers;

use App\Models\AdminToken;
use App\Models\SubSystem;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SubSystemController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'include_inactive' => ['nullable', 'boolean'],
        ]);

        $q = SubSystem::query()->orderBy('sort_order')->orderBy('name');

        $includeInactive = (bool) ($filters['include_inactive'] ?? false);
        if (!$request->attributes->has('admin_user')) {
            $adminUser = $this->adminUserFromBearerToken($request);
            if ($adminUser) {
                $request->attributes->set('admin_user', $adminUser);
            } else {
                $includeInactive = false;
            }
        }

        if (!$includeInactive) {
            $q->where('active', true);
        }

        $search = trim((string) ($filters['search'] ?? ''));
        if ($search !== '') {
            $q->where(function ($query) use ($search): void {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        return ['data' => $q->paginate((int) ($filters['per_page'] ?? 30))];
    }

    private function adminUserFromBearerToken(Request $request)
    {
        $plain = $request->bearerToken();
        if (!$plain) {
            return null;
        }

        $token = AdminToken::where('token_hash', hash('sha256', $plain))->first();
        if (!$token || ($token->expires_at && now()->greaterThan($token->expires_at))) {
            return null;
        }

        $token->forceFill(['last_used_at' => now()])->save();
        return $token->adminUser->loadMissing('roleRecord');
    }

    public function show(SubSystem $subSystem)
    {
        return ['data' => $subSystem];
    }

    public function store(Request $request)
    {
        return response()->json(['data' => $this->persist($request)], 201);
    }

    public function update(Request $request, SubSystem $subSystem)
    {
        return ['data' => $this->persist($request, $subSystem)];
    }

    public function destroy(SubSystem $subSystem)
    {
        $subSystem->delete();
        return response()->noContent();
    }

    private function persist(Request $request, ?SubSystem $subSystem = null): SubSystem
    {
        $required = $subSystem ? 'sometimes' : 'required';

        $validated = $request->validate([
            'name' => [$required, 'string', 'max:150'],
            'slug' => ['nullable', 'string', 'max:170'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'active' => ['nullable', 'boolean'],
        ]);

        $name = trim((string) ($validated['name'] ?? $subSystem?->name ?? ''));
        if ($name === '') {
            throw ValidationException::withMessages(['name' => ['Nama sub-sistem wajib diisi.']]);
        }

        $slug = Str::slug($validated['slug'] ?? $name);
        if ($slug === '') {
            throw ValidationException::withMessages(['slug' => ['Slug sub-sistem tidak valid.']]);
        }

        $duplicate = SubSystem::query()
            ->where(function ($query) use ($name, $slug): void {
                $query->where('name', $name)->orWhere('slug', $slug);
            });

        if ($subSystem) {
            $duplicate->where('id', '!=', $subSystem->id);
        }

        if ($duplicate->exists()) {
            throw ValidationException::withMessages(['name' => ['Nama atau slug sub-sistem sudah digunakan.']]);
        }

        $data = [
            'name' => $name,
            'slug' => $slug,
            'sort_order' => $validated['sort_order'] ?? $subSystem?->sort_order ?? 0,
            'active' => array_key_exists('active', $validated)
                ? (bool) $validated['active']
                : ($subSystem?->active ?? true),
        ];

        if ($subSystem) {
            $subSystem->update($data);
            return $subSystem->fresh();
        }

        return SubSystem::create($data);
    }
}
