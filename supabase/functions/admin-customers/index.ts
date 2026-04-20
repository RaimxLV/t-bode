import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (!isAdmin) {
      // Also allow whitelisted admins
      const email = claimsData.claims.email as string | undefined;
      if (!email) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isWhitelisted } = await userClient.rpc("is_admin_whitelisted", { _email: email });
      if (!isWhitelisted) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Use service role to read auth.users + profiles + orders aggregates
    const admin = createClient(supabaseUrl, serviceKey);

    // List users (paginated; first 1000 for now)
    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersError) throw usersError;

    const users = usersData.users;
    const userIds = users.map((u) => u.id);

    // Profiles
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", userIds);
    const profilesMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

    // Orders aggregates
    const { data: orders } = await admin
      .from("orders")
      .select("user_id, total, created_at, status")
      .in("user_id", userIds);

    const ordersByUser = new Map<string, { count: number; total: number; lastDate: string | null }>();
    (orders ?? []).forEach((o: any) => {
      if (!o.user_id) return;
      const cur = ordersByUser.get(o.user_id) ?? { count: 0, total: 0, lastDate: null };
      cur.count += 1;
      // Exclude cancelled from total spend
      if (o.status !== "cancelled") cur.total += Number(o.total ?? 0);
      if (!cur.lastDate || new Date(o.created_at) > new Date(cur.lastDate)) cur.lastDate = o.created_at;
      ordersByUser.set(o.user_id, cur);
    });

    const customers = users.map((u) => {
      const p = profilesMap.get(u.id) as any;
      const stats = ordersByUser.get(u.id) ?? { count: 0, total: 0, lastDate: null };
      return {
        id: u.id,
        email: u.email,
        full_name: p?.full_name ?? null,
        phone: p?.phone ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        orders_count: stats.count,
        total_spent: stats.total,
        last_order_at: stats.lastDate,
      };
    });

    // Sort: most recent registered first
    customers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return new Response(JSON.stringify({ customers }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("admin-customers error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
