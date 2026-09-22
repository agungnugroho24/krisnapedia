<?php

namespace App\Notifications;

use DateTimeInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AdminPasswordResetNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $resetUrl,
        private readonly DateTimeInterface $expiresAt,
        private readonly string $context = 'forgot_password',
    ) {
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $isInvite = $this->context === 'invite_user';
        $subject = $isInvite ? 'Akun KRISNApedia Anda sudah dibuat' : 'Reset password KRISNApedia';
        $greeting = 'Halo ' . ($notifiable->name ?? 'Admin') . ',';

        $mail = (new MailMessage())
            ->subject($subject)
            ->greeting($greeting);

        if ($isInvite) {
            $mail->line('Akun Anda sudah berhasil dibuat.')
                ->line('Silakan gunakan tombol di bawah untuk mengatur password pertama Anda.')
                ->action('Atur password', $this->resetUrl)
                ->line('Jika Anda merasa tidak pernah menerima undangan ini, abaikan email ini.');
        } else {
            $mail->line('Kami menerima permintaan reset password untuk akun Anda.')
                ->action('Reset password', $this->resetUrl)
                ->line('Jika Anda tidak meminta reset password, abaikan email ini.');
        }

        return $mail->line('Link ini berlaku sampai ' . $this->expiresAt->format('d M Y H:i') . '.');
    }
}