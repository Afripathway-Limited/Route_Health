<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('route_stops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('route_id')->constrained()->cascadeOnDelete();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->integer('sequence');
            $table->dateTime('planned_arrival');
            $table->dateTime('planned_departure')->nullable();
            $table->dateTime('actual_arrival')->nullable();
            $table->dateTime('actual_departure')->nullable();
            $table->enum('status', [
                'pending', 'arrived', 'photo_taken', 'collected',
                'delivered', 'failed', 'disputed', 'confirmed_delivered'
            ])->default('pending');
            $table->string('fail_reason')->nullable();
            $table->text('fail_notes')->nullable();
            $table->boolean('whatsapp_sent')->default(false);
            $table->dateTime('whatsapp_sent_at')->nullable();
            $table->timestamps();

            $table->index('route_id');
            $table->index('task_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('route_stops');
    }
};
