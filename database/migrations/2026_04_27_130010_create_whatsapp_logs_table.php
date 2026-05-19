<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('to_phone');
            $table->enum('message_type', ['dispatch', 'on_way', 'delivery_confirmation', 'failed_alert', 'dispute_alert']);
            $table->text('message_body');
            $table->enum('status', ['pending', 'sent', 'delivered', 'read', 'failed'])->default('pending');
            $table->foreignId('stop_id')->nullable()->constrained('route_stops')->nullOnDelete();
            $table->foreignId('rider_id')->nullable()->constrained()->nullOnDelete();
            $table->string('twilio_sid')->nullable();
            $table->dateTime('sent_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index('organization_id');
            $table->index(['stop_id', 'message_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_logs');
    }
};
