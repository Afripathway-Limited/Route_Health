<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facility_eta_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->tinyInteger('day_of_week');
            $table->tinyInteger('hour_of_day');
            $table->decimal('avg_delay_minutes', 6, 2)->default(0);
            $table->integer('sample_count')->default(0);
            $table->timestamp('computed_at')->useCurrent();
            $table->timestamps();

            $table->unique(
                ['facility_id', 'day_of_week', 'hour_of_day'],
                'facility_eta_day_hour_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facility_eta_adjustments');
    }
};