<?php
namespace App\Services;

use App\Models\PlatformApiConfig;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIInsightsService
{
    private ?array $openAIConfig = null;

    public function __construct()
    {
        $record = PlatformApiConfig::where('service', 'openai')->where('is_enabled', true)->first();
        $this->openAIConfig = $record?->config;
    }

    private function isOpenAIAvailable(): bool
    {
        return !empty($this->openAIConfig['api_key']);
    }

    public function generateInsights(int $orgId, string $from, string $to, array $analyticsData): array
    {
        $cacheKey = "ai_insights_{$orgId}_{$from}_{$to}";
        return Cache::remember($cacheKey, 3600, function () use ($orgId, $from, $to, $analyticsData) {
            if ($this->isOpenAIAvailable()) {
                try {
                    return $this->openAIInsights($from, $to, $analyticsData);
                } catch (\Exception $e) {
                    Log::warning('OpenAI insights failed, falling back to rule-based: ' . $e->getMessage());
                }
            }
            return $this->ruleBasedInsights($analyticsData);
        });
    }

    private function openAIInsights(string $from, string $to, array $data): array
    {
        $orgName = $data['org_name'] ?? 'the organization';
        $prompt = "You are an AI analytics assistant for RouteHealth, a medical logistics platform in Africa.\nAnalyze this operations data and provide 3-5 specific, actionable insights.\n\nOrganization: {$orgName}\nPeriod: {$from} to {$to}\nCompletion Rate: " . ($data['completion_rate'] ?? 0) . "%\nTotal Routes: " . ($data['total_routes'] ?? 0) . "\nTotal Tasks: " . ($data['total_tasks'] ?? 0) . "\nFailed Tasks: " . ($data['failed_tasks'] ?? 0) . "\nDisputed Deliveries: " . ($data['disputed_count'] ?? 0) . "\nAverage Delay: " . ($data['avg_delay_minutes'] ?? 0) . " minutes\n\nRespond with ONLY a valid JSON array. Each insight: {\"type\": \"success|warning|danger|info\", \"icon\": \"trophy|alert|clock|zap|user|info\", \"title\": \"short title\", \"description\": \"2 sentence actionable description\", \"action\": null, \"action_url\": null}";

        $res = Http::withToken($this->openAIConfig['api_key'])
            ->timeout(15)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => $this->openAIConfig['model'] ?? 'gpt-3.5-turbo',
                'messages' => [['role' => 'user', 'content' => $prompt]],
                'max_tokens' => $this->openAIConfig['max_tokens'] ?? 800,
                'temperature' => (float)($this->openAIConfig['temperature'] ?? 0.3),
            ]);

        if (!$res->successful()) {
            throw new \RuntimeException('OpenAI API error: ' . $res->body());
        }

        $content = $res->json('choices.0.message.content', '[]');
        // Strip markdown code fences if present
        $content = preg_replace('/```(?:json)?\s*|\s*```/', '', $content);
        $insights = json_decode(trim($content), true) ?? [];

        return array_map(fn($i) => array_merge([
            'type' => 'info', 'icon' => 'info', 'title' => '', 'description' => '', 'action' => null, 'action_url' => null,
        ], $i), $insights);
    }

    private function ruleBasedInsights(array $data): array
    {
        $insights = [];
        $rate = $data['completion_rate'] ?? 0;
        $avgDelay = $data['avg_delay_minutes'] ?? 0;
        $disputed = $data['disputed_count'] ?? 0;
        $failed = $data['failed_tasks'] ?? 0;

        if ($rate >= 95) {
            $insights[] = ['type' => 'success', 'icon' => 'trophy', 'title' => 'Excellent Completion Rate', 'description' => "Operations are running at {$rate}% completion. This is above the 95% industry benchmark for medical logistics.", 'action' => null, 'action_url' => null];
        } elseif ($rate < 80) {
            $insights[] = ['type' => 'danger', 'icon' => 'alert', 'title' => 'Low Completion Rate', 'description' => "Completion rate of {$rate}% is below the 80% threshold. Review failed stops and rider performance to identify bottlenecks.", 'action' => 'View Analytics', 'action_url' => '/admin/analytics'];
        }

        if ($avgDelay > 30) {
            $insights[] = ['type' => 'warning', 'icon' => 'clock', 'title' => 'High Average Delay', 'description' => "Average delay of {$avgDelay} minutes is impacting lab turnaround times. Consider adjusting route time windows or adding riders to high-delay routes.", 'action' => 'View SLA Report', 'action_url' => '/admin/analytics'];
        }

        if ($disputed > 3) {
            $insights[] = ['type' => 'danger', 'icon' => 'alert', 'title' => 'Multiple Disputed Deliveries', 'description' => "{$disputed} disputed deliveries detected. Review chain-of-custody photos and follow up with labs to resolve disputes.", 'action' => 'Review Disputes', 'action_url' => '/dispatcher'];
        }

        if ($failed > 5) {
            $insights[] = ['type' => 'warning', 'icon' => 'zap', 'title' => 'Failed Pickup Pattern', 'description' => "{$failed} failed pickups recorded. Check if specific facilities or time slots are causing failures and reschedule accordingly.", 'action' => 'View Routes', 'action_url' => '/dispatcher/routes'];
        }

        if (empty($insights)) {
            $insights[] = ['type' => 'info', 'icon' => 'info', 'title' => 'Operations Nominal', 'description' => 'All key metrics are within normal ranges for this period. Continue monitoring for any emerging trends.', 'action' => null, 'action_url' => null];
        }

        return $insights;
    }

    public function generateAnomalyDescription(string $type, string $riderName, ?string $facilityName, array $context): string
    {
        if (!$this->isOpenAIAvailable()) {
            return $this->defaultAnomalyDescription($type, $riderName, $facilityName, $context);
        }

        try {
            $prompt = "Generate a concise, actionable anomaly alert (1-2 sentences) for a medical logistics dispatcher.\nAnomaly: {$type}\nRider: {$riderName}\nFacility: " . ($facilityName ?? 'unknown') . "\nContext: " . json_encode($context) . "\nBe specific with names and numbers. Do NOT use markdown.";

            $res = Http::withToken($this->openAIConfig['api_key'])
                ->timeout(8)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => $this->openAIConfig['model'] ?? 'gpt-3.5-turbo',
                    'messages' => [['role' => 'user', 'content' => $prompt]],
                    'max_tokens' => 80,
                    'temperature' => 0.2,
                ]);

            return $res->json('choices.0.message.content', $this->defaultAnomalyDescription($type, $riderName, $facilityName, $context));
        } catch (\Exception) {
            return $this->defaultAnomalyDescription($type, $riderName, $facilityName, $context);
        }
    }

    private function defaultAnomalyDescription(string $type, string $riderName, ?string $facilityName, array $context): string
    {
        return match($type) {
            'stationary_too_long' => "{$riderName} has been stationary for " . ($context['minutes'] ?? 20) . " minutes" . ($facilityName ? " near {$facilityName}" : '') . ".",
            'overdue_stop' => "{$riderName}'s stop at " . ($facilityName ?? 'a facility') . " is overdue by " . ($context['minutes'] ?? 30) . " minutes.",
            'rider_offline' => "{$riderName} has been offline for " . ($context['minutes'] ?? 15) . " minutes. Last known location unavailable.",
            'route_deviation' => "{$riderName} has deviated " . ($context['meters'] ?? 500) . "m from the planned route.",
            default => "{$riderName}: {$type} detected.",
        };
    }

    public function suggestRouteImprovements(array $optimizationResult): array
    {
        if (!$this->isOpenAIAvailable()) return [];

        try {
            $summary = collect($optimizationResult)->map(fn($r) => [
                'rider' => $r['rider_name'] ?? 'Rider',
                'stops' => count($r['stops'] ?? []),
                'distance_km' => $r['total_distance_km'] ?? 0,
                'areas' => collect($r['stops'] ?? [])->pluck('city')->unique()->values(),
            ])->toArray();

            $prompt = "You are a logistics optimization expert. Analyze this route assignment and provide 1-3 specific improvement suggestions in JSON format.\n\nRoute assignments:\n" . json_encode($summary) . "\n\nRespond with ONLY a JSON array of suggestion strings. Example: [\"Consider reassigning stops X and Y to reduce total distance\"]";

            $res = Http::withToken($this->openAIConfig['api_key'])
                ->timeout(10)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => $this->openAIConfig['model'] ?? 'gpt-3.5-turbo',
                    'messages' => [['role' => 'user', 'content' => $prompt]],
                    'max_tokens' => 300,
                    'temperature' => 0.3,
                ]);

            $content = preg_replace('/```(?:json)?\s*|\s*```/', '', $res->json('choices.0.message.content', '[]'));
            return json_decode(trim($content), true) ?? [];
        } catch (\Exception) {
            return [];
        }
    }

    public function generateAiSummary(int $orgId, array $data): array
    {
        $cacheKey = "ai_summary_{$orgId}_" . now()->format('Y-m-d');
        return Cache::remember($cacheKey, 1800, function () use ($data) {
            $paragraph = $this->isOpenAIAvailable()
                ? $this->openAISummaryParagraph($data)
                : $this->ruleBasedSummaryParagraph($data);

            return [
                'summary' => $paragraph,
                'predicted_completion_rate' => $data['predicted_completion'] ?? null,
                'top_risk' => $data['top_risk'] ?? null,
                'best_performer' => $data['best_performer'] ?? null,
                'powered_by_ai' => $this->isOpenAIAvailable(),
            ];
        });
    }

    private function openAISummaryParagraph(array $data): string
    {
        try {
            $prompt = "Write a 2-sentence natural language operations summary for a medical logistics manager. Today's stats: " . json_encode($data) . ". Be specific, professional, and concise. No markdown.";
            $res = Http::withToken($this->openAIConfig['api_key'])
                ->timeout(10)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => $this->openAIConfig['model'] ?? 'gpt-3.5-turbo',
                    'messages' => [['role' => 'user', 'content' => $prompt]],
                    'max_tokens' => 120,
                    'temperature' => 0.4,
                ]);
            return $res->json('choices.0.message.content', $this->ruleBasedSummaryParagraph($data));
        } catch (\Exception) {
            return $this->ruleBasedSummaryParagraph($data);
        }
    }

    private function ruleBasedSummaryParagraph(array $data): string
    {
        $rate = $data['completion_rate'] ?? 0;
        $routes = $data['total_routes'] ?? 0;
        $failed = $data['failed_tasks'] ?? 0;
        $status = $rate >= 90 ? 'strong' : ($rate >= 75 ? 'moderate' : 'below target');
        return "Today's operations show {$status} performance with {$routes} routes dispatched and a {$rate}% completion rate." .
            ($failed > 0 ? " {$failed} failed stops require attention and should be reassigned for tomorrow." : " All stops are tracking within expected parameters.");
    }
}
