<?php
namespace Database\Seeders;
use App\Models\Country;
use Illuminate\Database\Seeder;

class CountriesSeeder extends Seeder {
    public function run(): void {
        $countries = [
            // Africa
            ['name' => 'Algeria', 'region' => 'Africa'],
            ['name' => 'Angola', 'region' => 'Africa'],
            ['name' => 'Benin', 'region' => 'Africa'],
            ['name' => 'Botswana', 'region' => 'Africa'],
            ['name' => 'Burkina Faso', 'region' => 'Africa'],
            ['name' => 'Burundi', 'region' => 'Africa'],
            ['name' => 'Cabo Verde', 'region' => 'Africa'],
            ['name' => 'Cameroon', 'region' => 'Africa'],
            ['name' => 'Central African Republic', 'region' => 'Africa'],
            ['name' => 'Chad', 'region' => 'Africa'],
            ['name' => 'Comoros', 'region' => 'Africa'],
            ['name' => 'Congo (Brazzaville)', 'region' => 'Africa'],
            ['name' => 'Congo (DRC)', 'region' => 'Africa'],
            ['name' => "Côte d'Ivoire", 'region' => 'Africa'],
            ['name' => 'Djibouti', 'region' => 'Africa'],
            ['name' => 'Egypt', 'region' => 'Africa'],
            ['name' => 'Equatorial Guinea', 'region' => 'Africa'],
            ['name' => 'Eritrea', 'region' => 'Africa'],
            ['name' => 'Eswatini', 'region' => 'Africa'],
            ['name' => 'Ethiopia', 'region' => 'Africa'],
            ['name' => 'Gabon', 'region' => 'Africa'],
            ['name' => 'Gambia', 'region' => 'Africa'],
            ['name' => 'Ghana', 'region' => 'Africa'],
            ['name' => 'Guinea', 'region' => 'Africa'],
            ['name' => 'Guinea-Bissau', 'region' => 'Africa'],
            ['name' => 'Kenya', 'region' => 'Africa'],
            ['name' => 'Lesotho', 'region' => 'Africa'],
            ['name' => 'Liberia', 'region' => 'Africa'],
            ['name' => 'Libya', 'region' => 'Africa'],
            ['name' => 'Madagascar', 'region' => 'Africa'],
            ['name' => 'Malawi', 'region' => 'Africa'],
            ['name' => 'Mali', 'region' => 'Africa'],
            ['name' => 'Mauritania', 'region' => 'Africa'],
            ['name' => 'Mauritius', 'region' => 'Africa'],
            ['name' => 'Morocco', 'region' => 'Africa'],
            ['name' => 'Mozambique', 'region' => 'Africa'],
            ['name' => 'Namibia', 'region' => 'Africa'],
            ['name' => 'Niger', 'region' => 'Africa'],
            ['name' => 'Nigeria', 'region' => 'Africa'],
            ['name' => 'Rwanda', 'region' => 'Africa'],
            ['name' => 'São Tomé and Príncipe', 'region' => 'Africa'],
            ['name' => 'Senegal', 'region' => 'Africa'],
            ['name' => 'Seychelles', 'region' => 'Africa'],
            ['name' => 'Sierra Leone', 'region' => 'Africa'],
            ['name' => 'Somalia', 'region' => 'Africa'],
            ['name' => 'South Africa', 'region' => 'Africa'],
            ['name' => 'South Sudan', 'region' => 'Africa'],
            ['name' => 'Sudan', 'region' => 'Africa'],
            ['name' => 'Tanzania', 'region' => 'Africa'],
            ['name' => 'Togo', 'region' => 'Africa'],
            ['name' => 'Tunisia', 'region' => 'Africa'],
            ['name' => 'Uganda', 'region' => 'Africa'],
            ['name' => 'Zambia', 'region' => 'Africa'],
            ['name' => 'Zimbabwe', 'region' => 'Africa'],
            // Middle East
            ['name' => 'Bahrain', 'region' => 'Middle East'],
            ['name' => 'Iraq', 'region' => 'Middle East'],
            ['name' => 'Jordan', 'region' => 'Middle East'],
            ['name' => 'Kuwait', 'region' => 'Middle East'],
            ['name' => 'Lebanon', 'region' => 'Middle East'],
            ['name' => 'Oman', 'region' => 'Middle East'],
            ['name' => 'Qatar', 'region' => 'Middle East'],
            ['name' => 'Saudi Arabia', 'region' => 'Middle East'],
            ['name' => 'United Arab Emirates', 'region' => 'Middle East'],
            ['name' => 'Yemen', 'region' => 'Middle East'],
            // Asia
            ['name' => 'Bangladesh', 'region' => 'Asia'],
            ['name' => 'China', 'region' => 'Asia'],
            ['name' => 'India', 'region' => 'Asia'],
            ['name' => 'Indonesia', 'region' => 'Asia'],
            ['name' => 'Malaysia', 'region' => 'Asia'],
            ['name' => 'Pakistan', 'region' => 'Asia'],
            ['name' => 'Philippines', 'region' => 'Asia'],
            ['name' => 'Singapore', 'region' => 'Asia'],
            ['name' => 'Sri Lanka', 'region' => 'Asia'],
            ['name' => 'Thailand', 'region' => 'Asia'],
            ['name' => 'Vietnam', 'region' => 'Asia'],
            // Europe
            ['name' => 'France', 'region' => 'Europe'],
            ['name' => 'Germany', 'region' => 'Europe'],
            ['name' => 'Italy', 'region' => 'Europe'],
            ['name' => 'Netherlands', 'region' => 'Europe'],
            ['name' => 'Portugal', 'region' => 'Europe'],
            ['name' => 'Spain', 'region' => 'Europe'],
            ['name' => 'United Kingdom', 'region' => 'Europe'],
            // Americas
            ['name' => 'Brazil', 'region' => 'Americas'],
            ['name' => 'Canada', 'region' => 'Americas'],
            ['name' => 'Mexico', 'region' => 'Americas'],
            ['name' => 'United States', 'region' => 'Americas'],
            // Oceania
            ['name' => 'Australia', 'region' => 'Oceania'],
            ['name' => 'New Zealand', 'region' => 'Oceania'],
        ];
        foreach ($countries as $c) {
            Country::firstOrCreate(['name' => $c['name']], $c);
        }
        $this->command->info('Countries seeded: ' . count($countries));
    }
}
