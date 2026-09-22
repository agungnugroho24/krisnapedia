<?php

namespace App\Http\Controllers;

use App\Services\WhatsNewService;
use Illuminate\Http\Request;

class WhatsNewController extends Controller
{
    public function __construct(private readonly WhatsNewService $whatsNew)
    {
    }

    public function index(Request $request)
    {
        $filters = $request->validate([
            'year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'sub_system_id' => ['nullable', 'integer', 'exists:sub_systems,id'],
            'category' => ['nullable', 'string', 'max:80'],
            'search' => ['nullable', 'string', 'max:200'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        return $this->whatsNew->list($filters);
    }
}
