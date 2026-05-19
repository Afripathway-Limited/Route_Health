<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('requires_password_change')->default(false)->after('is_active');
        });

        Schema::create('sync_events', function (Blueprint $table) {
            $table->id();
            $table->string('device_event_id', 100);
            $table->unsignedBigInteger('rider_id');
            $table->string('event_type', 50);
            $table->timestamp('processed_at');
            $table->unique(['device_event_id', 'rider_id'], 'sync_events_device_rider_unique');
            $table->index('rider_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('requires_password_change');
        });
        Schema::dropIfExists('sync_events');
    }
};
