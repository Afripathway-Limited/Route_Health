'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Drawer } from '@/components/ui/Drawer';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Plus, Edit2, Trash2, Check, Users, Building2, ClipboardList, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface Plan {
  id: number;
  name: string;
  display_name: string;
  price_usd_monthly: number;
  price_usd_annual: number;
  max_riders: number;
  max_facilities: number;
  max_tasks_per_month: number;
  max_dispatchers: number;
  features: string[];
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
}

interface PlanForm {
  name: string;
  display_name: string;
  price_usd_monthly: number;
  price_usd_annual: number;
  max_riders: number;
  max_facilities: number;
  max_tasks_per_month: number;
  max_dispatchers: number;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'from-blue-500/10 to-blue-500/5 border-blue-500/20',
  professional: 'from-purple-500/10 to-purple-500/5 border-purple-500/20',
  enterprise: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
};

export default function PackagesPage() {
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState('');

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ['subscription-plans'],
    queryFn: () => get('/super-admin/plans'),
  });

  const { register, handleSubmit, reset, setValue } = useForm<PlanForm>({
    defaultValues: { max_riders: 10, max_facilities: 20, max_tasks_per_month: 500, max_dispatchers: 2, is_active: true, is_public: true, sort_order: 0 },
  });

  const saveMutation = useMutation({
    mutationFn: (data: PlanForm & { features: string[] }) =>
      editPlan ? put(`/super-admin/plans/${editPlan.id}`, data) : post('/super-admin/plans', data),
    onSuccess: () => {
      toast.success(editPlan ? 'Plan updated' : 'Plan created');
      qc.invalidateQueries({ queryKey: ['subscription-plans'] });
      closeDrawer();
    },
    onError: () => toast.error('Failed to save plan'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/super-admin/plans/${id}`),
    onSuccess: () => { toast.success('Plan deleted'); qc.invalidateQueries({ queryKey: ['subscription-plans'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Cannot delete plan with active subscriptions'),
  });

  const openCreate = () => {
    setEditPlan(null);
    setFeatures([]);
    reset();
    setDrawerOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditPlan(plan);
    setFeatures(plan.features ?? []);
    setValue('name', plan.name);
    setValue('display_name', plan.display_name);
    setValue('price_usd_monthly', plan.price_usd_monthly);
    setValue('price_usd_annual', plan.price_usd_annual);
    setValue('max_riders', plan.max_riders);
    setValue('max_facilities', plan.max_facilities);
    setValue('max_tasks_per_month', plan.max_tasks_per_month);
    setValue('max_dispatchers', plan.max_dispatchers);
    setValue('is_active', plan.is_active);
    setValue('is_public', plan.is_public);
    setValue('sort_order', plan.sort_order);
    setDrawerOpen(true);
  };

  const closeDrawer = () => { setDrawerOpen(false); setEditPlan(null); setFeatures([]); reset(); };

  const addFeature = () => {
    if (featureInput.trim() && !features.includes(featureInput.trim())) {
      setFeatures([...features, featureInput.trim()]);
      setFeatureInput('');
    }
  };

  const planList = (plans as any)?.data ?? plans ?? [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[--text-1]">Subscription Plans</h1>
          <p className="text-sm text-[--text-3] mt-1">Manage pricing tiers and feature access</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Create Plan</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {planList.map((plan: Plan) => (
          <div key={plan.id} className={cn('rounded-2xl border bg-gradient-to-br p-6 space-y-4', PLAN_COLORS[plan.name] ?? 'from-white/5 to-white/2 border-white/10')}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-white">{plan.display_name}</h2>
                  {!plan.is_active && <Badge status="suspended" label="Inactive" />}
                  {plan.is_public && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">Public</span>}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">${plan.price_usd_monthly}</span>
                  <span className="text-sm text-[--text-3]">/mo</span>
                </div>
                <p className="text-xs text-[--text-3] mt-0.5">${plan.price_usd_annual}/yr (save {Math.round((1 - plan.price_usd_annual / (plan.price_usd_monthly * 12)) * 100)}%)</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}><Edit2 size={14} /></Button>
                <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this plan?')) deleteMutation.mutate(plan.id); }}><Trash2 size={14} /></Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Users, label: 'Riders', value: plan.max_riders >= 9999 ? '∞' : plan.max_riders },
                { icon: Building2, label: 'Facilities', value: plan.max_facilities >= 9999 ? '∞' : plan.max_facilities },
                { icon: ClipboardList, label: 'Tasks/mo', value: plan.max_tasks_per_month >= 999999 ? '∞' : plan.max_tasks_per_month.toLocaleString() },
                { icon: Zap, label: 'Dispatchers', value: plan.max_dispatchers >= 999 ? '∞' : plan.max_dispatchers },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <Icon size={12} className="text-[--text-3]" />
                  <span className="text-xs text-[--text-3]">{label}:</span>
                  <span className="text-xs font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>

            {plan.features?.length > 0 && (
              <ul className="space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[--text-2]">
                    <Check size={13} className="text-emerald-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <Drawer open={drawerOpen} onClose={closeDrawer} title={editPlan ? `Edit ${editPlan.display_name}` : 'Create Plan'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate({ ...d, features }))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Plan Key (e.g. starter)" placeholder="starter" {...register('name', { required: true })} disabled={!!editPlan} />
            <Input label="Display Name" placeholder="Starter" {...register('display_name', { required: true })} />
            <Input label="Monthly Price (USD)" type="number" step="0.01" placeholder="49.00" {...register('price_usd_monthly', { valueAsNumber: true })} />
            <Input label="Annual Price (USD)" type="number" step="0.01" placeholder="470.00" {...register('price_usd_annual', { valueAsNumber: true })} />
            <Input label="Max Riders" type="number" {...register('max_riders', { valueAsNumber: true })} />
            <Input label="Max Facilities" type="number" {...register('max_facilities', { valueAsNumber: true })} />
            <Input label="Max Tasks/Month" type="number" {...register('max_tasks_per_month', { valueAsNumber: true })} />
            <Input label="Max Dispatchers" type="number" {...register('max_dispatchers', { valueAsNumber: true })} />
          </div>

          <div>
            <label className="text-sm font-medium text-[--text-1] block mb-2">Features</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                placeholder="Type feature and press Enter"
                className="flex-1 bg-[--bg-elevated] border border-[--border] rounded-xl px-4 py-2.5 text-sm text-[--text-1] placeholder:text-[--text-3] focus:outline-none focus:border-emerald-500"
              />
              <Button type="button" variant="secondary" onClick={addFeature}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {features.map((f) => (
                <span key={f} className="flex items-center gap-1 bg-emerald-500/10 text-emerald-300 text-xs px-2 py-1 rounded-full border border-emerald-500/20">
                  {f}
                  <button type="button" onClick={() => setFeatures(features.filter((x) => x !== f))} className="ml-1 hover:text-red-400">×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-[--text-1]">
              <input type="checkbox" {...register('is_active')} className="rounded" />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-[--text-1]">
              <input type="checkbox" {...register('is_public')} className="rounded" />
              Public (visible on pricing page)
            </label>
          </div>

          <Button type="submit" loading={saveMutation.isPending} className="w-full">
            {editPlan ? 'Update Plan' : 'Create Plan'}
          </Button>
        </form>
      </Drawer>
    </div>
  );
}
