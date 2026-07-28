import process from 'node:process';

const DEFAULT_SUPABASE_URL = 'https://cnmmdxmbdlrvvtvqqjpa.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNubW1keG1iZGxydnZ0dnFxanBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NjkzMDQsImV4cCI6MjA3NDU0NTMwNH0.iHPsWJQvPlZEO4gvxqijP0T-4zsJADlp4XZx_ADw1Cs';

export const config = {
  port: Number(process.env.PORT || 3000),
  supabaseUrl: process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'dev-verify-token',
  whatsappToken: process.env.WHATSAPP_TOKEN || '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
};

export function assertConfig() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  }
}
