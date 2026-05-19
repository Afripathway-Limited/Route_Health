<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('address_line_1');
            $table->string('address_line_2')->nullable();
            $table->string('city');
            $table->string('country')->default('Kenya');
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->enum('facility_type', ['lab', 'clinic', 'hospital', 'pharmacy'])->default('clinic');
            $table->string('contact_name');
            $table->string('contact_phone');
            $table->text('special_notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('organization_id');
            $table->index(['organization_id', 'facility_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facilities');
    }
};
