import React, { useState, useEffect, useRef } from 'react';
import { supabaseBackend } from '../lib/supabaseBackend';
import { Category, Device, GlobalSettings, InquiryLog, User, ProjectSummaryDTO, PriceBreakdown } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ProjectChat } from '../components/ProjectChat';
import { LogOut, Settings, Database, Users, CheckSquare, Check, X, Plus, Edit, Trash2, Layers, MessageSquare, Calculator, XCircle, Download, Upload, AlertTriangle } from 'lucide-react';

// --- SUB-COMPONENTS ---

const SettingsTab = ({ settings, onSave }: { settings: GlobalSettings, onSave: (s: GlobalSettings) => void }) => {
  const [formData, setFormData] = useState(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof GlobalSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBackup = async () => {
    alert('بکاپ و بازیابی در نسخه Supabase از طریق API های Supabase مدیریت می‌شود. لطفاً به داشبورد Supabase مراجعه کنید.');
  };

  const handleRestoreClick = () => {
    alert('بکاپ و بازیابی در نسخه Supabase از طریق API های Supabase مدیریت می‌شود. لطفاً به داشبورد Supabase مراجعه کنید.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Not used in Supabase version
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Global Params */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-6 border-b pb-2">تنظیمات و ضرایب جهانی</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="ضریب تخفیف (Discount Multiplier - D)" type="number" step="0.01" value={formData.discountMultiplier} onChange={e => handleChange('discountMultiplier', parseFloat(e.target.value))} />
          <Input label="نرخ حمل به ازای طول (Freight Rate - F)" type="number" value={formData.freightRatePerLengthEUR} onChange={e => handleChange('freightRatePerLengthEUR', parseFloat(e.target.value))} />
          <Input label="صورت کسر گمرک (Customs Numerator - CN)" type="number" value={formData.customsNumerator} onChange={e => handleChange('customsNumerator', parseFloat(e.target.value))} />
          <Input label="مخرج کسر گمرک (Customs Denominator - CD)" type="number" value={formData.customsDenominator} onChange={e => handleChange('customsDenominator', parseFloat(e.target.value))} />
          <Input label="نرخ گارانتی (Warranty Rate - WR)" type="number" step="0.01" value={formData.warrantyRate} onChange={e => handleChange('warrantyRate', parseFloat(e.target.value))} />
          <Input label="ضریب کمیسیون (Commission Factor - COM)" type="number" step="0.01" value={formData.internalCommissionFactor} onChange={e => handleChange('internalCommissionFactor', parseFloat(e.target.value))} />
          <Input label="ضریب آفیس (Office Factor - OFF)" type="number" step="0.01" value={formData.companyCostFactor} onChange={e => handleChange('companyCostFactor', parseFloat(e.target.value))} />
          <Input label="ضریب سود (Profit Factor - PF)" type="number" step="0.01" value={formData.profitFactor} onChange={e => handleChange('profitFactor', parseFloat(e.target.value))} />
        </div>
        <div className="mt-8 flex justify-end">
          <Button onClick={() => onSave(formData)}>ذخیره تنظیمات</Button>
        </div>
      </div>

      {/* Backup / Restore */}
      <div className="bg-white p-6 rounded-lg shadow border-t-4 border-orange-400">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Database className="text-orange-600" />
          مدیریت داده‌ها (پشتیبان‌گیری)
        </h2>
        <div className="bg-orange-50 p-4 rounded-md mb-6 text-sm text-orange-800 flex items-start gap-2">
          <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
          <p>
            توجه: این برنامه فعلاً به صورت آفلاین (Local) کار می‌کند. برای انتقال اطلاعات به موبایل یا دستگاه دیگر، 
            باید از اینجا "دانلود بکاپ" بگیرید و فایل را در دستگاه دیگر "بازیابی" کنید.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="secondary" onClick={handleBackup} className="flex items-center justify-center gap-2">
            <Download size={18} />
            دانلود بکاپ (JSON)
          </Button>
          
          <div className="relative">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            <Button variant="secondary" onClick={handleRestoreClick} className="flex items-center justify-center gap-2 w-full">
              <Upload size={18} />
              بازیابی دیتابیس
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CategoriesTab = ({ categories, onSave, onDelete }: { categories: Category[], onSave: (c: Category) => void, onDelete: (id: string) => void }) => {
  const [editing, setEditing] = useState<Category | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      onSave(editing);
      setEditing(null);
    }
  };

  const startNew = () => {
    setEditing({ id: '', name: '', isActive: true });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold">مدیریت دسته‌بندی‌ها</h2>
        <Button onClick={startNew} size="sm"><Plus size={16} className="ml-1" /> دسته جدید</Button>
      </div>

      {editing && (
        <div className="mb-8 p-4 bg-blue-50 rounded border border-blue-100">
          <h3 className="font-bold mb-4 text-blue-800">{editing.id ? 'ویرایش دسته' : 'دسته جدید'}</h3>
          <form onSubmit={handleSave} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Input label="نام دسته‌بندی" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} required autoFocus />
            </div>
            <div className="flex items-center pb-3">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" className="w-4 h-4" checked={editing.isActive} onChange={e => setEditing({...editing, isActive: e.target.checked})} />
                 <span>فعال</span>
               </label>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>انصراف</Button>
              <Button type="submit">ذخیره</Button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3">نام دسته‌بندی</th>
              <th className="p-3">وضعیت</th>
              <th className="p-3">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${c.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {c.isActive ? 'فعال' : 'غیرفعال'}
                  </span>
                </td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => setEditing(c)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                  <button onClick={() => { if(confirm('آیا از حذف این دسته اطمینان دارید؟')) onDelete(c.id) }} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const BreakdownModal = ({ device, onClose }: { device: Device, onClose: () => void }) => {
  const [data, setData] = useState<PriceBreakdown | null>(null);

  useEffect(() => {
    supabaseBackend.getDeviceBreakdown(device.id).then(setData);
  }, [device.id]);

  if (!data) return null;

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h3 className="font-bold text-lg text-gray-800">محاسبات قیمت: {device.modelName}</h3>
          <button onClick={onClose}><XCircle className="text-gray-500 hover:text-red-500" /></button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Inputs */}
          <div className="grid grid-cols-3 gap-4 text-center bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div>
              <span className="block text-xs text-gray-500">قیمت کارخانه (P)</span>
              <span className="font-bold text-blue-700">€{fmt(data.inputs.P)}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">طول (L)</span>
              <span className="font-bold text-blue-700">{data.inputs.L}m</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">وزن (W)</span>
              <span className="font-bold text-blue-700">{data.inputs.W}kg</span>
            </div>
          </div>

          {/* Steps Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="p-3">مرحله</th>
                  <th className="p-3">فرمول</th>
                  <th className="p-3 text-left">مقدار (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3 font-medium">1. Company Price</td>
                  <td className="p-3 text-gray-500 text-xs" dir="ltr">P * D ({data.params.D})</td>
                  <td className="p-3 text-left" dir="ltr">{fmt(data.steps.companyPrice)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">2. Shipment</td>
                  <td className="p-3 text-gray-500 text-xs" dir="ltr">L * F ({data.params.F})</td>
                  <td className="p-3 text-left" dir="ltr">{fmt(data.steps.shipment)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">3. Custom</td>
                  <td className="p-3 text-gray-500 text-xs" dir="ltr">W * (CN/CD)</td>
                  <td className="p-3 text-left" dir="ltr">{fmt(data.steps.custom)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">4. Warranty</td>
                  <td className="p-3 text-gray-500 text-xs" dir="ltr">CompanyPrice * WR ({data.params.WR})</td>
                  <td className="p-3 text-left" dir="ltr">{fmt(data.steps.warranty)}</td>
                </tr>
                <tr className="bg-gray-50 font-bold">
                  <td className="p-3">5. Subtotal</td>
                  <td className="p-3 text-gray-500 text-xs">Sum(1..4)</td>
                  <td className="p-3 text-left" dir="ltr">{fmt(data.steps.subtotal)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">6. Commission</td>
                  <td className="p-3 text-gray-500 text-xs" dir="ltr">Sub / COM ({data.params.COM})</td>
                  <td className="p-3 text-left" dir="ltr">{fmt(data.steps.commission)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">7. Office</td>
                  <td className="p-3 text-gray-500 text-xs" dir="ltr">Comm / OFF ({data.params.OFF})</td>
                  <td className="p-3 text-left" dir="ltr">{fmt(data.steps.office)}</td>
                </tr>
                <tr className="bg-green-50 text-green-800 font-bold text-lg">
                  <td className="p-3">8. Final Sell Price</td>
                  <td className="p-3 text-green-600 text-xs" dir="ltr">Office / PF ({data.params.PF})</td>
                  <td className="p-3 text-left" dir="ltr">{fmt(data.steps.sellPrice)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const DevicesTab = ({ devices, categories, onSave, onDelete }: { devices: Device[], categories: Category[], onSave: (d: Device) => void, onDelete: (id: string) => void }) => {
  const [editing, setEditing] = useState<Device | null>(null);
  const [viewingBreakdown, setViewingBreakdown] = useState<Device | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      onSave(editing);
      setEditing(null);
    }
  };

  const startNew = () => {
    setEditing({ id: '', modelName: '', categoryId: categories[0]?.id || '', isActive: true, factoryPriceEUR: 0, length: 0, weight: 0 });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {viewingBreakdown && <BreakdownModal device={viewingBreakdown} onClose={() => setViewingBreakdown(null)} />}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold">مدیریت دستگاه‌ها</h2>
        <Button onClick={startNew} size="sm"><Plus size={16} className="ml-1" /> دستگاه جدید</Button>
      </div>

      {editing && (
        <div className="mb-8 p-4 bg-blue-50 rounded border border-blue-100">
          <h3 className="font-bold mb-4 text-blue-800">{editing.id ? 'ویرایش دستگاه' : 'دستگاه جدید'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="نام مدل" value={editing.modelName} onChange={e => setEditing({...editing, modelName: e.target.value})} required />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">دسته‌بندی</label>
              <select className="w-full p-2 border rounded" value={editing.categoryId} onChange={e => setEditing({...editing, categoryId: e.target.value})}>
                {categories.length === 0 && <option value="">هیچ دسته‌ای وجود ندارد</option>}
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Input label="قیمت کارخانه (€)" type="number" value={editing.factoryPriceEUR} onChange={e => setEditing({...editing, factoryPriceEUR: parseFloat(e.target.value)})} required />
            <Input label="طول (m)" type="number" step="0.1" value={editing.length} onChange={e => setEditing({...editing, length: parseFloat(e.target.value)})} required />
            <Input label="وزن (kg)" type="number" value={editing.weight} onChange={e => setEditing({...editing, weight: parseFloat(e.target.value)})} required />
            <div className="flex items-center pt-6">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" className="w-4 h-4" checked={editing.isActive} onChange={e => setEditing({...editing, isActive: e.target.checked})} />
                 <span>فعال</span>
               </label>
            </div>
            <div className="col-span-full flex gap-2 justify-end mt-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>انصراف</Button>
              <Button type="submit">ذخیره</Button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3">مدل</th>
              <th className="p-3">دسته</th>
              <th className="p-3">قیمت کارخانه</th>
              <th className="p-3">ابعاد/وزن</th>
              <th className="p-3">وضعیت</th>
              <th className="p-3">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(d => (
              <tr key={d.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{d.modelName}</td>
                <td className="p-3">{categories.find(c => c.id === d.categoryId)?.name || <span className="text-red-500 text-xs">حذف شده</span>}</td>
                <td className="p-3">€{d.factoryPriceEUR.toLocaleString()}</td>
                <td className="p-3">{d.length}m / {d.weight}kg</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${d.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {d.isActive ? 'فعال' : 'غیرفعال'}
                  </span>
                </td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => setViewingBreakdown(d)} className="text-green-600 hover:text-green-800" title="مشاهده محاسبات">
                    <Calculator size={16} />
                  </button>
                  <button onClick={() => setEditing(d)} className="text-blue-600 hover:text-blue-800" title="ویرایش">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => { if(confirm('حذف شود؟')) onDelete(d.id) }} className="text-red-600 hover:text-red-800" title="حذف">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const UsersTab = ({ users, onSave, onDelete }: { users: User[], onSave: (u: User) => void, onDelete: (id: string) => void }) => {
  const [editing, setEditing] = useState<User | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      onSave(editing);
      setEditing(null);
    }
  };

  const startNew = () => {
    setEditing({ id: '', username: '', password: '', fullName: '', role: 'employee', isActive: true });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold">مدیریت کاربران</h2>
        <Button onClick={startNew} size="sm"><Plus size={16} className="ml-1" /> کاربر جدید</Button>
      </div>

      {editing && (
        <div className="mb-8 p-4 bg-blue-50 rounded border border-blue-100">
          <h3 className="font-bold mb-4 text-blue-800">{editing.id ? 'ویرایش کاربر' : 'کاربر جدید'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="نام کاربری" value={editing.username} onChange={e => setEditing({...editing, username: e.target.value})} required />
            <Input label="رمز عبور" value={editing.password || ''} onChange={e => setEditing({...editing, password: e.target.value})} required={!editing.id} placeholder={editing.id ? 'بدون تغییر' : ''} />
            <Input label="نام کامل" value={editing.fullName} onChange={e => setEditing({...editing, fullName: e.target.value})} required />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">نقش</label>
              <select className="w-full p-2 border rounded" value={editing.role} onChange={e => setEditing({...editing, role: e.target.value as any})}>
                <option value="employee">کارمند</option>
                <option value="admin">ادمین</option>
              </select>
            </div>
            <div className="flex items-center pt-6">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" className="w-4 h-4" checked={editing.isActive} onChange={e => setEditing({...editing, isActive: e.target.checked})} />
                 <span>فعال</span>
               </label>
            </div>
            <div className="col-span-full flex gap-2 justify-end mt-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>انصراف</Button>
              <Button type="submit">ذخیره</Button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3">نام کاربری</th>
              <th className="p-3">نام کامل</th>
              <th className="p-3">نقش</th>
              <th className="p-3">وضعیت</th>
              <th className="p-3">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{u.username}</td>
                <td className="p-3">{u.fullName}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>{u.role === 'admin' ? 'ادمین' : 'کارمند'}</span></td>
                <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{u.isActive ? 'فعال' : 'غیرفعال'}</span></td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => setEditing(u)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                  <button onClick={() => { if(confirm('حذف شود؟')) onDelete(u.id) }} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const RequestsTab = ({ logs, onUpdateStatus }: { logs: InquiryLog[], onUpdateStatus: (id: string, status: 'approved' | 'rejected') => void }) => {
  const pendingLogs = logs.filter(l => l.status === 'pending');
  const historyLogs = logs.filter(l => l.status !== 'pending').slice(0, 20);

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('fa-IR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-400">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <CheckSquare className="text-yellow-600" />
          درخواست‌های در انتظار تایید ({pendingLogs.length})
        </h2>
        
        {pendingLogs.length === 0 ? (
          <p className="text-gray-500 text-sm">هیچ درخواست جدیدی وجود ندارد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-yellow-50 border-b border-yellow-100">
                <tr>
                  <th className="p-3">زمان</th>
                  <th className="p-3">پروژه</th>
                  <th className="p-3">کاربر</th>
                  <th className="p-3">مدل</th>
                  <th className="p-3">قیمت محاسبه شده</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {pendingLogs.map(log => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="p-3" dir="ltr">{formatDateTime(log.timestamp)}</td>
                    <td className="p-3 font-bold text-blue-700">{log.projectNameSnapshot}</td>
                    <td className="p-3 font-medium">{log.userFullName}</td>
                    <td className="p-3">{log.modelNameSnapshot}</td>
                    <td className="p-3 font-bold text-gray-800">€{log.sellPriceEURSnapshot.toLocaleString()}</td>
                    <td className="p-3 flex justify-center gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8 px-3" onClick={() => onUpdateStatus(log.id, 'approved')}>
                        <Check size={16} className="mr-1" /> تایید
                      </Button>
                      <Button size="sm" variant="danger" className="h-8 px-3" onClick={() => onUpdateStatus(log.id, 'rejected')}>
                        <X size={16} className="mr-1" /> رد
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-4 text-gray-700">تاریخچه درخواست‌ها (۲۰ مورد اخیر)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3">زمان</th>
                <th className="p-3">پروژه</th>
                <th className="p-3">کاربر</th>
                <th className="p-3">مدل</th>
                <th className="p-3">قیمت</th>
                <th className="p-3">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {historyLogs.map(log => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="p-3" dir="ltr">{formatDateTime(log.timestamp)}</td>
                  <td className="p-3 text-blue-700">{log.projectNameSnapshot}</td>
                  <td className="p-3">{log.userFullName}</td>
                  <td className="p-3">{log.modelNameSnapshot}</td>
                  <td className="p-3">€{log.sellPriceEURSnapshot.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${log.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {log.status === 'approved' ? 'تایید شده' : 'رد شده'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MessagesTab = ({ projects, user }: { projects: ProjectSummaryDTO[], user: User }) => {
  const [selectedProject, setSelectedProject] = useState<ProjectSummaryDTO | null>(null);

  return (
    <div className="flex h-[600px] bg-white rounded-lg shadow overflow-hidden border border-gray-200">
      {/* Sidebar List */}
      <div className="w-1/3 border-l bg-gray-50 overflow-y-auto">
        <div className="p-4 border-b bg-white">
          <h2 className="font-bold text-gray-700">گفتگوهای فعال</h2>
        </div>
        {projects.length === 0 ? (
          <p className="p-4 text-gray-500 text-sm">هیچ پروژه‌ای وجود ندارد.</p>
        ) : (
          projects.map(p => (
            <div 
              key={p.id} 
              onClick={() => setSelectedProject(p)}
              className={`p-4 border-b cursor-pointer hover:bg-blue-50 transition-colors ${selectedProject?.id === p.id ? 'bg-blue-100 border-r-4 border-r-blue-600' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-gray-800 text-sm truncate">{p.name}</span>
                {p.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{p.unreadCount}</span>
                )}
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{p.userFullName}</span>
                <span dir="ltr">{new Date(p.lastActivity).toLocaleDateString('fa-IR')}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white">
        {selectedProject ? (
          <ProjectChat projectId={selectedProject.id} currentUser={user} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p>یک پروژه را برای مشاهده گفتگو انتخاب کنید</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN ADMIN PAGE ---

export const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'messages' | 'users' | 'devices' | 'categories' | 'settings'>('requests');
  const [data, setData] = useState<{
    users: User[];
    categories: Category[];
    devices: Device[];
    settings: GlobalSettings | null;
    logs: InquiryLog[];
    projectSummaries: ProjectSummaryDTO[];
  }>({ users: [], categories: [], devices: [], settings: null, logs: [], projectSummaries: [] });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const d = await supabaseBackend.getAdminData();
    const p = await supabaseBackend.getAdminProjectSummaries();
    setData({ ...d, projectSummaries: p });
  };

  const handleSaveSettings = async (newSettings: GlobalSettings) => {
    await supabaseBackend.updateSettings(newSettings);
    loadData();
    alert('تنظیمات ذخیره شد');
  };

  const handleSaveDevice = async (device: Device) => {
    await supabaseBackend.updateDevice(device);
    loadData();
  };

  const handleDeleteDevice = async (id: string) => {
    await supabaseBackend.deleteDevice(id);
    loadData();
  };

  const handleSaveCategory = async (category: Category) => {
    await supabaseBackend.saveCategory(category);
    loadData();
  };

  const handleDeleteCategory = async (id: string) => {
    await supabaseBackend.deleteCategory(id);
    loadData();
  };

  const handleSaveUser = async (u: User) => {
    alert('مدیریت کاربران از طریق پنل احراز هویت Supabase انجام می‌شود.');
  };

  const handleDeleteUser = async (id: string) => {
    alert('مدیریت کاربران از طریق پنل احراز هویت Supabase انجام می‌شود.');
  };

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    await supabaseBackend.setRequestStatus(id, status);
    loadData();
  };

  if (!data.settings || !user) return <div>Loading...</div>;

  const pendingCount = data.logs.filter(l => l.status === 'pending').length;
  const unreadMessagesCount = data.projectSummaries.reduce((acc, curr) => acc + curr.unreadCount, 0);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-gray-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-xs font-bold px-2 py-1 rounded">ADMIN</span>
            <h1 className="text-lg font-bold">پنل مدیریت دامون</h1>
          </div>
          <Button variant="ghost" className="text-white hover:bg-gray-800" onClick={logout}>
            <LogOut size={18} className="ml-2" /> خروج
          </Button>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full p-4 gap-6">
        <aside className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-colors ${activeTab === 'requests' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white/50'}`}>
              <div className="flex items-center gap-3"><CheckSquare size={20} /> درخواست‌ها</div>
              {pendingCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCount}</span>}
            </button>
            <button onClick={() => setActiveTab('messages')} className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-colors ${activeTab === 'messages' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white/50'}`}>
              <div className="flex items-center gap-3"><MessageSquare size={20} /> پیام‌ها</div>
              {unreadMessagesCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadMessagesCount}</span>}
            </button>
            <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white/50'}`}>
              <Users size={20} /> کاربران
            </button>
            <button onClick={() => setActiveTab('categories')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'categories' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white/50'}`}>
              <Layers size={20} /> دسته‌بندی‌ها
            </button>
            <button onClick={() => setActiveTab('devices')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'devices' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white/50'}`}>
              <Database size={20} /> دستگاه‌ها
            </button>
            <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white/50'}`}>
              <Settings size={20} /> تنظیمات
            </button>
          </nav>
        </aside>

        <main className="flex-1">
          {activeTab === 'requests' && <RequestsTab logs={data.logs} onUpdateStatus={handleUpdateStatus} />}
          {activeTab === 'messages' && <MessagesTab projects={data.projectSummaries} user={user} />}
          {activeTab === 'users' && <UsersTab users={data.users} onSave={handleSaveUser} onDelete={handleDeleteUser} />}
          {activeTab === 'categories' && <CategoriesTab categories={data.categories} onSave={handleSaveCategory} onDelete={handleDeleteCategory} />}
          {activeTab === 'devices' && <DevicesTab devices={data.devices} categories={data.categories} onSave={handleSaveDevice} onDelete={handleDeleteDevice} />}
          {activeTab === 'settings' && <SettingsTab settings={data.settings} onSave={handleSaveSettings} />}
        </main>
      </div>
    </div>
  );
};
