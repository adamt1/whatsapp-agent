// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Use the active localtunnel URL
const NEXT_JS_API_URL = "https://legal-comics-visit.loca.lt";

Deno.serve(async (req: Request) => {
    try {
        const payload = await req.json();
        console.log("Webhook received:", payload.typeWebhook);

        // LOG EVERYTHING for diagnosis
        await supabase.from("debug_logs").insert({
            payload: { diag: "webhook-received", type: payload.typeWebhook, full: payload }
        });

        // Filter for incoming messages
        if (payload.typeWebhook === "incomingMessageReceived") {
            const chatId = payload.senderData?.chatId;
            const sender = payload.senderData?.sender || chatId;
            const senderNumber = sender?.split("@")[0];
            const text = payload.messageData?.textMessageData?.textMessage ||
                payload.messageData?.extendedTextMessageData?.text ||
                "";

            console.log(`Incoming message from ${senderNumber}: ${text}`);

            if (NEXT_JS_API_URL) {
                console.log("Forwarding to Maya Agent...");
                try {
                    const res = await fetch(`${NEXT_JS_API_URL}/api/chat`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Bypass-Tunnel-Reminder": "true"
                        },
                        body: JSON.stringify({
                            message: text,
                            chatId: chatId
                        })
                    });

                    if (!res.ok) {
                        const errText = await res.text();
                        console.error("Maya Agent error:", errText);
                        await supabase.from("debug_logs").insert({
                            payload: { diag: "forward-error", status: res.status, details: errText }
                        });
                    } else {
                        console.log("Forwarded successfully.");
                        await supabase.from("debug_logs").insert({
                            payload: { diag: "forward-success", to: NEXT_JS_API_URL, from: senderNumber }
                        });
                    }
                } catch (fetchError: any) {
                    console.error("Fetch error:", fetchError);
                    await supabase.from("debug_logs").insert({
                        payload: { diag: "fetch-exception", message: fetchError.message }
                    });
                }
            }
        }

        return new Response(JSON.stringify({ status: "success" }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
});
