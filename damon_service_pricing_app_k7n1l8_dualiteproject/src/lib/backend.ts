import { Device, GlobalSettings, InquiryLog, User, Category, SafeDeviceDTO, RequestStatusDTO, Project, Comment, ProjectSummaryDTO, PriceBreakdown } from './types';

// --- MOCK DATABASE SEED ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_SETTINGS: GlobalSettings = {
  id: 'settings-v1',
  isActive: true,
  discountMultiplier: 0.38,        // D
  freightRatePerLengthEUR: 1000,   // F
  customsNumerator: 350000,        // CN
  customsDenominator: 150000,      // CD
  warrantyRate: 0.05,              // WR
  internalCommissionFactor: 0.95,  // COM
  companyCostFactor: 0.95,         // OFF (Office Factor)
  profitFactor: 0.65,              // PF
};

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'VRF Systems', isActive: true },
  { id: 'cat-2', name: 'Chillers', isActive: true },
  { id: 'cat-3', name: 'Air Handling Units (AHU)', isActive: true },
];

const INITIAL_DEVICES: Device[] = [
  { id: 'dev-1', modelName: 'VRF-Outdoor-20HP', categoryId: 'cat-1', isActive: true, factoryPriceEUR: 15000, length: 2.5, weight: 400 },
  { id: 'dev-2', modelName: 'VRF-Indoor-Cassette', categoryId: 'cat-1', isActive: true, factoryPriceEUR: 800, length: 0.8, weight: 30 },
  { id: 'dev-3', modelName: 'Screw-Chiller-100T', categoryId: 'cat-2', isActive: true, factoryPriceEUR: 45000, length: 4.0, weight: 2500 },
  { id: 'dev-4', modelName: 'Scroll-Chiller-Mini', categoryId: 'cat-2', isActive: true, factoryPriceEUR: 12000, length: 1.5, weight: 600 },
  { id: 'dev-5', modelName: 'AHU-Industrial-5000', categoryId: 'cat-3', isActive: true, factoryPriceEUR: 8000, length: 3.0, weight: 900 },
  { id: 'dev-6', modelName: 'AHU-Hygienic-2000', categoryId: 'cat-3', isActive: true, factoryPriceEUR: 11000, length: 2.2, weight: 750 },
];

const INITIAL_USERS: User[] = [
  { id: 'admin-1', username: 'admin', password: 'admin', fullName: 'مدیر سیستم', role: 'admin', isActive: true },
  { id: 'emp-1', username: 'ali', password: '123', fullName: 'علی محمدی', role: 'employee', isActive: true },
  { id: 'emp-2', username: 'sara', password: '123', fullName: 'سارا رضایی', role: 'employee', isActive: true },
];

// --- LOCAL STORAGE WRAPPER ---

// UPDATED VERSION KEY to 'v6' to force reset of data on mobile as well
const DB_VERSION = 'damon_app_v6';

const loadData = <T>(key: string, initial: T): T => {
  const stored = localStorage.getItem(`${DB_VERSION}_${key}`);
  return stored ? JSON.parse(stored) : initial;
};

const saveData = (key: string, data: any) => {
  localStorage.setItem(`${DB_VERSION}_${key}`, JSON.stringify(data));
};

// --- BACKEND SERVICE CLASS ---

class MockBackendService {
  private users: User[];
  private categories: Category[];
  private devices: Device[];
  private settings: GlobalSettings;
  private logs: InquiryLog[];
  private projects: Project[];
  private comments: Comment[];

  constructor() {
    this.users = loadData('users', INITIAL_USERS);
    this.categories = loadData('categories', INITIAL_CATEGORIES);
    this.devices = loadData('devices', INITIAL_DEVICES);
    this.settings = loadData('settings', INITIAL_SETTINGS);
    this.logs = loadData('logs', []);
    this.projects = loadData('projects', []);
    this.comments = loadData('comments', []);

    // Debug Log
    console.log('Backend Initialized. Available Users:', this.users.map(u => `${u.username}:${u.password}`));
  }

  private saveAll() {
    saveData('users', this.users);
    saveData('categories', this.categories);
    saveData('devices', this.devices);
    saveData('settings', this.settings);
    saveData('logs', this.logs);
    saveData('projects', this.projects);
    saveData('comments', this.comments);
  }

  // --- IMPORT / EXPORT FOR MANUAL SYNC ---
  
  exportDatabase() {
    return JSON.stringify({
      users: this.users,
      categories: this.categories,
      devices: this.devices,
      settings: this.settings,
      logs: this.logs,
      projects: this.projects,
      comments: this.comments,
      version: DB_VERSION,
      timestamp: Date.now()
    });
  }

  importDatabase(jsonString: string) {
    try {
      const data = JSON.parse(jsonString);
      
      // Basic validation
      if (!data.users || !data.devices || !data.settings) {
        throw new Error("Invalid backup file format");
      }

      this.users = data.users;
      this.categories = data.categories;
      this.devices = data.devices;
      this.settings = data.settings;
      this.logs = data.logs || [];
      this.projects = data.projects || [];
      this.comments = data.comments || [];
      
      this.saveAll();
      return true;
    } catch (e) {
      console.error("Import failed", e);
      return false;
    }
  }

