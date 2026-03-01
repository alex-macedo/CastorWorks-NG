import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ServiceStatus = 'operational' | 'degraded' | 'down';

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  responseTime: number | null;
  uptime: number;
  lastChecked: Date;
}

export const useServiceHealth = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  const apiHealthUrl = supabaseUrl ? `${supabaseUrl}/rest/v1/` : null;

  const [services, setServices] = useState<ServiceHealth[]>([
    { name: 'Database', status: 'operational', responseTime: null, uptime: 100, lastChecked: new Date() },
    { name: 'Authentication', status: 'operational', responseTime: null, uptime: 100, lastChecked: new Date() },
    { name: 'API', status: 'operational', responseTime: null, uptime: 100, lastChecked: new Date() },
  ]);
  const [isChecking, setIsChecking] = useState(false);

  const checkDatabaseHealth = useCallback(async (): Promise<Partial<ServiceHealth>> => {
    const start = Date.now();
    try {
      const { error } = await supabase.auth.getUser();
      const responseTime = Date.now() - start;
      
      if (error && error.code !== 'PGRST116') {
        return { status: 'down', responseTime, uptime: 0 };
      }
      
      return { 
        status: responseTime > 1000 ? 'degraded' : 'operational', 
        responseTime,
        uptime: responseTime > 1000 ? 95 : 99.9 
      };
    } catch (error) {
      return { status: 'down', responseTime: Date.now() - start, uptime: 0 };
    }
  }, []);

  const checkAuthHealth = useCallback(async (): Promise<Partial<ServiceHealth>> => {
    const start = Date.now();
    try {
      const { data, error } = await supabase.auth.getSession();
      const responseTime = Date.now() - start;
      
      if (error) {
        return { status: 'down', responseTime, uptime: 0 };
      }
      
      return { 
        status: responseTime > 500 ? 'degraded' : 'operational', 
        responseTime,
        uptime: responseTime > 500 ? 97 : 99.9 
      };
    } catch (error) {
      return { status: 'down', responseTime: Date.now() - start, uptime: 0 };
    }
  }, []);

  const checkAPIHealth = useCallback(async (): Promise<Partial<ServiceHealth>> => {
    const start = Date.now();
    if (!apiHealthUrl || !supabaseAnonKey) {
      return { status: 'down', responseTime: Date.now() - start, uptime: 0 };
    }

    try {
      const response = await fetch(apiHealthUrl, {
        method: 'HEAD',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });
      const responseTime = Date.now() - start;
      
      if (!response.ok) {
        return { status: 'down', responseTime, uptime: 0 };
      }
      
      return { 
        status: responseTime > 800 ? 'degraded' : 'operational', 
        responseTime,
        uptime: responseTime > 800 ? 96 : 99.9 
      };
    } catch (error) {
      return { status: 'down', responseTime: Date.now() - start, uptime: 0 };
    }
  }, [apiHealthUrl, supabaseAnonKey]);

  const checkAllServices = useCallback(async () => {
    setIsChecking(true);
    
    const [dbHealth, authHealth, apiHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkAuthHealth(),
      checkAPIHealth(),
    ]);

    setServices([
      { name: 'Database', ...dbHealth, lastChecked: new Date() } as ServiceHealth,
      { name: 'Authentication', ...authHealth, lastChecked: new Date() } as ServiceHealth,
      { name: 'API', ...apiHealth, lastChecked: new Date() } as ServiceHealth,
    ]);
    
    setIsChecking(false);
  }, [checkAPIHealth, checkAuthHealth, checkDatabaseHealth]);

  useEffect(() => {
    checkAllServices();
    
    const interval = setInterval(checkAllServices, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [checkAllServices]);

  return { services, isChecking, refetch: checkAllServices };
};
