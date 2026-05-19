<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('rider_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->enum('status', ['planned', 'assigned', 'in_progress', 'completed', 'cancelled'])->default('planned');
            $table->decimal('depot_latitude', 10, 8)->nullable();
            $table->decimal('depot_longitude', 11, 8)->nullable();
            $table->dateTime('planned_start_time')->nullable();
            $table->dateTime('planned_end_time')->nullable();
            $table->dateTime('actual_start_time')->nullable();
            $table->dateTime('actual_end_time')->nullable();
            $table->decimal('total_distance_km', 8, 2)->nullable();
            $table->integer('total_stops')->default(0);
            $table->json('optimization_data')->nullable();
            $table->timestamps();

            $table->index('organization_id');
            $table->index(['organization_id', 'date']);
            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('routes');
    }
};
