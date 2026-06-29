import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    // ctx.supabase is an RLS-scoped client based on the user's JWT
    // ctx.supabaseAdmin is an admin client that bypasses RLS
    
    try {
      const { data, error } = await ctx.supabase.from("todos").select("*");
      
      if (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }

      return Response.json(data);
    } catch (err: any) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }),
};
