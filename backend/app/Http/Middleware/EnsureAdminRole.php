<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureAdminRole
{
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        $adminUser = $request->attributes->get('admin_user');

        if (!$adminUser) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($roles !== [] && !in_array((string) $adminUser->role, $roles, true)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return $next($request);
    }
}