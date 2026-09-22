<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\Process\Exception\ProcessStartFailedException;
use Symfony\Component\Process\Process;

class PresentationPreviewService
{
    private const PRESENTATION_EXTENSIONS = ['ppt', 'pptx', 'key', 'odp'];

    public function isPresentationPath(string $path): bool
    {
        return in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), self::PRESENTATION_EXTENSIONS, true);
    }

    public function ensurePreviewPdf(string $path): string
    {
        if (!$this->isPresentationPath($path)) {
            return $path;
        }

        $disk = Storage::disk('public');
        $previewPath = $this->previewPathFromSource($path);

        if ($disk->exists($previewPath)) {
            return $previewPath;
        }

        $sourceFullPath = $disk->path($path);
        if (!is_file($sourceFullPath)) {
            throw new RuntimeException('Presentation source file not found.');
        }

        $sourceSignature = sprintf('%s|%s|%s', $sourceFullPath, (string) filemtime($sourceFullPath), (string) filesize($sourceFullPath));
        $tempDir = storage_path('app/tmp/presentation-preview/' . sha1($sourceSignature));
        if (!is_dir($tempDir) && !mkdir($tempDir, 0775, true) && !is_dir($tempDir)) {
            throw new RuntimeException('Unable to create preview temp directory.');
        }

        $generatedPdf = $this->convertToPdf($sourceFullPath, $tempDir);

        if (!is_file($generatedPdf)) {
            throw new RuntimeException('Presentation preview PDF was not generated.');
        }

        $previewDirectory = dirname($previewPath);
        if ($previewDirectory !== '.' && !$disk->exists($previewDirectory)) {
            $disk->makeDirectory($previewDirectory);
        }

        $disk->put($previewPath, file_get_contents($generatedPdf));

        return $previewPath;
    }

    private function convertToPdf(string $sourceFullPath, string $tempDir): string
    {
        $candidates = ['soffice', 'libreoffice'];
        $lastException = null;

        foreach ($candidates as $binary) {
            try {
                $process = new Process([
                    $binary,
                    '--headless',
                    '--nologo',
                    '--nofirststartwizard',
                    '--nodefault',
                    '--nolockcheck',
                    '--convert-to',
                    'pdf',
                    '--outdir',
                    $tempDir,
                    $sourceFullPath,
                ]);
                $process->setTimeout(300);
                $process->run();

                if (!$process->isSuccessful()) {
                    $lastException = new RuntimeException(trim($process->getErrorOutput() ?: $process->getOutput()) ?: 'Office conversion failed.');
                    continue;
                }

                $generatedPdf = $tempDir . DIRECTORY_SEPARATOR . pathinfo($sourceFullPath, PATHINFO_FILENAME) . '.pdf';
                if (is_file($generatedPdf)) {
                    return $generatedPdf;
                }

                $fallback = glob($tempDir . DIRECTORY_SEPARATOR . '*.pdf');
                if ($fallback && is_file($fallback[0])) {
                    return $fallback[0];
                }

                $lastException = new RuntimeException('Office conversion finished, but no PDF was produced.');
            } catch (ProcessStartFailedException $e) {
                $lastException = $e;
            }
        }

        throw $lastException instanceof RuntimeException
            ? $lastException
            : new RuntimeException('LibreOffice / soffice is not available on this server.');
    }

    private function previewPathFromSource(string $path): string
    {
        $directory = trim(dirname($path), '.');
        $filename = pathinfo($path, PATHINFO_FILENAME);
        $preview = $filename . '.preview.pdf';

        return $directory !== '' ? $directory . '/' . $preview : $preview;
    }
}
