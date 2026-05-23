<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['facility_id']);
        });
        DB::statement('ALTER TABLE tasks MODIFY facility_id BIGINT UNSIGNED NULL');
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreign('facility_id')->references('id')->on('facilities')->nullOnDelete();
            $table->string('pickup_name')->nullable()->after('facility_id');
            $table->decimal('pickup_lat', 10, 7)->nullable()->after('pickup_name');
            $table->decimal('pickup_lng', 10, 7)->nullable()->after('pickup_lat');
            $table->string('dropoff_name')->nullable()->after('pickup_lng');
            $table->decimal('dropoff_lat', 10, 7)->nullable()->after('dropoff_name');
            $table->decimal('dropoff_lng', 10, 7)->nullable()->after('dropoff_lat');
            $table->foreignId('rider_id')->nullable()->constrained('riders')->nullOnDelete()->after('route_id');
        });
    }
    public function down(): void {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['rider_id']);
            $table->dropColumn(['pickup_name', 'pickup_lat', 'pickup_lng', 'dropoff_name', 'dropoff_lat', 'dropoff_lng', 'rider_id']);
        });
    }
};
