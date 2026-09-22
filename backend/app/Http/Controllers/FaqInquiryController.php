<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class FaqInquiryController extends Controller
{
    private const CAPTCHA_WIDTH = 300;
    private const CAPTCHA_TOLERANCE = 8;

    public function captcha()
    {
        $id = (string) Str::uuid();
        $targetX = random_int(70, 210);
        $imageKeys = ['analytics', 'market', 'strategy', 'regulasi-uu', 'regulasi-perpres'];
        $imageKey = $imageKeys[array_rand($imageKeys)];

        Cache::put($this->captchaCacheKey($id), [
            'target_x' => $targetX,
            'image_key' => $imageKey,
        ], now()->addMinutes(5));

        return response()->json([
            'id' => $id,
            'image_key' => $imageKey,
            'target_x' => $targetX,
            'width' => self::CAPTCHA_WIDTH,
            'expires_in' => 300,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'email', 'max:255'],
            'subjek' => ['required', 'string', 'min:3', 'max:150'],
            'pertanyaan' => ['required', 'string', 'min:10', 'max:1000'],
            'captcha_id' => ['required', 'uuid'],
            'captcha_x' => ['required', 'numeric', 'min:0', 'max:' . self::CAPTCHA_WIDTH],
        ]);

        if (!$this->passesCaptcha($data['captcha_id'], (float) $data['captcha_x'])) {
            return response()->json([
                'message' => 'Verifikasi puzzle belum sesuai. Silakan coba lagi.',
            ], 422);
        }

        $recipient = 'redzone.secops@gmail.com';
        $subject = $this->normalizeHeaderValue('FAQ KRISNApedia: ' . $data['subjek']);
        $name = $this->normalizeHeaderValue($data['nama']);
        $email = $this->normalizeHeaderValue($data['email']);

        $body = implode("\n", [
            'Ada pertanyaan baru dari form FAQ KRISNApedia.',
            '',
            'Nama: ' . $data['nama'],
            'Email: ' . $data['email'],
            'Subjek: ' . $data['subjek'],
            '',
            'Pertanyaan:',
            $data['pertanyaan'],
        ]);

        $sendMail = function (?string $mailer = null) use ($body, $recipient, $subject, $name, $email): void {
            if ($mailer) {
                Mail::mailer($mailer)->raw($body, function ($message) use ($recipient, $subject, $name, $email): void {
                    $message->to($recipient)
                        ->subject($subject)
                        ->replyTo($email, $name);
                });

                return;
            }

            Mail::raw($body, function ($message) use ($recipient, $subject, $name, $email): void {
                $message->to($recipient)
                    ->subject($subject)
                    ->replyTo($email, $name);
            });
        };

        try {
            $sendMail();
        } catch (\Throwable $exception) {
            report($exception);

            $backupMailer = config('mail.backup_mailer');
            $useBackup = is_string($backupMailer)
                && $backupMailer !== ''
                && $backupMailer !== 'log'
                && $backupMailer !== 'array'
                && $backupMailer !== config('mail.default');

            if ($useBackup) {
                try {
                    $sendMail($backupMailer);
                } catch (\Throwable $backupException) {
                    report($backupException);
                }
            }

            return response()->json([
                'message' => 'Gagal mengirim pertanyaan.',
            ], 500);
        }

        return response()->json([
            'message' => 'Pertanyaan berhasil dikirim.',
        ]);
    }

    private function normalizeHeaderValue(string $value): string
    {
        return trim(preg_replace('/[\r\n]+/', ' ', $value) ?? '');
    }

    private function passesCaptcha(string $id, float $answerX): bool
    {
        $key = $this->captchaCacheKey($id);
        $challenge = Cache::pull($key);

        if (!is_array($challenge) || !isset($challenge['target_x'])) {
            return false;
        }

        return abs(((float) $challenge['target_x']) - $answerX) <= self::CAPTCHA_TOLERANCE;
    }

    private function captchaCacheKey(string $id): string
    {
        return 'faq_inquiry_captcha:' . $id;
    }
}

