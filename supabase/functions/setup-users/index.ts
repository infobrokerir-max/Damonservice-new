import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const users = [
      {
        email: "admin@damon.local",
        password: "admin",
        user_metadata: { full_name: "مدیر سیستم", username: "admin" },
        app_metadata: { role: "admin" },
      },
      {
        email: "ali@damon.local",
        password: "123",
        user_metadata: { full_name: "علی محمدی", username: "ali" },
        app_metadata: { role: "employee" },
      },
      {
        email: "sara@damon.local",
        password: "123",
        user_metadata: { full_name: "سارا رضایی", username: "sara" },
        app_metadata: { role: "employee" },
      },
    ];

    const results = [];

    for (const userData of users) {
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const userExists = existingUser?.users?.some(
        (u) => u.email === userData.email
      );

      if (!userExists) {
        const { data, error } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: userData.user_metadata,
          app_metadata: userData.app_metadata,
        });

        if (error) {
          results.push({
            email: userData.email,
            success: false,
            error: error.message,
          });
        } else {
          results.push({
            email: userData.email,
            success: true,
            userId: data.user?.id,
          });
        }
      } else {
        results.push({
          email: userData.email,
          success: true,
          message: "User already exists",
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
