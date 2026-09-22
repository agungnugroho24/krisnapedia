<?php

namespace App\Http\Controllers;

use App\Models\AdminActivityLog;
use Illuminate\Http\Request;

class AdminActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $q = AdminActivityLog::query()->with(['adminUser.roleRecord'])->orderByDesc('id');
        $search = trim((string) $request->input('search', ''));
        $action = trim((string) $request->input('action', ''));
        $entityType = trim((string) $request->input('entity_type', ''));

        if ($search !== '') {
            $like = '%' . $search . '%';
            $q->where(function ($query) use ($like): void {
                $query->where('action', 'like', $like)
                    ->orWhere('entity_type', 'like', $like)
                    ->orWhere('entity_id', 'like', $like)
                    ->orWhere('entity_name', 'like', $like)
                    ->orWhere('ip_address', 'like', $like)
                    ->orWhereHas('adminUser', function ($adminUser) use ($like): void {
                        $adminUser->where('name', 'like', $like)
                            ->orWhere('email', 'like', $like)
                            ->orWhere('role', 'like', $like);
                    });
            });
        }

        if ($action !== '') {
            $q->where('action', $action);
        }

        if ($entityType !== '') {
            $q->where('entity_type', $entityType);
        }

        return ['data' => $q->paginate($request->integer('per_page', 30))];
    }
}
