<?php

namespace App\Http\Controllers;

use App\Models\AdminRole;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminRoleController extends Controller
{
    public function index(Request $request)
    {
        $q = AdminRole::query()->withCount('users')->orderBy('id');
        $search = trim((string) $request->input('search', ''));

        if ($search !== '') {
            $like = '%' . $search . '%';
            $q->where(function ($query) use ($like): void {
                $query->where('name', 'like', $like)
                    ->orWhere('slug', 'like', $like)
                    ->orWhere('description', 'like', $like);
            });
        }

        return ['data' => $q->paginate($request->integer('per_page', 30))];
    }

    public function show(AdminRole $role)
    {
        return ['data' => $role->loadCount('users')];
    }

    public function store(Request $request)
    {
        return response()->json(['data' => $this->persist($request)], 201);
    }

    public function update(Request $request, AdminRole $role)
    {
        return ['data' => $this->persist($request, $role)];
    }

    public function destroy(AdminRole $role)
    {
        if ($role->users()->exists()) {
            throw ValidationException::withMessages([
                'role' => ['Role ini masih dipakai oleh user dan tidak bisa dihapus.'],
            ]);
        }

        if (in_array($role->slug, ['admin', 'operator'], true)) {
            throw ValidationException::withMessages([
                'role' => ['Role inti admin/operator tidak bisa dihapus.'],
            ]);
        }

        $role->delete();

        return response()->noContent();
    }

    private function persist(Request $request, ?AdminRole $role = null): AdminRole
    {
        $partial = $role !== null;
        $required = $partial ? 'sometimes' : 'required';

        $validated = $request->validate([
            'name' => [$required, 'string', 'max:150'],
            'slug' => [$partial ? 'sometimes' : 'required', 'string', 'max:50', 'regex:/^[a-z0-9_-]+$/', Rule::unique('roles', 'slug')->ignore($role?->id)],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $data = [
            'name' => $validated['name'] ?? $role?->name,
            'description' => array_key_exists('description', $validated) ? ($validated['description'] ?: null) : $role?->description,
        ];

        if (array_key_exists('slug', $validated)) {
            $data['slug'] = strtolower((string) $validated['slug']);
        } elseif ($role) {
            $data['slug'] = $role->slug;
        }

        if ($role) {
            $role->update($data);

            return $role->fresh()->loadCount('users');
        }

        return tap(AdminRole::create($data), fn (AdminRole $created) => $created->loadCount('users'));
    }
}