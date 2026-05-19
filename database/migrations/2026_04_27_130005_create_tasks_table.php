<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['pickup', 'delivery'])->default('pickup');
            $table->date('scheduled_date');
            $table->time('time_window_start');
            $table->time('time_window_end');
            $table->enum('priority', ['standard', 'urgent'])->default('standard');
            $table->enum('status', ['planned', 'assigned', 'in_progress', 'completed', 'failed', 'disputed'])->default('planned');
            $table->unsignedBigInteger('route_id')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index('organization_id');
            $table->index(['organization_id', 'scheduled_date']);
            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
