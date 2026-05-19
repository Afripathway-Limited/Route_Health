<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('anomaly_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('route_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('rider_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('route_stop_id')->nullable()->constrained('route_stops')->nullOnDelete();
            $table->enum('alert_type', [
                'stationary_too_long', 'route_deviation',
                'overdue_stop', 'sample_delay', 'rider_offline'
            ]);
            $table->text('description');
            $table->enum('severity', ['warning', 'critical'])->default('warning');
            $table->dateTime('triggered_at');
            $table->dateTime('resolved_at')->nullable();
            $table->foreignId('acknowledged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_dismissed')->default(false);
            $table->timestamps();

            $table->index('organization_id');
            $table->index(['organization_id', 'is_dismissed']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('anomaly_alerts');
    }
};
