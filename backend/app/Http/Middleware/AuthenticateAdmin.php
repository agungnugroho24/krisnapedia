<?php

namespace App\Http\Middleware;

use App\Models\AdminToken;
use Closure;
use Illuminate\Http\Request;

class AuthenticateAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $plain = $request->bearerToken();
        $token = $plain ? AdminToken::where('token_hash', hash('sha256', $plain))->first() : null;
        if (!$token || ($token->expires_at && now()->greaterThan($token->expires_at))) return response()->json(['message' => 'Unauthenticated.'], 401);
        $token->forceFill(['last_used_at' => now()])->save();
        $request->attributes->set('admin_user', $token->adminUser->loadMissing('roleRecord'));
        return $next($request);
    }
}