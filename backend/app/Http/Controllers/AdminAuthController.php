<?php

namespace App\Http\Controllers;

use App\Models\AdminPasswordResetToken;
use App\Models\AdminToken;
use App\Models\AdminUser;
use App\Services\AdminPasswordResetService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $user = AdminUser::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password_hash)) {
            return response()->json(['message' => 'Email atau password salah.'], 422);
        }

        $plain = Str::random(64);
        AdminToken::create([
            'admin_user_id' => $user->id,
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addDays(30),
            'created_at' => now(),
        ]);

        return ['token' => $plain, 'user' => $user->loadMissing('roleRecord')];
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $message = 'Tautan reset password telah dikirim ke email.';
        $user = AdminUser::where('email', $data['email'])->first();

        if (!$user) {
            return response()->json(['message' => $message]);
        }

        $reset = app(AdminPasswordResetService::class)->send(
            $user,
            'forgot_password',
            null,
            $this->resolveFrontendBaseUrl($request),
        );

        $response = ['message' => $message];
        if (app()->environment(['local', 'testing'])) {
            $response['reset_url'] = $reset['reset_url'];
        }

        return response()->json($response);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = AdminUser::where('email', $data['email'])->first();
        if (!$user) {
            return response()->json(['message' => 'Tautan reset tidak valid atau sudah kedaluwarsa.'], 422);
        }

        $resetToken = AdminPasswordResetToken::where('admin_user_id', $user->id)
            ->where('token_hash', hash('sha256', $data['token']))
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        if (!$resetToken) {
            return response()->json(['message' => 'Tautan reset tidak valid atau sudah kedaluwarsa.'], 422);
        }

        $user->forceFill(['password_hash' => Hash::make($data['password'])])->save();
        $resetToken->forceFill(['used_at' => now()])->save();

        AdminPasswordResetToken::where('admin_user_id', $user->id)
            ->whereNull('used_at')
            ->delete();

        AdminToken::where('admin_user_id', $user->id)->delete();

        return ['message' => 'Password berhasil diperbarui. Silakan login kembali.'];
    }

    public function me(Request $request)
    {
        return ['user' => $request->attributes->get('admin_user')];
    }

    public function logout(Request $request)
    {
        $plain = $request->bearerToken();
        if (!$plain) {
            return response()->noContent();
        }

        AdminToken::where('token_hash', hash('sha256', $plain))->delete();

        return response()->noContent();
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
}