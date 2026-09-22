<?php

use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\AdminActivityLogController;
use App\Http\Controllers\AdminRoleController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AdminWhatsNewController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ContentController;
use App\Http\Controllers\ContentViewController;
use App\Http\Controllers\FaqController;
use App\Http\Controllers\FaqInquiryController;
use App\Http\Controllers\StudioTaxonomyController;
use App\Http\Controllers\SubCategoryController;
use App\Http\Controllers\SubSystemController;
use App\Http\Controllers\WhatsNewController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('storage/preview', [ContentController::class, 'previewAsset'])->name('api.storage.preview')->middleware('signed');
    Route::get('views', [ContentViewController::class, 'index']);
    Route::post('views/increment', [ContentViewController::class, 'increment']);

    Route::post('auth/login', [AdminAuthController::class, 'login']);
    Route::post('auth/forgot-password', [AdminAuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('auth/reset-password', [AdminAuthController::class, 'resetPassword'])->middleware('throttle:5,1');
    Route::get('faq-inquiries/captcha', [FaqInquiryController::class, 'captcha'])->middleware('throttle:10,1');
    Route::post('faq-inquiries', [FaqInquiryController::class, 'store'])->middleware('throttle:5,1');
    Route::get('sub-systems', [SubSystemController::class, 'index']);
    Route::get('whats-new', [WhatsNewController::class, 'index']);

    Route::middleware('admin')->group(function (): void {
        Route::get('auth/me', [AdminAuthController::class, 'me']);
        Route::post('auth/logout', [AdminAuthController::class, 'logout']);

        Route::middleware('role:admin')->group(function (): void {
            Route::get('activity-logs', [AdminActivityLogController::class, 'index']);
            Route::apiResource('admin-users', AdminUserController::class);
            Route::apiResource('roles', AdminRoleController::class);
        });

        Route::middleware('role:operator')->group(function (): void {
            foreach (['insights' => 'insight', 'manuals' => 'manual', 'regulations' => 'regulation'] as $uri => $type) {
                Route::apiResource($uri, ContentController::class)
                    ->parameters([$uri => 'content']);

                Route::get($uri, [ContentController::class, 'index'])
                    ->defaults('content_type', $type);

                Route::get($uri.'/{content:slug}', [ContentController::class, 'show'])
                    ->defaults('content_type', $type);
            }
            Route::get('studio/taxonomy/{content_type}', [StudioTaxonomyController::class, 'show']);
            Route::apiResource('categories', CategoryController::class);
            Route::apiResource('sub-categories', SubCategoryController::class);
            Route::apiResource('sub-systems', SubSystemController::class)->except(['index']);
            Route::post('whats-new-items/sync', [AdminWhatsNewController::class, 'sync']);
            Route::apiResource('whats-new-items', AdminWhatsNewController::class)
                ->only(['index', 'update', 'destroy'])
                ->parameters(['whats-new-items' => 'whatsNewItem']);
            Route::apiResource('faqs', FaqController::class);
        });
    });

    foreach (['insights' => 'insight', 'manuals' => 'manual', 'regulations' => 'regulation'] as $uri => $type) {
        Route::get($uri, [ContentController::class, 'index'])->defaults('content_type', $type);
        Route::get($uri.'/{content:slug}', [ContentController::class, 'show'])->defaults('content_type', $type);
    }
    Route::get('faqs', [FaqController::class, 'index']);
});





