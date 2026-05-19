<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithStrictNullComparison;
use Maatwebsite\Excel\Concerns\WithTitle;

class AnalyticsExport implements WithMultipleSheets
{
    use Exportable;

    public function __construct(
        private readonly array $summary,
        private readonly array $daily,
        private readonly array $riders,
        private readonly array $facilities,
        private readonly string $from,
        private readonly string $to,
        private readonly string $orgName,
    ) {}

    public function sheets(): array
    {
        return [
            new class($this->summary, $this->from, $this->to, $this->orgName) implements FromCollection, WithTitle, WithHeadings, ShouldAutoSize, WithStrictNullComparison {
                use Exportable;
                public function __construct(private array $s, private string $from, private string $to, private string $org) {}
                public function title(): string { return 'Summary'; }
                public function headings(): array { return ['Metric', 'Value']; }
                public function collection(): Collection {
                    return collect([
                        ['Organization', $this->org],
                        ['Report Period', "{$this->from} to {$this->to}"],
                        ['Total Routes', $this->s['total_routes'] ?? 0],
                        ['Completed Routes', $this->s['completed_routes'] ?? 0],
                        ['Total Tasks', $this->s['total_tasks'] ?? 0],
                        ['Completed Tasks', $this->s['completed_tasks'] ?? 0],
                        ['Failed Tasks', $this->s['failed_tasks'] ?? 0],
                        ['Disputed Tasks', $this->s['disputed_tasks'] ?? 0],
                        ['Completion Rate (%)', $this->s['completion_rate'] ?? 0],
                        ['Avg Delay (minutes)', $this->s['avg_delay_minutes'] ?? 0],
                        ['Dispute Rate (%)', $this->s['dispute_rate'] ?? 0],
                        ['Total Distance (km)', $this->s['total_distance_km'] ?? 0],
                    ]);
                }
            },

            new class($this->daily) implements FromCollection, WithTitle, WithHeadings, ShouldAutoSize, WithStrictNullComparison {
                use Exportable;
                public function __construct(private array $daily) {}
                public function title(): string { return 'Daily Breakdown'; }
                public function headings(): array { return ['Date', 'Day', 'Completed', 'Failed', 'Disputed', 'Total', 'Routes Created']; }
                public function collection(): Collection {
                    return collect($this->daily)->map(fn($d) => [
                        $d['date'] ?? '',
                        $d['day_label'] ?? '',
                        $d['completed'] ?? 0,
                        $d['failed'] ?? 0,
                        $d['disputed'] ?? 0,
                        $d['total'] ?? 0,
                        $d['routes_created'] ?? 0,
                    ]);
                }
            },

            new class($this->riders) implements FromCollection, WithTitle, WithHeadings, ShouldAutoSize, WithStrictNullComparison {
                use Exportable;
                public function __construct(private array $riders) {}
                public function title(): string { return 'Rider Performance'; }
                public function headings(): array {
                    return ['Rider Name', 'Vehicle Type', 'Routes', 'Total Tasks', 'Completed', 'On-Time Count', 'On-Time Rate (%)', 'Avg Delay (min)'];
                }
                public function collection(): Collection {
                    return collect($this->riders)->map(fn($r) => [
                        $r['name'] ?? '',
                        $r['vehicle_type'] ?? '',
                        $r['route_count'] ?? 0,
                        $r['total_stops'] ?? 0,
                        $r['total_stops'] ?? 0,
                        round(($r['on_time_rate'] ?? 0) / 100 * ($r['total_stops'] ?? 0)),
                        $r['on_time_rate'] ?? 0,
                        $r['avg_delay_minutes'] ?? 0,
                    ]);
                }
            },

            new class($this->facilities) implements FromCollection, WithTitle, WithHeadings, ShouldAutoSize, WithStrictNullComparison {
                use Exportable;
                public function __construct(private array $facilities) {}
                public function title(): string { return 'Facility Performance'; }
                public function headings(): array {
                    return ['Facility Name', 'City', 'Type', 'Total Pickups', 'Avg Delay (min)', 'Disputes'];
                }
                public function collection(): Collection {
                    return collect($this->facilities)->map(fn($f) => [
                        $f['name'] ?? '',
                        $f['city'] ?? '',
                        $f['facility_type'] ?? '',
                        $f['pickup_count'] ?? 0,
                        $f['avg_delay_minutes'] ?? 0,
                        $f['dispute_count'] ?? 0,
                    ]);
                }
            },
        ];
    }
}
