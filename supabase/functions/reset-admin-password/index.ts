import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const newPassword = Deno.env.get("ADMIN_TEMP_PASSWORD");
  if (!newPassword) {
    return new Response(JSON.stringify({ error: "No password set" }), { status: 400 });
  }

  const userId = "9242b317-2791-4b1a-a6c6-9d1760b503a6";

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, message: "Password updated for ofsetadruka@gmail.com" }));
});