  // --- AUTH ---
  async login(username: string, password?: string): Promise<User | null> {
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password ? password.trim().toLowerCase() : '';

    const user = this.users.find(u => 
      u.username.toLowerCase() === cleanUsername && 
      u.isActive
    );
    
    if (!user) {
      console.warn(`Login failed: User '${cleanUsername}' not found.`);
      return null;
    }
    
    // Check password case-insensitively
    if (user.password) {
      const userPass = user.password.toLowerCase();
      if (userPass !== cleanPassword) {
        console.warn(`Login failed: Invalid password for '${cleanUsername}'.`);
        return null;
      }
    }

    return user;
  }

  // --- CORE LOGIC ---
  
  private calculateBreakdown(device: Device): PriceBreakdown {
    const S = this.settings;
    const P = device.factoryPriceEUR; // Pricelist
    const L = device.length;
    const W = device.weight;

    // 1. Company Price = P * D
    const companyPrice = P * S.discountMultiplier;

    // 2. Shipment = L * F
    const shipment = L * S.freightRatePerLengthEUR;

    // 3. Custom = W * (CN / CD)
    const custom = W * (S.customsNumerator / S.customsDenominator);

    // 4. Warranty = CompanyPrice * WR (UPDATED: Based on Company Price)
    const warranty = companyPrice * S.warrantyRate;

    // 5. Subtotal
    const subtotal = companyPrice + shipment + custom + warranty;

    // 6. Commission = Subtotal / COM
    const commission = subtotal / S.internalCommissionFactor;

    // 7. Office = Commission / OFF
    const office = commission / S.companyCostFactor;

    // 8. SellPrice = Office / PF
    const sellPrice = Math.ceil(office / S.profitFactor);

    return {
      inputs: { P, L, W },
      params: {
        D: S.discountMultiplier,
        F: S.freightRatePerLengthEUR,
        CN: S.customsNumerator,
        CD: S.customsDenominator,
        WR: S.warrantyRate,
        COM: S.internalCommissionFactor,
        OFF: S.companyCostFactor,
        PF: S.profitFactor,
      },
      steps: {
        companyPrice,
        shipment,
        custom,
        warranty,
        subtotal,
        commission,
        office,
        sellPrice
      }
    };
  }

  private calculatePriceInternal(device: Device): number {
    return this.calculateBreakdown(device).steps.sellPrice;
  }

  // --- EMPLOYEE API ---

  async getCategoriesSafe(): Promise<Category[]> {
    return this.categories.filter(c => c.isActive);
  }

  async searchDevicesSafe(query: string, categoryId?: string): Promise<SafeDeviceDTO[]> {
    let result = this.devices.filter(d => d.isActive);

    if (categoryId && categoryId !== 'all') {
      result = result.filter(d => d.categoryId === categoryId);
    }

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(d => d.modelName.toLowerCase().includes(q));
    }

