<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Facility;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $query = Task::forOrganization($orgId)->with(['facility', 'routeStop.route.rider']);

        if ($request->date) {
            $query->forDate($request->date);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->facility_id) {
            $query->where('facility_id', $request->facility_id);
        }

        if ($request->priority) {
            $query->where('priority', $request->priority);
        }

        if ($request->unassigned) {
            $query->unassigned();
        }

        $tasks = $query->latest()->paginate(50);
        $data = $tasks->map(fn($t) => $this->formatTask($t));

        return $this->paginated($tasks->setCollection($data));
    }

    public function store(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $request->validate([
            'facility_id' => "required|exists:facilities,id",
            'type' => 'required|in:pickup,delivery',
            'scheduled_date' => 'required|date',
            'time_window_start' => 'required|date_format:H:i',
            'time_window_end' => 'required|date_format:H:i|after:time_window_start',
            'priority' => 'required|in:standard,urgent',
            'notes' => 'nullable|string',
        ]);

        // Verify facility belongs to org
        $facility = Facility::where('id', $request->facility_id)
            ->where('organization_id', $orgId)
            ->firstOrFail();

        $task = Task::create([
            ...$request->only(['facility_id', 'type', 'scheduled_date', 'time_window_start', 'time_window_end', 'priority', 'notes']),
            'organization_id' => $orgId,
            'status' => 'planned',
            'created_by' => $request->user()->id,
        ]);

        return $this->success($this->formatTask($task->load('facility')), 'Task created', 201);
    }

    public function show(Request $request, Task $task): JsonResponse
    {
        $this->authorizeOrg($request, $task);
        return $this->success($this->formatTask($task->load(['facility', 'routeStop.route.rider', 'routeStop.custodyPhotos'])));
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $this->authorizeOrg($request, $task);

        if ($task->status !== 'planned') {
            return $this->error('Cannot edit a task that is already assigned or in progress', 422);
        }

        $request->validate([
            'facility_id' => 'sometimes|exists:facilities,id',
            'type' => 'sometimes|in:pickup,delivery',
            'scheduled_date' => 'sometimes|date',
            'time_window_start' => 'sometimes|date_format:H:i',
            'time_window_end' => 'sometimes|date_format:H:i',
            'priority' => 'sometimes|in:standard,urgent',
            'notes' => 'nullable|string',
        ]);

        $task->update($request->only(['facility_id', 'type', 'scheduled_date', 'time_window_start', 'time_window_end', 'priority', 'notes']));

        return $this->success($this->formatTask($task->load('facility')), 'Task updated');
    }

    public function destroy(Request $request, Task $task): JsonResponse
    {
        $this->authorizeOrg($request, $task);

        if (!in_array($task->status, ['planned'])) {
            return $this->error('Cannot delete a task that is assigned or in progress', 422);
        }

        $task->delete();
        return $this->success(null, 'Task deleted');
    }

    public function bulkUpload(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt']);

        $orgId = $request->user()->organization_id;
        $file = $request->file('file');
        $handle = fopen($file->getRealPath(), 'r');
        $header = fgetcsv($handle);

        $valid = [];
        $errors = [];
        $row = 1;

        while (($line = fgetcsv($handle)) !== false) {
            $row++;
            if (count($line) < 5) {
                $errors[] = ['row' => $row, 'column' => 'general', 'error' => 'Insufficient columns'];
                continue;
            }

            [$facilityName, $date, $timeStart, $timeEnd, $priority] = $line;

            $facility = Facility::where('organization_id', $orgId)
                ->where('name', 'like', "%{$facilityName}%")
                ->first();

            if (!$facility) {
                $errors[] = ['row' => $row, 'column' => 'facility_name', 'error' => "Facility '{$facilityName}' not found"];
                continue;
            }

            if (!strtotime($date)) {
                $errors[] = ['row' => $row, 'column' => 'scheduled_date', 'error' => "Invalid date: {$date}"];
                continue;
            }

            $valid[] = [
                'organization_id' => $orgId,
                'facility_id' => $facility->id,
                'type' => 'pickup',
                'scheduled_date' => date('Y-m-d', strtotime($date)),
                'time_window_start' => $timeStart . ':00',
                'time_window_end' => $timeEnd . ':00',
                'priority' => in_array(strtolower($priority), ['urgent', 'standard']) ? strtolower($priority) : 'standard',
                'status' => 'planned',
                'created_by' => $request->user()->id,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        fclose($handle);

        if (!empty($valid) && $request->import) {
            Task::insert($valid);
        }

        return $this->success([
            'valid_count' => count($valid),
            'error_count' => count($errors),
            'errors' => $errors,
            'imported' => !empty($valid) && $request->import ? count($valid) : 0,
        ]);
    }

    private function formatTask(Task $t): array
    {
        $rider = $t->routeStop?->route?->rider;

        return [
            'id' => $t->id,
            'short_id' => strtoupper(substr(dechex($t->id), -6)),
            'facility' => $t->facility ? [
                'id' => $t->facility->id,
                'name' => $t->facility->name,
                'city' => $t->facility->city,
                'latitude' => (float) $t->facility->latitude,
                'longitude' => (float) $t->facility->longitude,
                'contact_phone' => $t->facility->contact_phone,
                'facility_type' => $t->facility->facility_type,
            ] : null,
            'type' => $t->type,
            'scheduled_date' => $t->scheduled_date?->format('Y-m-d'),
            'time_window_start' => $t->time_window_start,
            'time_window_end' => $t->time_window_end,
            'time_window_display' => $t->time_window_display,
            'priority' => $t->priority,
            'status' => $t->status,
            'notes' => $t->notes,
            'route_id' => $t->route_id,
            'assigned_rider' => $rider ? ['id' => $rider->id, 'name' => $rider->name] : null,
            'created_at' => $t->created_at,
        ];
    }

    public function reassign(Request $request, Task $task): JsonResponse
    {
        $this->authorizeOrg($request, $task);

        if (!in_array($task->status, ['failed', 'disputed'])) {
            return $this->error('Only failed or disputed tasks can be reassigned', 422);
        }

        $data = $request->validate([
            'new_date' => 'required|date|after_or_equal:today',
            'new_time_window_start' => 'nullable|date_format:H:i',
            'new_time_window_end' => 'nullable|date_format:H:i',
            'priority' => 'nullable|in:standard,urgent',
        ]);

        $old = $task->only(['status', 'scheduled_date', 'time_window_start', 'time_window_end', 'route_id']);

        $task->update([
            'status' => 'planned',
            'route_id' => null,
            'scheduled_date' => $data['new_date'],
            'time_window_start' => $data['new_time_window_start'] ?? $task->time_window_start,
            'time_window_end' => $data['new_time_window_end'] ?? $task->time_window_end,
            'priority' => $data['priority'] ?? $task->priority,
        ]);

        \App\Services\AuditLogger::log('task.reassigned', $task, $old, $task->fresh()->toArray(), $request);

        return $this->success($this->formatTask($task->fresh()), "Stop reassigned for {$data['new_date']}");
    }

    private function authorizeOrg(Request $request, Task $task): void
    {
        if ($task->organization_id !== $request->user()->organization_id) {
            abort(403, 'Access denied');
        }
    }
}
