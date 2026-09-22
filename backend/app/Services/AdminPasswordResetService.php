<?php

namespace App\Services;

use App\Models\AdminPasswordResetToken;
use App\Models\AdminUser;
use App\Notifications\AdminPasswordResetNotification;
use Illuminate\Support\Str;

class AdminPasswordResetService
{
    public const DEFAULT_EXPIRY_MINUTES = 15;

    /**
     * Issue a single-use reset token and send the corresponding email.
     *
     * @return array{reset_url: string, expires_at: \Illuminate\Support\Carbon, plain_token: string}
     */
    public function send(AdminUser $user, string $context, ?int $expiresMinutes = null, ?string $frontendUrl = null): array
    {
        $expiresAt = now()->addMinutes($expiresMinutes ?? self::DEFAULT_EXPIRY_MINUTES);
        $plainToken = Str::random(64);
        $frontendBase = rtrim(trim((string) ($frontendUrl ?? config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:8080')))), '/');

        if ($frontendBase === '') {
            $frontendBase = 'http://localhost:8080';
        }

        $resetUrl = $frontendBase . '/studio?reset_token=' . urlencode($plainToken) . '&email=' . urlencode($user->email);

        AdminPasswordResetToken::where('admin_user_id', $user->id)->delete();
        AdminPasswordResetToken::create([
            'admin_user_id' => $user->id,
            'token_hash' => hash('sha256', $plainToken),
            'expires_at' => $expiresAt,
            'created_at' => now(),
        ]);

        try {
            $user->notify(new AdminPasswordResetNotification($resetUrl, $expiresAt, $context));
        } catch (\Throwable $exception) {
            report($exception);
        }

        return [
            'reset_url' => $resetUrl,
            'expires_at' => $expiresAt,
            'plain_token' => $plainToken,
        ];
    }
}