import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminProductivityReport, AdminTaskCategory } from '@/types/database';

export function useAdminProductivityReport(startDate?: Date, endDate?: Date) {
  const { data: report = [], isLoading } = useQuery({
    queryKey: ['admin-productivity-report', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_admin_productivity_report', {
          _start_date: startDate?.toISOString() || null,
          _end_date: endDate?.toISOString() || null,
        });
      
      if (error) throw error;
      return (data || []) as AdminProductivityReport[];
    },
  });

  // Aggregate by user
  const byUser = report.reduce((acc, item) => {
    if (!acc[item.user_id]) {
      acc[item.user_id] = {
        user_id: item.user_id,
        user_name: item.user_name,
        total_completed: 0,
        total_in_progress: 0,
        total_cancelled: 0,
        total_count: 0,
        avg_completion_minutes: 0,
        categories: {} as Record<AdminTaskCategory, typeof item>,
      };
    }
    
    acc[item.user_id].total_completed += item.completed_count;
    acc[item.user_id].total_in_progress += item.in_progress_count;
    acc[item.user_id].total_cancelled += item.cancelled_count;
    acc[item.user_id].total_count += item.total_count;
    acc[item.user_id].categories[item.category] = item;
    
    return acc;
  }, {} as Record<string, {
    user_id: string;
    user_name: string;
    total_completed: number;
    total_in_progress: number;
    total_cancelled: number;
    total_count: number;
    avg_completion_minutes: number;
    categories: Record<AdminTaskCategory, AdminProductivityReport>;
  }>);

  // Aggregate by category
  const byCategory = report.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = {
        category: item.category,
        total_completed: 0,
        total_in_progress: 0,
        total_cancelled: 0,
        total_count: 0,
      };
    }
    
    acc[item.category].total_completed += item.completed_count;
    acc[item.category].total_in_progress += item.in_progress_count;
    acc[item.category].total_cancelled += item.cancelled_count;
    acc[item.category].total_count += item.total_count;
    
    return acc;
  }, {} as Record<AdminTaskCategory, {
    category: AdminTaskCategory;
    total_completed: number;
    total_in_progress: number;
    total_cancelled: number;
    total_count: number;
  }>);

  // Monthly trends
  const byMonth = report.reduce((acc, item) => {
    const monthKey = item.month;
    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        total_completed: 0,
        total_in_progress: 0,
        total_cancelled: 0,
        total_count: 0,
      };
    }
    
    acc[monthKey].total_completed += item.completed_count;
    acc[monthKey].total_in_progress += item.in_progress_count;
    acc[monthKey].total_cancelled += item.cancelled_count;
    acc[monthKey].total_count += item.total_count;
    
    return acc;
  }, {} as Record<string, {
    month: string;
    total_completed: number;
    total_in_progress: number;
    total_cancelled: number;
    total_count: number;
  }>);

  return {
    report,
    byUser: Object.values(byUser),
    byCategory: Object.values(byCategory),
    byMonth: Object.values(byMonth).sort((a, b) => 
      new Date(b.month).getTime() - new Date(a.month).getTime()
    ),
    isLoading,
  };
}
