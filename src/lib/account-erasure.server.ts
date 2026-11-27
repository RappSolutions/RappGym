import { supabaseAdmin } from '@/integrations/supabase/client.server';
/** Private application data is erased in one DB transaction; Auth is removed last. Retry is idempotent. */
export async function eraseAccount(userId: string) {
  const { error } = await supabaseAdmin.rpc('erase_account_data', { _user_id: userId });
  if (error) throw new Error(error.message);
  const result = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (result.error) throw new Error(result.error.message);
}
