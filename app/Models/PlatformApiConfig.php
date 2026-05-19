<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class PlatformApiConfig extends Model
{
    protected $fillable = ['service','config_data','is_enabled','last_tested_at','test_status'];
    protected $casts = ['is_enabled' => 'boolean', 'last_tested_at' => 'datetime'];

    public function getConfigAttribute(): array
    {
        try {
            return json_decode(Crypt::decryptString($this->config_data), true) ?? [];
        } catch (\Exception) {
            return [];
        }
    }

    public function setConfigAndSave(array $data): void
    {
        $this->config_data = Crypt::encryptString(json_encode($data));
        $this->save();
    }

    public static function getService(string $service): ?self
    {
        return self::where('service', $service)->first();
    }

    public static function getConfig(string $service): array
    {
        return self::getService($service)?->config ?? [];
    }
}
