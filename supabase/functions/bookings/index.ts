import { withSupabase } from "@supabase/server";

export default {
  // Use auth: "none" for public availability, or "user" for protected endpoints
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    // ctx.supabaseAdmin bypasses RLS (since this might be a public endpoint that needs to read bookings)
    // ctx.supabase is RLS-scoped
    
    if (req.method === "GET") {
      try {
        const { data, error } = await ctx.supabase
          .from("booking_availability")
          .select("event_date");
          
        if (error) {
          return Response.json({ error: error.message }, { status: 400 });
        }
        
        return Response.json(data);
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }
    
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }),
};
