<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Country;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CountriesController extends Controller {
    public function index(Request $request): JsonResponse {
        $countries = Country::orderBy('name')->get(['id', 'name', 'iso2', 'region']);
        return $this->success($countries);
    }
}
