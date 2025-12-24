import { supabase } from './supabase';
import {
  Device,
  GlobalSettings,
  InquiryLog,
  User,
  Category,
  SafeDeviceDTO,
  RequestStatusDTO,
  Project,
  Comment,
  ProjectSummaryDTO,
  PriceBreakdown,
  Role,
} from './types';

class SupabaseBackendService {
  private calculateBreakdown(device: Device, settings: GlobalSettings): PriceBreakdown {
    const S = settings;
    const P = device.factoryPriceEUR;
    const L = device.length;
    const W = device.weight;

    const companyPrice = P * S.discountMultiplier;
    const shipment = L * S.freightRatePerLengthEUR;
    const custom = W * (S.customsNumerator / S.customsDenominator);
    const warranty = companyPrice * S.warrantyRate;
    const subtotal = companyPrice + shipment + custom + warranty;
    const commission = subtotal / S.internalCommissionFactor;
    const office = commission / S.companyCostFactor;
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
        sellPrice,
      },
    };
  }

  private calculatePriceInternal(device: Device, settings: GlobalSettings): number {
    return this.calculateBreakdown(device, settings).steps.sellPrice;
  }

  async login(username: string, password?: string): Promise<User | null> {
    try {
      const cleanUsername = username.trim().toLowerCase();
      const cleanPassword = password ? password.trim() : '';

      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${cleanUsername}@damon.local`,
        password: cleanPassword,
      });

      if (error) {
        console.warn(`Login failed: ${error.message}`);
        return null;
      }

      if (!data.user) {
        console.warn(`Login failed: No user data`);
        return null;
      }

      const role = data.user.app_metadata?.role as Role || 'employee';
      const fullName = data.user.user_metadata?.full_name || 'Unknown User';

      return {
        id: data.user.id,
        username: cleanUsername,
        fullName,
        role,
        isActive: true,
      };
    } catch (e) {
      console.error('Login error:', e);
      return null;
    }
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  async getCategoriesSafe(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return (data || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      isActive: cat.is_active,
    }));
  }

  async searchDevicesSafe(query: string, categoryId?: string): Promise<SafeDeviceDTO[]> {
    let queryBuilder = supabase
      .from('devices')
      .select('id, model_name, category_id, categories!inner(name)')
      .eq('is_active', true);

    if (categoryId && categoryId !== 'all') {
      queryBuilder = queryBuilder.eq('category_id', categoryId);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error searching devices:', error);
      return [];
    }

    let result = data || [];

    if (query) {
      const q = query.toLowerCase();
      result = result.filter((d: any) => d.model_name.toLowerCase().includes(q));
    }

    return result.map((d: any) => ({
      id: d.id,
      modelName: d.model_name,
      categoryId: d.category_id,
      categoryName: d.categories?.name || 'Unknown',
    }));
  }

  async createProject(userId: string, name: string): Promise<Project> {
    const { data, error } = await supabase.from('projects').insert({ user_id: userId, name }).select();

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }

    const project = data?.[0];
    if (!project) {
      throw new Error('No project returned');
    }

    return {
      id: project.id,
      name: project.name,
      userId: project.user_id,
      createdAt: new Date(project.created_at).getTime(),
    };
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return [];
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      userId: p.user_id,
      createdAt: new Date(p.created_at).getTime(),
    }));
  }

  async addComment(projectId: string, userId: string, userFullName: string, content: string, role: Role): Promise<Comment> {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        project_id: projectId,
        user_id: userId,
        user_full_name: userFullName,
        role,
        content,
      })
      .select();

    if (error) {
      throw new Error(`Failed to add comment: ${error.message}`);
    }

    const comment = data?.[0];
    if (!comment) {
      throw new Error('No comment returned');
    }

    return {
      id: comment.id,
      projectId: comment.project_id,
      userId: comment.user_id,
      userFullName: comment.user_full_name,
      role: comment.role,
      content: comment.content,
      timestamp: new Date(comment.created_at).getTime(),
      isRead: comment.is_read,
    };
  }

  async getProjectComments(projectId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at');

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }

    return (data || []).map((c: any) => ({
      id: c.id,
      projectId: c.project_id,
      userId: c.user_id,
      userFullName: c.user_full_name,
      role: c.role,
      content: c.content,
      timestamp: new Date(c.created_at).getTime(),
      isRead: c.is_read,
    }));
  }

  async markCommentsAsRead(projectId: string, readerRole: 'admin' | 'employee'): Promise<void> {
    const targetRole = readerRole === 'admin' ? 'employee' : 'admin';

    const { error } = await supabase
      .from('comments')
      .update({ is_read: true })
      .eq('project_id', projectId)
      .eq('role', targetRole);

    if (error) {
      console.error('Error marking comments as read:', error);
    }
  }

  async getUnreadCommentsCountForUser(userId: string): Promise<number> {
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId);

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return 0;
    }

    const projectIds = (projects || []).map((p: any) => p.id);

    if (projectIds.length === 0) {
      return 0;
    }

    const { data, error } = await supabase
      .from('comments')
      .select('id')
      .in('project_id', projectIds)
      .eq('role', 'admin')
      .eq('is_read', false);

    if (error) {
      console.error('Error counting unread comments:', error);
      return 0;
    }

    return data?.length || 0;
  }

  async requestPrice(userId: string, deviceId: string, projectId: string): Promise<RequestStatusDTO> {
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .maybeSingle();

    if (deviceError || !device) {
      throw new Error('Device not found');
    }

    const { data: existingLog } = await supabase
      .from('inquiry_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .eq('project_id', projectId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingLog) {
      return {
        requestId: existingLog.id,
        deviceId: existingLog.device_id,
        projectId: existingLog.project_id,
        status: existingLog.status,
        sellPriceEUR: null,
        timestamp: new Date(existingLog.created_at).getTime(),
      };
    }

    const { data: settings } = await supabase
      .from('global_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (!settings) {
      throw new Error('Settings not found');
    }

    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', device.category_id)
      .maybeSingle();

    const priceEUR = this.calculatePriceInternal(
      {
        id: device.id,
        modelName: device.model_name,
        categoryId: device.category_id,
        isActive: device.is_active,
        factoryPriceEUR: device.factory_price_eur,
        length: device.length,
        weight: device.weight,
      },
      {
        id: settings.id,
        isActive: settings.is_active,
        discountMultiplier: settings.discount_multiplier,
        freightRatePerLengthEUR: settings.freight_rate_per_length_eur,
        customsNumerator: settings.customs_numerator,
        customsDenominator: settings.customs_denominator,
        warrantyRate: settings.warranty_rate,
        internalCommissionFactor: settings.internal_commission_factor,
        companyCostFactor: settings.company_cost_factor,
        profitFactor: settings.profit_factor,
      }
    );

    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiry_logs')
      .insert({
        user_id: userId,
        device_id: deviceId,
        project_id: projectId,
        category_name_snapshot: category?.name || 'Unknown',
        model_name_snapshot: device.model_name,
        sell_price_eur_snapshot: priceEUR,
      })
      .select();

    if (inquiryError || !inquiry?.[0]) {
      throw new Error('Failed to create inquiry log');
    }

    return {
      requestId: inquiry[0].id,
      deviceId: inquiry[0].device_id,
      projectId: inquiry[0].project_id,
      status: 'pending',
      sellPriceEUR: null,
      timestamp: new Date(inquiry[0].created_at).getTime(),
    };
  }

  async getUserRequests(userId: string): Promise<RequestStatusDTO[]> {
    const { data, error } = await supabase
      .from('inquiry_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      return [];
    }

    return (data || []).map((log: any) => ({
      requestId: log.id,
      deviceId: log.device_id,
      projectId: log.project_id,
      status: log.status,
      sellPriceEUR: log.status === 'approved' ? log.sell_price_eur_snapshot : null,
      timestamp: new Date(log.created_at).getTime(),
    }));
  }

  async getAdminData() {
    const { data: categories } = await supabase.from('categories').select('*');
    const { data: devices } = await supabase.from('devices').select('*');
    const { data: settings } = await supabase.from('global_settings').select('*');
    const { data: logs } = await supabase.from('inquiry_logs').select('*');
    const { data: projects } = await supabase.from('projects').select('*');

    return {
      categories: categories || [],
      devices: devices || [],
      settings: settings || [],
      logs: logs || [],
      projects: projects || [],
    };
  }

  async getAdminProjectSummaries(): Promise<ProjectSummaryDTO[]> {
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return [];
    }

    const summaries: ProjectSummaryDTO[] = [];

    for (const p of projects || []) {
      const { data: comments } = await supabase
        .from('comments')
        .select('*')
        .eq('project_id', p.id);

      const unreadCount = (comments || []).filter((c: any) => c.role === 'employee' && !c.is_read).length;
      const lastCommentTime = comments && comments.length > 0 ? new Date(comments[comments.length - 1].created_at).getTime() : 0;

      const { data: logs } = await supabase
        .from('inquiry_logs')
        .select('created_at')
        .eq('project_id', p.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const lastLogTime = logs && logs.length > 0 ? new Date(logs[0].created_at).getTime() : 0;

      summaries.push({
        id: p.id,
        name: p.name,
        userId: p.user_id,
        createdAt: new Date(p.created_at).getTime(),
        unreadCount,
        lastActivity: Math.max(new Date(p.created_at).getTime(), lastCommentTime, lastLogTime),
      });
    }

    return summaries.sort((a, b) => b.lastActivity - a.lastActivity);
  }

  async getDeviceBreakdown(deviceId: string): Promise<PriceBreakdown> {
    const { data: device } = await supabase
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .maybeSingle();

    const { data: settings } = await supabase
      .from('global_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (!device || !settings) {
      throw new Error('Device or settings not found');
    }

    return this.calculateBreakdown(
      {
        id: device.id,
        modelName: device.model_name,
        categoryId: device.category_id,
        isActive: device.is_active,
        factoryPriceEUR: device.factory_price_eur,
        length: device.length,
        weight: device.weight,
      },
      {
        id: settings.id,
        isActive: settings.is_active,
        discountMultiplier: settings.discount_multiplier,
        freightRatePerLengthEUR: settings.freight_rate_per_length_eur,
        customsNumerator: settings.customs_numerator,
        customsDenominator: settings.customs_denominator,
        warrantyRate: settings.warranty_rate,
        internalCommissionFactor: settings.internal_commission_factor,
        companyCostFactor: settings.company_cost_factor,
        profitFactor: settings.profit_factor,
      }
    );
  }

  async updateSettings(newSettings: GlobalSettings) {
    const { error } = await supabase
      .from('global_settings')
      .update({
        discount_multiplier: newSettings.discountMultiplier,
        freight_rate_per_length_eur: newSettings.freightRatePerLengthEUR,
        customs_numerator: newSettings.customsNumerator,
        customs_denominator: newSettings.customsDenominator,
        warranty_rate: newSettings.warrantyRate,
        internal_commission_factor: newSettings.internalCommissionFactor,
        company_cost_factor: newSettings.companyCostFactor,
        profit_factor: newSettings.profitFactor,
      })
      .eq('id', newSettings.id);

    if (error) {
      throw new Error(`Failed to update settings: ${error.message}`);
    }
  }

  async updateDevice(device: Device) {
    const { error } = await supabase.from('devices').upsert({
      id: device.id,
      model_name: device.modelName,
      category_id: device.categoryId,
      is_active: device.isActive,
      factory_price_eur: device.factoryPriceEUR,
      length: device.length,
      weight: device.weight,
    });

    if (error) {
      throw new Error(`Failed to update device: ${error.message}`);
    }
  }

  async deleteDevice(id: string) {
    const { error } = await supabase.from('devices').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete device: ${error.message}`);
    }
  }

  async saveCategory(category: Category) {
    const { error } = await supabase.from('categories').upsert({
      id: category.id,
      name: category.name,
      is_active: category.isActive,
    });

    if (error) {
      throw new Error(`Failed to save category: ${error.message}`);
    }
  }

  async deleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }

  async setRequestStatus(logId: string, status: 'approved' | 'rejected') {
    const { error } = await supabase
      .from('inquiry_logs')
      .update({
        status,
        admin_response_time: new Date().toISOString(),
      })
      .eq('id', logId);

    if (error) {
      throw new Error(`Failed to update request status: ${error.message}`);
    }
  }
}

export const supabaseBackend = new SupabaseBackendService();
