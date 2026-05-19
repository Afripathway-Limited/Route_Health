<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('route_stop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('from_phone');
            $table->enum('response', ['yes', 'no']);
            $table->string('raw_message');
            $table->dateTime('received_at');
            $table->dateTime('processed_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['from_phone', 'route_stop_id']);
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_confirmations');
    }
};
