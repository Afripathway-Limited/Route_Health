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
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('display_name');
            $table->decimal('price_usd_monthly', 8, 2)->default(0);
            $table->decimal('price_usd_annual', 8, 2)->default(0);
            $table->unsignedInteger('max_riders')->default(10);
            $table->unsignedInteger('max_facilities')->default(20);
            $table->unsignedInteger('max_tasks_per_month')->default(500);
            $table->unsignedInteger('max_dispatchers')->default(2);
            $table->json('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_public')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
