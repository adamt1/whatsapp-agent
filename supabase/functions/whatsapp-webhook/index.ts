// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Use the Vercel production URL
const NEXT_JS_API_URL = "https://whatsapp-agent-weld.vercel.app";

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
            const chatId = payload.senderData?.chatId || "";
            const sender = payload.senderData?.sender || chatId;
            const senderNumber = sender?.split("@")[0];
            const senderName = payload.senderData?.senderName || "";
            const chatName = payload.senderData?.chatName || "";

            // 1. Block groups
            if (chatId.endsWith("@g.us")) {
                console.log(`Ignoring group message: ${chatId}`);
                return new Response(JSON.stringify({ status: "ignored_group" }), {
                    headers: { "Content-Type": "application/json" },
                });
            }

            // 2. Blacklist: Ignore specific names
            const blacklist = ["אמא", "קארין", "שלומי", "קימי"];
            if (blacklist.some(name => senderName.includes(name) || chatName.includes(name))) {
                console.log(`Ignoring blacklisted contact: ${senderName || chatName}`);
                await supabase.from("debug_logs").insert({
                    payload: { diag: "ignored-message", from: senderNumber, name: senderName || chatName, reason: "blacklist" }
                });
                return new Response(JSON.stringify({ status: "ignored_blacklist" }), {
                    headers: { "Content-Type": "application/json" },
                });
            }

            // 3. Whitelist: Only respond to "ועד בית" or "משרד"
            const whitelistKeywords = ["ועד בית", "משרד"];
            const isAuthorized = whitelistKeywords.some(keyword =>
                senderName.includes(keyword) || chatName.includes(keyword)
            );

            if (!isAuthorized) {
                console.log(`Ignoring unauthorized contact (not in whitelist): ${senderName || chatName}`);
                await supabase.from("debug_logs").insert({
                    payload: { diag: "ignored-message", from: senderNumber, name: senderName || chatName, reason: "not_in_whitelist" }
                });
                return new Response(JSON.stringify({ status: "ignored_whitelist" }), {
                    headers: { "Content-Type": "application/json" },
                });
            }

            const isAudio = payload.messageData?.typeMessage === "audioMessage";
            const text = payload.messageData?.textMessageData?.textMessage ||
                payload.messageData?.extendedTextMessageData?.text ||
                (isAudio ? "שלחת לי הודעה קולית" : ""); // Handle audio gracefully

            console.log(`Incoming ${isAudio ? 'audio' : 'text'} message from ${senderNumber}: ${text}`);

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
                            chatId: chatId,
                            messageType: isAudio ? "audio" : "text"
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
