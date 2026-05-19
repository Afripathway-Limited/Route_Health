<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('platform_api_configs', function (Blueprint $table) {
            $table->id();
            $table->string('service')->unique(); // openai, twilio, pusher, aws_s3, google_maps
            $table->text('config_data'); // Laravel-encrypted JSON
            $table->boolean('is_enabled')->default(false);
            $table->timestamp('last_tested_at')->nullable();
            $table->enum('test_status', ['success', 'failed', 'untested'])->default('untested');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('platform_api_configs');
    }
};
