const nodeEnv = typeof process === 'undefined' ? {} : process.env;

export let config = createConfig(nodeEnv);

export function configure(env = {}) {
  config = createConfig(env);
}

function createConfig(env) {
  return {
    port: Number(env.PORT || 3000),
    supabaseUrl: env.SUPABASE_URL || '',
    supabaseAnonKey: env.SUPABASE_ANON_KEY || '',
    verifyToken: env.WHATSAPP_VERIFY_TOKEN || '',
    whatsappToken: env.WHATSAPP_TOKEN || '',
    whatsappPhoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || '',
  };
}

export function assertConfig() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  }
}
