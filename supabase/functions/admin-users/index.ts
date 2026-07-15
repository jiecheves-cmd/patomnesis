import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*"
};

type AdminUserPayload = {
  action?: "create" | "delete" | "reset_history";
  email?: string;
  fullName?: string;
  password?: string;
  role?: "student" | "teacher" | "supervisor";
  userId?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

function cleanRole(role: AdminUserPayload["role"]) {
  return ["student", "teacher", "supervisor"].includes(role || "") ? role : "student";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = request.headers.get("Authorization");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Faltan secretos de Supabase en la Edge Function." }, 500);
    }

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ error: "No autenticado." }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });
    const token = authorization.replace("Bearer ", "");
    const { data: authData, error: authError } = await admin.auth.getUser(token);

    if (authError || !authData.user) {
      return jsonResponse({ error: "Sesión no válida." }, 401);
    }

    const callerId = authData.user.id;
    const { data: callerProfile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!["supervisor", "admin"].includes(callerProfile?.role || "")) {
      return jsonResponse({ error: "Solo supervisores o administradores pueden gestionar usuarios." }, 403);
    }

    const payload = (await request.json()) as AdminUserPayload;

    if (payload.action === "create") {
      const email = payload.email?.trim().toLowerCase();
      const password = payload.password || "";
      const fullName = payload.fullName?.trim() || null;
      const role = cleanRole(payload.role);

      if (!email || !password) {
        return jsonResponse({ error: "Email y contraseña son obligatorios." }, 400);
      }

      if (password.length < 6) {
        return jsonResponse({ error: "La contraseña debe tener al menos 6 caracteres." }, 400);
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password,
        user_metadata: { full_name: fullName }
      });

      if (createError || !created.user) {
        return jsonResponse({ error: createError?.message || "No se pudo crear el usuario." }, 400);
      }

      const { data: profile, error: upsertError } = await admin
        .from("profiles")
        .upsert({
          email,
          full_name: fullName,
          id: created.user.id,
          role
        })
        .select("id, email, full_name, role, created_at")
        .single();

      if (upsertError) throw upsertError;
      return jsonResponse({ profile });
    }

    if (payload.action === "delete") {
      if (!payload.userId) {
        return jsonResponse({ error: "Falta el usuario a eliminar." }, 400);
      }

      if (payload.userId === callerId) {
        return jsonResponse({ error: "No puedes eliminar tu propia cuenta desde la app." }, 400);
      }

      const { error: deleteError } = await admin.auth.admin.deleteUser(payload.userId);
      if (deleteError) {
        return jsonResponse({ error: deleteError.message }, 400);
      }

      return jsonResponse({ deletedUserId: payload.userId });
    }

    if (payload.action === "reset_history") {
      if (!payload.userId) {
        return jsonResponse({ error: "Falta el usuario cuyo historial se va a reiniciar." }, 400);
      }

      const { error: resetError, count } = await admin
        .from("quiz_attempts")
        .delete({ count: "exact" })
        .eq("student_id", payload.userId);

      if (resetError) {
        return jsonResponse({ error: resetError.message }, 400);
      }

      return jsonResponse({ resetUserId: payload.userId, deletedAttempts: count ?? 0 });
    }

    return jsonResponse({ error: "Acción no reconocida." }, 400);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Error inesperado." }, 500);
  }
});
