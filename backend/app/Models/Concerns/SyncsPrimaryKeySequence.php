<?php

namespace App\Models\Concerns;

use Illuminate\Support\Facades\DB;

trait SyncsPrimaryKeySequence
{
    protected static function syncPrimaryKeySequence(string $table): void
    {
        $sequence = DB::selectOne(
            "SELECT pg_get_serial_sequence(?, 'id') AS sequence_name",
            [$table],
        );

        $sequenceName = $sequence->sequence_name ?? null;
        if (!$sequenceName) {
            return;
        }

        $maxId = DB::table($table)->max('id');
        if ($maxId === null) {
            DB::statement('SELECT setval(?, 1, false)', [$sequenceName]);
            return;
        }

        DB::statement('SELECT setval(?, ?, true)', [$sequenceName, (int) $maxId]);
    }
}