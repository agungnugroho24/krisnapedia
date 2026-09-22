<?php

return [

    'default' => env('MAIL_MAILER', 'log'),
    'backup_mailer' => env('MAIL_BACKUP_MAILER'),

    'mailers' => [
        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL', env('LOG_CHANNEL', 'stack')),
        ],

        'smtp' => [
            'transport' => 'smtp',
            'host' => env('MAIL_HOST', '127.0.0.1'),
            'port' => env('MAIL_PORT', 2525),
            'encryption' => env('MAIL_ENCRYPTION'),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
            'timeout' => null,
            'auth_mode' => null,
        ],

        'array' => [
            'transport' => 'array',
        ],
    ],

    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'noreply@smpn1sepatan.sch.id'),
        'name' => env('MAIL_FROM_NAME', env('APP_NAME', 'KRISNApedia')),
    ],

];
