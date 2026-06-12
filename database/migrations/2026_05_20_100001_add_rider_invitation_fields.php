<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // email on riders so invite can be sent before user account exists
        Schema::table('riders', function (Blueprint $table) {
            $table->string('email')->nullable()->unique()->after('phone');
        });

        // invitation token on users (null once accepted)
        Schema::table('users', function (Blueprint $table) {
            $table->string('invitation_token', 64)->nullable()->unique()->after('requires_password_change');
            $table->timestamp('invitation_expires_at')->nullable()->after('invitation_token');
        });
    }

    public function down(): void
    {
        Schema::table('riders', function (Blueprint $table) {
            $table->dropColumn('email');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['invitation_token', 'invitation_expires_at']);
        });
    }
};
