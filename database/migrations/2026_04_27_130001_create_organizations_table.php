<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('country')->default('Kenya');
            $table->string('logo_url')->nullable();
            $table->string('primary_color', 7)->default('#10B981');
            $table->string('subdomain')->unique()->nullable();
            $table->string('whatsapp_phone')->nullable();
            $table->text('whatsapp_token')->nullable();
            $table->enum('whatsapp_provider', ['twilio', 'meta'])->nullable();
            $table->string('whatsapp_webhook_url')->nullable();
            $table->enum('status', ['active', 'suspended'])->default('active');
            $table->enum('subscription_plan', ['starter', 'professional', 'enterprise'])->default('starter');
            $table->integer('max_riders')->default(10);
            $table->integer('max_facilities')->default(20);
            $table->integer('max_tasks_per_month')->default(500);
            $table->json('notification_preferences')->nullable();
            $table->integer('photo_retention_months')->default(12);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
