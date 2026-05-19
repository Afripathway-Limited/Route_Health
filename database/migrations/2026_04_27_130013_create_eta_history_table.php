<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('eta_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('route_stop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->foreignId('rider_id')->constrained()->cascadeOnDelete();
            $table->dateTime('planned_arrival');
            $table->dateTime('actual_arrival')->nullable();
            $table->integer('delay_minutes')->nullable();
            $table->tinyInteger('day_of_week');
            $table->tinyInteger('hour_of_day');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['facility_id', 'day_of_week', 'hour_of_day']);
            $table->index('rider_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eta_history');
    }
};
