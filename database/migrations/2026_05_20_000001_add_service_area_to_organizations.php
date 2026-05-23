<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('service_city')->nullable()->after('country');
            $table->decimal('service_lat', 10, 7)->nullable()->after('service_city');
            $table->decimal('service_lng', 10, 7)->nullable()->after('service_lat');
            $table->unsignedSmallInteger('service_radius_km')->default(30)->after('service_lng');
        });
    }
    public function down(): void {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn(['service_city', 'service_lat', 'service_lng', 'service_radius_km']);
        });
    }
};
