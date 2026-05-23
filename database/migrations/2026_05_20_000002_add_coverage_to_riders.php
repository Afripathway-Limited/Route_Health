<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        // Drop the NOT NULL constraint on organization_id by dropping FK, altering, re-adding FK
        Schema::table('riders', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
        });
        DB::statement('ALTER TABLE riders MODIFY organization_id BIGINT UNSIGNED NULL');
        Schema::table('riders', function (Blueprint $table) {
            $table->foreign('organization_id')->references('id')->on('organizations')->nullOnDelete();
            $table->string('coverage_city')->nullable()->after('vehicle_type');
            $table->decimal('coverage_lat', 10, 7)->nullable()->after('coverage_city');
            $table->decimal('coverage_lng', 10, 7)->nullable()->after('coverage_lat');
            $table->unsignedSmallInteger('coverage_radius_km')->default(20)->after('coverage_lng');
            $table->enum('availability_status', ['free', 'on_route', 'busy', 'unavailable'])->default('free')->after('is_active');
        });
    }
    public function down(): void {
        Schema::table('riders', function (Blueprint $table) {
            $table->dropColumn(['coverage_city', 'coverage_lat', 'coverage_lng', 'coverage_radius_km', 'availability_status']);
        });
        DB::statement('UPDATE riders SET organization_id = 1 WHERE organization_id IS NULL');
        Schema::table('riders', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
        });
        DB::statement('ALTER TABLE riders MODIFY organization_id BIGINT UNSIGNED NOT NULL');
        Schema::table('riders', function (Blueprint $table) {
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
        });
    }
};
