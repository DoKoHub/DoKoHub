import { db } from "$lib/server/db";
import { nummer } from "$lib/server/db/schema";
import type { RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async({ request }) => {
    const data = await request.json();
    
    await db.insert(nummer).values({ wert: data.eingabe });

    return new Response(JSON.stringify({ success: true}));
};