    return result.map(d => ({
      id: d.id,
      modelName: d.modelName,
      categoryId: d.categoryId,
      categoryName: this.categories.find(c => c.id === d.categoryId)?.name || 'Unknown',
    }));
  }

  // PROJECT MANAGEMENT
  async createProject(userId: string, name: string): Promise<Project> {
    const user = this.users.find(u => u.id === userId);
    const newProject: Project = {
      id: generateId(),
      name,
      userId,
      userFullName: user?.fullName,
      createdAt: Date.now()
    };
    this.projects.push(newProject);
    this.saveAll();
    return newProject;
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    return this.projects.filter(p => p.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
  }

  // COMMENTS SYSTEM
  async addComment(projectId: string, userId: string, content: string): Promise<Comment> {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error("User not found");

    const comment: Comment = {
      id: generateId(),
      projectId,
      userId,
      userFullName: user.fullName,
      role: user.role,
      content,
      timestamp: Date.now(),
      isRead: false
    };

    this.comments.push(comment);
    this.saveAll();
    return comment;
  }

  async getProjectComments(projectId: string): Promise<Comment[]> {
    return this.comments
      .filter(c => c.projectId === projectId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  async markCommentsAsRead(projectId: string, readerRole: 'admin' | 'employee') {
    // If admin is reading, mark employee comments as read
    // If employee is reading, mark admin comments as read
    const targetRole = readerRole === 'admin' ? 'employee' : 'admin';
    
    let changed = false;
    this.comments.forEach(c => {
      if (c.projectId === projectId && c.role === targetRole && !c.isRead) {
        c.isRead = true;
        changed = true;
      }
    });

    if (changed) this.saveAll();
  }

  async getUnreadCommentsCountForUser(userId: string): Promise<number> {
    // Count comments from ADMIN for this user's projects that are unread
    const userProjectIds = this.projects.filter(p => p.userId === userId).map(p => p.id);
    return this.comments.filter(c => 
      userProjectIds.includes(c.projectId) && 
      c.role === 'admin' && 
      !c.isRead
    ).length;
  }

  // REQUEST PRICE (Linked to Project)
  async requestPrice(userId: string, deviceId: string, projectId: string): Promise<RequestStatusDTO> {
    const device = this.devices.find(d => d.id === deviceId);
    const user = this.users.find(u => u.id === userId);
    const project = this.projects.find(p => p.id === projectId);
    
    if (!device || !user || !project) throw new Error("Invalid data");

    const existingPending = this.logs.find(l => 
      l.userId === userId && 
      l.deviceId === deviceId && 
      l.projectId === projectId &&
      l.status === 'pending'
    );

    if (existingPending) {
       return {
         requestId: existingPending.id,
         deviceId: existingPending.deviceId,
         projectId: existingPending.projectId,
         status: existingPending.status,
         sellPriceEUR: null,
         timestamp: existingPending.timestamp
       };
    }

    const priceEUR = this.calculatePriceInternal(device);
    
    const log: InquiryLog = {
      id: generateId(),
      userId: user.id,
      userFullName: user.fullName,
      deviceId: device.id,
      projectId: project.id,
      projectNameSnapshot: project.name,
      categoryNameSnapshot: this.categories.find(c => c.id === device.categoryId)?.name || 'Unknown',
      modelNameSnapshot: device.modelName,
      sellPriceEURSnapshot: priceEUR,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    this.logs.unshift(log);
    this.saveAll();

    return {
      requestId: log.id,
      deviceId: log.deviceId,
      projectId: log.projectId,
      status: 'pending',
      sellPriceEUR: null,
      timestamp: log.timestamp
    };
  }

  async getUserRequests(userId: string): Promise<RequestStatusDTO[]> {
    const userLogs = this.logs.filter(l => l.userId === userId);
    
    return userLogs.map(log => ({
      requestId: log.id,
      deviceId: log.deviceId,
      projectId: log.projectId,
      status: log.status,
      sellPriceEUR: log.status === 'approved' ? log.sellPriceEURSnapshot : null,
      timestamp: log.timestamp
    }));
  }

  // --- ADMIN API ---

  async getAdminData() {
    return {
      users: this.users,
      categories: this.categories,
      devices: this.devices,
      settings: this.settings,
      logs: this.logs,
      projects: this.projects
    };
  }

  async getAdminProjectSummaries(): Promise<ProjectSummaryDTO[]> {
    return this.projects.map(p => {
      const pComments = this.comments.filter(c => c.projectId === p.id);
      const unreadCount = pComments.filter(c => c.role === 'employee' && !c.isRead).length;
      const lastCommentTime = pComments.length > 0 ? pComments[pComments.length - 1].timestamp : 0;
      const lastLogTime = this.logs.find(l => l.projectId === p.id)?.timestamp || 0;
      
      return {
        ...p,
        unreadCount,
        lastActivity: Math.max(p.createdAt, lastCommentTime, lastLogTime)
      };
    }).sort((a, b) => b.lastActivity - a.lastActivity);
  }

  async getDeviceBreakdown(deviceId: string): Promise<PriceBreakdown> {
    const device = this.devices.find(d => d.id === deviceId);
    if (!device) throw new Error("Device not found");
    return this.calculateBreakdown(device);
  }

  async updateSettings(newSettings: GlobalSettings) {
    this.settings = newSettings;
    this.saveAll();
  }

  async updateDevice(device: Device) {
    const idx = this.devices.findIndex(d => d.id === device.id);
    if (idx >= 0) {
      this.devices[idx] = device;
    } else {
      this.devices.push({ ...device, id: generateId() });
    }
    this.saveAll();
  }

  async deleteDevice(id: string) {
    this.devices = this.devices.filter(d => d.id !== id);
    this.saveAll();
  }

  async saveCategory(category: Category) {
    const idx = this.categories.findIndex(c => c.id === category.id);
    if (idx >= 0) {
      this.categories[idx] = category;
    } else {
      this.categories.push({ ...category, id: generateId() });
    }
    this.saveAll();
  }

  async deleteCategory(id: string) {
    this.categories = this.categories.filter(c => c.id !== id);
    this.saveAll();
  }

  async saveUser(user: User) {
    const idx = this.users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      this.users[idx] = user;
    } else {
      this.users.push({ ...user, id: generateId() });
    }
    this.saveAll();
  }

  async deleteUser(id: string) {
    const userToDelete = this.users.find(u => u.id === id);
    if (userToDelete?.role === 'admin') {
       const adminCount = this.users.filter(u => u.role === 'admin').length;
       if (adminCount <= 1) throw new Error("Cannot delete the last admin");
    }
    this.users = this.users.filter(u => u.id !== id);
    this.saveAll();
  }

  async setRequestStatus(logId: string, status: 'approved' | 'rejected') {
    const log = this.logs.find(l => l.id === logId);
    if (log) {
      log.status = status;
      log.adminResponseTime = Date.now();
      this.saveAll();
    }
  }
}

export const backend = new MockBackendService();
