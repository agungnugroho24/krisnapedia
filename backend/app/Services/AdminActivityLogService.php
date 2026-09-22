<?php

namespace App\Services;

use App\Models\AdminActivityLog;
use App\Models\AdminUser;
use Illuminate\Http\Request;

class AdminActivityLogService
{
    public static function record(
        ?AdminUser $actor,
        string $action,
        string $entityType,
        ?string $entityId = null,
        ?string $entityName = null,
        ?array $before = null,
        ?array $after = null,
        ?Request $request = null,
    ): AdminActivityLog {
        return AdminActivityLog::create([
            'admin_user_id' => $actor?->id,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'entity_name' => $entityName,
            'changes' => [
                'before' => $before,
                'after' => $after,
            ],
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }
}
