<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionsController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::with('permissions')->whereNotIn('name', ['super_admin', 'rider'])->get()
            ->map(fn($r) => [
                'name' => $r->name,
                'permissions' => $r->permissions->pluck('name'),
            ]);
        return $this->success($roles);
    }

    public function permissions(): JsonResponse
    {
        $perms = Permission::all()->groupBy(fn($p) => explode('.', $p->name)[0]);
        return $this->success($perms);
    }

    public function updatePermissions(Request $request, string $roleName): JsonResponse
    {
        if (in_array($roleName, ['super_admin', 'rider'])) {
            return $this->error('This role cannot be modified', 403);
        }

        $data = $request->validate(['permissions' => 'required|array']);
        $role = Role::findByName($roleName);
        $role->syncPermissions($data['permissions']);

        return $this->success($role->load('permissions'), 'Permissions updated');
    }
}
