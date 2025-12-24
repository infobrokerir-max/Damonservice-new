import React, { useState, useEffect } from 'react';
import { backend } from '../lib/backend';
import { Category, SafeDeviceDTO, RequestStatusDTO, Project } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ProjectChat } from '../components/ProjectChat';
import { Search, Filter, DollarSign, LogOut, Clock, CheckCircle, XCircle, RefreshCw, FolderPlus, Folder, MessageSquare } from 'lucide-react';

export const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  
  // Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [devices, setDevices] = useState<SafeDeviceDTO[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Selection States
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // UI States
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requests, setRequests] = useState<Record<string, RequestStatusDTO>>({}); // Map deviceId -> Request (FOR ACTIVE PROJECT)
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeProject) {
      handleSearch();
      refreshRequests();
      checkUnread();
    }
  }, [searchQuery, selectedCategory, activeProject]);

  // Poll for unread messages
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeProject) checkUnread();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeProject]);

  const loadInitialData = async () => {
    if (!user) return;
    const cats = await backend.getCategoriesSafe();
    const userProjects = await backend.getUserProjects(user.id);
    setCategories(cats);
    setProjects(userProjects);
    
    if (userProjects.length > 0) {
      setActiveProject(userProjects[0]);
    }
  };

  const checkUnread = async () => {
    if (!activeProject) return;
    const comments = await backend.getProjectComments(activeProject.id);
    // Count unread messages from admin
    const count = comments.filter(c => c.role === 'admin' && !c.isRead).length;
    setUnreadCount(count);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProjectName.trim()) return;
    
    const newProj = await backend.createProject(user.id, newProjectName);
    setProjects(prev => [newProj, ...prev]);
    setActiveProject(newProj);
    setNewProjectName('');
    setIsCreatingProject(false);
  };

  const refreshRequests = async () => {
    if (!user || !activeProject) return;
    const userRequests = await backend.getUserRequests(user.id);
    const projectRequests = userRequests.filter(r => r.projectId === activeProject.id);
    
    const reqMap: Record<string, RequestStatusDTO> = {};
    projectRequests.forEach(r => {
      if (!reqMap[r.deviceId] || reqMap[r.deviceId].timestamp < r.timestamp) {
        reqMap[r.deviceId] = r;
      }
    });
    setRequests(reqMap);
  };

  const handleSearch = async () => {
    if (!activeProject) return;
    const results = await backend.searchDevicesSafe(searchQuery, selectedCategory);
    setDevices(results);
  };

  const handleRequestPrice = async (deviceId: string) => {
    if (!user || !activeProject) return;
    setRequestingId(deviceId);
    try {
      await backend.requestPrice(user.id, deviceId, activeProject.id);
      await refreshRequests();
    } catch (err) {
      console.error(err);
      alert('خطا در ثبت درخواست');
    } finally {
      setRequestingId(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fa-IR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(val);
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('fa-IR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const renderActionArea = (device: SafeDeviceDTO) => {
    const req = requests[device.id];

    if (!req) {
      return (
        <Button 
          className="w-full flex items-center justify-center gap-2"
          onClick={() => handleRequestPrice(device.id)}
          disabled={requestingId === device.id}
        >
          {requestingId === device.id ? (
            <span className="animate-pulse">در حال ثبت...</span>
          ) : (
            <>
              <DollarSign size={18} />
              استعلام قیمت
            </>
          )}
        </Button>
      );
    }

    if (req.status === 'pending') {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex flex-col items-center justify-center gap-1 text-yellow-700">
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <span className="text-sm font-medium">در انتظار تایید</span>
          </div>
          <span className="text-xs text-yellow-600/80" dir="ltr">{formatDateTime(req.timestamp)}</span>
        </div>
      );
    }

    if (req.status === 'rejected') {
      return (
        <div className="flex flex-col gap-2">
           <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center justify-center gap-2 text-red-700">
            <XCircle size={18} />
            <span className="text-sm font-medium">رد شد</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-gray-500"
            onClick={() => handleRequestPrice(device.id)}
          >
            درخواست مجدد
          </Button>
        </div>
      );
    }

    if (req.status === 'approved' && req.sellPriceEUR !== null) {
      return (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm flex items-center gap-1">
              <CheckCircle size={14} className="text-green-600"/>
              قیمت نهایی:
            </span>
            <span className="text-xl font-bold text-green-700" dir="ltr">
              {formatCurrency(req.sellPriceEUR)}
            </span>
          </div>
          <div className="text-center border-t border-green-100 pt-2 mt-2">
             <span className="text-xs text-green-600/80 block" dir="ltr">{formatDateTime(req.timestamp)}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-800">سامانه قیمت‌دهی</h1>
            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">کارمند</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">کاربر: {user?.fullName}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="text-red-600 hover:bg-red-50">
              <LogOut size={18} className="ml-2" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col lg:flex-row gap-6">
        
        <div className="flex-1">
          {/* Project Selection Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-8 border-t-4 border-blue-600">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Folder className="text-blue-600" />
                  پروژه فعال
                </h2>
                <p className="text-sm text-gray-500 mt-1">برای استعلام قیمت، ابتدا پروژه مورد نظر را انتخاب یا ایجاد کنید.</p>
              </div>
              
              {!isCreatingProject && (
                <Button onClick={() => setIsCreatingProject(true)} size="sm">
                  <FolderPlus size={16} className="ml-2" />
                  پروژه جدید
                </Button>
              )}
            </div>

            {isCreatingProject ? (
              <form onSubmit={handleCreateProject} className="flex gap-2 items-end bg-blue-50 p-4 rounded-md animate-in fade-in">
                <Input 
                  label="نام پروژه جدید" 
                  value={newProjectName} 
                  onChange={e => setNewProjectName(e.target.value)} 
                  placeholder="مثلاً: پروژه برج میلاد"
                  autoFocus
                />
                <div className="flex gap-2 pb-0.5">
                  <Button type="submit">ایجاد</Button>
                  <Button type="button" variant="secondary" onClick={() => setIsCreatingProject(false)}>انصراف</Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <select 
                  className="w-full sm:w-1/2 p-3 border rounded-md bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-lg"
                  value={activeProject?.id || ''}
                  onChange={(e) => {
                    const proj = projects.find(p => p.id === e.target.value);
                    setActiveProject(proj || null);
                  }}
                >
                  {projects.length === 0 && <option value="">هیچ پروژه‌ای وجود ندارد</option>}
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {activeProject && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600 font-medium px-3 py-1 bg-green-50 rounded-full border border-green-100">
                      پروژه انتخاب شده: {activeProject.name}
                    </span>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className={`lg:hidden relative ${unreadCount > 0 ? 'text-blue-600 border-blue-200 bg-blue-50' : ''}`}
                      onClick={() => setShowChat(!showChat)}
                    >
                      <MessageSquare size={18} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search & Results (Only visible if project is selected) */}
          {activeProject ? (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              {/* Search Bar */}
              <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-1/3">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">جستجو مدل</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="نام مدل..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  </div>
                </div>

                <div className="w-full md:w-1/4">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">دسته‌بندی</label>
                  <div className="relative">
                    <select
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="all">همه دسته‌ها</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  </div>
                </div>
                
                <div className="mr-auto">
                  <Button variant="secondary" size="sm" onClick={refreshRequests} title="بروزرسانی وضعیت‌ها">
                    <RefreshCw size={16} className="ml-2" />
                    بروزرسانی وضعیت
                  </Button>
                </div>
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {devices.length === 0 ? (
                  <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500">موردی یافت نشد.</p>
                  </div>
                ) : (
                  devices.map(device => (
                    <div key={device.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col">
                      <div className="p-5 flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              {device.categoryName}
                            </span>
                            <h3 className="text-lg font-bold text-gray-900 mt-2">{device.modelName}</h3>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-5 pt-0 mt-auto border-t border-gray-50">
                        <div className="mt-4">
                          {renderActionArea(device)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
              <Folder size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-600">لطفاً یک پروژه را انتخاب کنید</h3>
              <p className="text-gray-500 mt-2">برای مشاهده لیست دستگاه‌ها و استعلام قیمت، ابتدا باید پروژه فعال را مشخص کنید.</p>
            </div>
          )}
        </div>

        {/* Chat Sidebar (Desktop: Always visible if project active, Mobile: Toggle) */}
        {activeProject && user && (
          <div className={`fixed inset-0 z-30 bg-black/50 lg:static lg:bg-transparent lg:w-80 lg:block transition-all ${showChat ? 'block' : 'hidden'}`}>
             <div className="h-full w-full lg:w-full max-w-sm bg-white lg:bg-transparent p-4 lg:p-0 flex flex-col ml-auto">
                <div className="lg:hidden flex justify-end mb-2">
                  <button onClick={() => setShowChat(false)} className="p-2 bg-white rounded-full shadow"><XCircle /></button>
                </div>
                <div className="flex-1 h-[calc(100vh-100px)] lg:h-[calc(100vh-140px)] sticky top-24">
                  <ProjectChat projectId={activeProject.id} currentUser={user} />
                </div>
             </div>
          </div>
        )}

      </main>
    </div>
  );
};
