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

        // 0. Handle Human Hand-off (Detect manual messages from phone)
        if (payload.typeWebhook === "outgoingMessageReceived" || payload.typeWebhook === "outgoingAPIMessageReceived") {
            const chatId = payload.chatId || payload.senderData?.chatId;
            const wid = payload.instanceData?.wid;
            const sendByApi = payload.sendByApi;
            const typeWebhook = payload.typeWebhook;

            const text = payload.messageData?.textMessageData?.textMessage ||
                payload.messageData?.extendedTextMessageData?.text || "";

            // Check for unpause command
            const isUnpauseCommand = text.includes("רותם חזרי") || text.toLowerCase().includes("resume");

            if (isUnpauseCommand && chatId) {
                console.log(`Unpause command detected: ${text}. Resuming Rotem for ${chatId}.`);
                await supabase.from("session_control").upsert({
                    chat_id: chatId,
                    is_paused: false,
                    updated_at: new Date().toISOString()
                });

                await supabase.from("debug_logs").insert({
                    payload: { diag: "session-unpaused-command", chatId, text }
                });

                return new Response(JSON.stringify({ status: "unpaused" }), {
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Manual message detection:
            // 1. typeWebhook is outgoingMessageReceived AND sendByApi is not true
            const isManual = (typeWebhook === "outgoingMessageReceived" && sendByApi !== true);

            // ONLY pause if talking to SOMEONE ELSE (not self)
            if (isManual && chatId && chatId !== wid) {
                console.log(`Human intervention detected in chat: ${chatId}. Pausing Rotem.`);
                await supabase.from("session_control").upsert({
                    chat_id: chatId,
                    is_paused: true,
                    last_human_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

                await supabase.from("debug_logs").insert({
                    payload: { diag: "human-intervention", chatId, reason: "manual-outgoing-message", typeWebhook, sendByApi }
                });
            }

            // SPECIAL CASE: If it's a manual message to self, treat it as an incoming prompt!
            if (isManual && chatId === wid) {
                console.log(`Self-chat detected for owner ${wid}. Processing as incoming prompt.`);
                payload.typeWebhook = "incomingMessageReceived";
                payload.senderData = {
                    chatId: wid,
                    sender: wid,
                    senderName: payload.senderData?.senderName || "Owner",
                };
            }
        }

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

            // 1.5 Check if session is paused (Human Hand-off)
            const { data: session } = await supabase
                .from("session_control")
                .select("*")
                .eq("chat_id", chatId)
                .single();

            let isPaused = false;
            if (session && session.is_paused) {
                const isVIP = chatId === "972542619636@c.us";
                const pauseDuration = isVIP ? 24 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000; // 24h for specific contact, else 6h
                const lastHumanAt = new Date(session.last_human_at).getTime();
                const now = new Date().getTime();

                if (now - lastHumanAt < pauseDuration) {
                    console.log(`Rotem is in background mode for ${chatId} due to human intervention.`);
                    isPaused = true;
                    await supabase.from("debug_logs").insert({
                        payload: { diag: "session-paused-background", chatId, reason: "human-intervention-active" }
                    });
                } else {
                    // Reset pause after duration expires
                    await supabase.from("session_control").update({ is_paused: false }).eq("chat_id", chatId);
                }
            }

            // 2. Whitelist: Only respond to specific keywords OR authorized numbers
            const AUTHORIZED_NUMBERS = ["972526672663", "972542619636", "972526672664", "972502424469", "972507445589"];
            const whitelistKeywords = ["ועד בית", "משרד"];

            const isAuthorizedNumber = AUTHORIZED_NUMBERS.includes(senderNumber);
            const isAuthorizedKeyword = whitelistKeywords.some(keyword =>
                senderName.includes(keyword) || chatName.includes(keyword)
            );

            if (!isAuthorizedNumber && !isAuthorizedKeyword) {
                console.log(`Ignoring unauthorized contact (not in whitelist): ${senderName || chatName}`);
                await supabase.from("debug_logs").insert({
                    payload: { diag: "ignored-message", from: senderNumber, name: senderName || chatName, reason: "not_in_whitelist" }
                });
                return new Response(JSON.stringify({ status: "ignored_whitelist" }), {
                    headers: { "Content-Type": "application/json" },
                });
            }

            // 3. Blacklist: Ignore specific names (EXCEPT for explicitly authorized numbers)
            if (!isAuthorizedNumber) {
                const blacklist = ["אמא", "קארין", "שלומי"];
                if (blacklist.some(name => senderName.includes(name) || chatName.includes(name))) {
                    console.log(`Ignoring blacklisted contact: ${senderName || chatName}`);
                    await supabase.from("debug_logs").insert({
                        payload: { diag: "ignored-message", from: senderNumber, name: senderName || chatName, reason: "blacklist" }
                    });
                    return new Response(JSON.stringify({ status: "ignored_blacklist" }), {
                        headers: { "Content-Type": "application/json" },
                    });
                }
            }

            const isAudio = payload.messageData?.typeMessage === "audioMessage";
            const fileData = isAudio ? payload.messageData.fileMessageData : null;
            const downloadUrl = fileData?.downloadUrl;
            const mimeType = fileData?.mimeType;

            const text = payload.messageData?.textMessageData?.textMessage ||
                payload.messageData?.extendedTextMessageData?.text ||
                (isAudio ? "שלחת לי הודעה קולית" : ""); // Handle audio gracefully

            console.log(`Incoming ${isAudio ? 'audio' : 'text'} message from ${senderNumber}: ${text}`);

            // 4. Forward to Next.js API
            try {
                const res = await fetch(`${NEXT_JS_API_URL}/api/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: text,
                        chatId: chatId,
                        messageId: payload.idMessage,
                        messageType: isAudio ? "audio" : "text",
                        downloadUrl: downloadUrl,
                        mimeType: mimeType,
                        isPaused: isPaused
                    })
                });

                if (!res.ok) {
                    const errText = await res.text();
                    console.error("Rotem Agent error:", errText);
                    await supabase.from("debug_logs").insert({
                        payload: { diag: "forward-error", status: res.status, details: errText }
                    });
                } else {
                    console.log("Forwarded successfully.");
                    await supabase.from("debug_logs").insert({
                        payload: {
                            diag: "forward-success",
                            to: NEXT_JS_API_URL,
                            from: senderNumber,
                            sentPayload: {
                                message: text,
                                chatId: chatId,
                                isPaused: isPaused
                            }
                        }
                    });
                }
            } catch (fetchError: any) {
                console.error("Fetch error:", fetchError);
                await supabase.from("debug_logs").insert({
                    payload: { diag: "fetch-exception", message: fetchError.message }
                });
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
