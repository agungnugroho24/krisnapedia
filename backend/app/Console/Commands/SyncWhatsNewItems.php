<?php

namespace App\Console\Commands;

use App\Services\WhatsNewService;
use Illuminate\Console\Command;

class SyncWhatsNewItems extends Command
{
    protected $signature = 'whats-new:sync';
    protected $description = 'Sync closed GitHub issues into whats_new_items as unpublished items.';

    public function handle(WhatsNewService $service): int
    {
        $result = $service->sync();

        $this->info("Whats New sync completed. Created: {$result['created']}, Updated: {$result['updated']}.");

        return self::SUCCESS;
    }
}
