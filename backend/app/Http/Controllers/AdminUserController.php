<?php

namespace App\Http\Controllers;

use App\Models\AdminRole;
use App\Models\AdminUser;
use App\Services\AdminActivityLogService;
use App\Services\AdminPasswordResetService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        $q = AdminUser::query()->with('roleRecord')->orderByDesc('id');
        $search = trim((string) $request->input('search', ''));

        if ($search !== '') {
            $like = '%' . $search . '%';
            $q->where(function ($query) use ($like): void {
                $query->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('role', 'like', $like)
                    ->orWhereHas('roleRecord', fn ($role) => $role->where('name', 'like', $like)->orWhere('slug', 'like', $like));
            });
        }

        return ['data' => $q->paginate($request->integer('per_page', 30))];
    }

    public function show(AdminUser $adminUser)
    {
        return ['data' => $adminUser->load('roleRecord')];
    }

    public function store(Request $request)
    {
        $adminUser = $this->persist($request);
        $this->sendPasswordSetupLink($request, $adminUser);
        $this->recordActivity($request, 'create', $adminUser, null, $this->adminUserSnapshot($adminUser));

        return response()->json(['data' => $adminUser], 201);
    }

    public function update(Request $request, AdminUser $adminUser)
    {
        $before = $this->adminUserSnapshot($adminUser->loadMissing('roleRecord'));
        $updated = $this->persist($request, $adminUser);
        $this->recordActivity($request, 'update', $updated, $before, $this->adminUserSnapshot($updated));

        return ['data' => $updated];
    }

    public function destroy(Request $request, AdminUser $adminUser)
    {
        $currentAdmin = $request->attributes->get('admin_user');

        if ($currentAdmin && (int) $currentAdmin->id === (int) $adminUser->id) {
            throw ValidationException::withMessages([
                'user' => ['User yang sedang login tidak bisa dihapus.'],
            ]);
        }

        $before = $this->adminUserSnapshot($adminUser->loadMissing('roleRecord'));
        $adminUser->tokens()->delete();
        $adminUser->delete();
        $this->recordActivity($request, 'delete', $adminUser, $before, null);

        return response()->noContent();
    }

    private function persist(Request $request, ?AdminUser $adminUser = null): AdminUser
    {
        $partial = $adminUser !== null;
        $required = $partial ? 'sometimes' : 'required';

        $validated = $request->validate([
            'name' => [$required, 'string', 'max:150'],
            'email' => [$required, 'email', Rule::unique('admin_users', 'email')->ignore($adminUser?->id)],
            'password' => [$partial ? 'nullable' : 'required', 'string', 'min:8', 'confirmed'],
            'role_id' => [$required, 'integer', Rule::exists('roles', 'id')],
        ]);

        $role = AdminRole::query()->find($validated['role_id']);
        if (!$role) {
            throw ValidationException::withMessages([
                'role_id' => ['Role tidak ditemukan.'],
            ]);
        }

        $data = [
            'name' => $validated['name'] ?? $adminUser?->name,
            'email' => $validated['email'] ?? $adminUser?->email,
            'role_id' => $role->id,
            'role' => $role->slug,
        ];

        if (array_key_exists('password', $validated) && $validated['password']) {
            $data['password_hash'] = Hash::make($validated['password']);
        }

        if ($adminUser) {
            $adminUser->update($data);

            return $adminUser->fresh()->load('roleRecord');
        }

        return tap(AdminUser::create($data), fn (AdminUser $created) => $created->load('roleRecord'));
    }

    private function sendPasswordSetupLink(Request $request, AdminUser $adminUser): void
    {
        try {
            app(AdminPasswordResetService::class)->send(
                $adminUser,
                'invite_user',
                null,
                $this->resolveFrontendBaseUrl($request),
            );
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    private function resolveFrontendBaseUrl(Request $request): ?string
    {
        $origin = $request->headers->get('origin');
        if (is_string($origin) && $origin !== '') {
            return rtrim($origin, '/');
        }

        $referer = $request->headers->get('referer');
        if (is_string($referer) && $referer !== '') {
            $parts = parse_url($referer);
            if (is_array($parts) && isset($parts['scheme'], $parts['host'])) {
                $port = isset($parts['port']) ? ':' . $parts['port'] : '';
                return $parts['scheme'] . '://' . $parts['host'] . $port;
            }
        }

        return null;
    }

    private function adminUserSnapshot(AdminUser $adminUser): array
    {
        $adminUser->loadMissing('roleRecord');

        return [
            'id' => $adminUser->id,
            'name' => $adminUser->name,
            'email' => $adminUser->email,
            'role_id' => $adminUser->role_id,
            'role' => $adminUser->role,
            'role_name' => $adminUser->roleRecord?->name,
        ];
    }

    private function recordActivity(Request $request, string $action, AdminUser $actor, ?array $before, ?array $after): void
    {
        try {
            AdminActivityLogService::record(
                actor: $request->attributes->get('admin_user'),
                action: $action,
                entityType: 'admin_user',
                entityId: (string) $actor->id,
                entityName: $actor->name,
                before: $before,
                after: $after,
                request: $request,
            );
        } catch (\Throwable $e) {
            report($e);
        }
    }
}