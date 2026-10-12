import crypto from 'crypto';
import { supabaseAdmin } from './supabase';

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateAgentToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function authenticateAgent(request: Request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;

  const clientId = request.headers.get('x-client-id') || '';
  if (!clientId) return null;

  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('id, pc_name, agent_token_hash')
    .eq('id', clientId)
    .maybeSingle();

  if (error || !data) return null;
  if (!crypto.timingSafeEqual(Buffer.from(data.agent_token_hash), Buffer.from(hashToken(token)))) return null;
  return data;
}
