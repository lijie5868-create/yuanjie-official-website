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
  if (authError || !user?.email || !admins.has(user.email.toLowerCase())) return reply(403, '只有管理員可以操作。');
  let body: { action?: unknown; email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return reply(400, '請檢查輸入內容。'); }
  if (body.action === 'list_roles') {
    const { data: roles, error: listError } = await admin.from('site_user_roles').select('email,role').order('role').order('email');
    if (listError) return reply(503, '暫時無法讀取角色名單。');
    return new Response(JSON.stringify({ roles }), { headers });
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body.password;
  if (!email.includes('@') || email.length > 254 || typeof password !== 'string' || password.length < 12 || password.length > 128) return reply(400, '請輸入有效帳號及 12 至 128 個字元的臨時密碼。');
  if (body.action === 'create_employee') {
    if (admins.has(email)) return reply(400, '此帳號已保留為管理員。');
    const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (createError || !created.user) return reply(400, '無法建立員工帳號，可能已存在。');
    const { error: insertError } = await admin.from('site_user_roles').insert({ user_id: created.user.id, email, role: 'employee' });
    if (insertError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return reply(503, '無法設定員工角色，帳號未建立。');
    }
    return reply(200, '員工帳號已建立，角色為唯讀。請安全地告知本人臨時密碼。');
  }
  if (body.action !== 'set_password') return reply(400, '不支援的操作。');
  const { data: targetRole, error: targetError } = await admin.from('site_user_roles').select('user_id,role').eq('email', email).single();
  if (targetError || !['admin', 'employee'].includes(targetRole.role)) return reply(403, '此帳號不在網站角色名單中。');
  const { error } = await admin.auth.admin.updateUserById(targetRole.user_id, { password });
  if (error) return reply(400, '無法設定密碼，請確認是否符合專案密碼規則。');
  return reply(200, '臨時密碼已設定。請透過安全方式告知該管理員，並請對方登入後立即修改。');
});
