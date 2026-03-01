import { supabase } from '@/integrations/supabase/client';

export const updateSystemDateFormat = async (format: string) => {
  const { error } = await supabase
    .from('app_settings')
    .update({ system_date_format: format })
    .eq('id', '94ba5d73-b4e9-4c29-a215-aef5810a6282'); // Default row ID

  if (error) {
    console.error('Error updating system date format:', error);
    throw error;
  }

  console.log('System date format updated to:', format);
};