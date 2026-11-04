import { createClient } from 'npm:@supabase/supabase-js@2.75.1';

const origin = 'https://lijie5867.com';
const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
const admins = new Set(['lijie5868@gmail.com', 'ru8ru8u8@gmail.com', 'lazyunclek@gmail.com']);
const reply = (status: number, message: string) => new Response(JSON.stringify({ message }), { status, headers });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST' || request.headers.get('origin') !== origin) return reply(403, '不允許此請求。');
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return reply(401, '請重新登入。');
  const url = Deno.env.get('SUPABASE_URL');
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !secret) return reply(503, '伺服器尚未設定完成。');
  const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || user?.email?.toLowerCase() !== 'ru8ru8u8@gmail.com' || !user.email_confirmed_at) return reply(403, '只有指定管理員可以設定臨時密碼。');
  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return reply(400, '請檢查輸入內容。'); }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body.password;
  if (!admins.has(email) || typeof password !== 'string' || password.length < 12 || password.length > 128) return reply(400, '請選擇管理員並輸入 12 至 128 個字元的臨時密碼。');
  const { data, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (listError) return reply(503, '暫時無法查詢管理員帳號。');
  const target = data.users.find(item => item.email?.toLowerCase() === email);
  if (!target) return reply(404, '找不到此管理員帳號。');
  const { error } = await admin.auth.admin.updateUserById(target.id, { password });
  if (error) return reply(400, '無法設定密碼，請確認是否符合專案密碼規則。');
  return reply(200, '臨時密碼已設定。請透過安全方式告知該管理員，並請對方登入後立即修改。');
});
