<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custody_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('route_stop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->enum('photo_type', ['pickup', 'delivery']);
            $table->string('photo_url');
            $table->string('thumbnail_url')->nullable();
            $table->string('s3_key')->nullable();
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->dateTime('taken_at');
            $table->dateTime('uploaded_at')->nullable();
            $table->string('device_id')->nullable();
            $table->boolean('is_offline_upload')->default(false);
            $table->timestamps();

            $table->index(['route_stop_id', 'photo_type']);
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custody_photos');
    }
};
