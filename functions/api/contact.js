export async function onRequestPost({ request, env }) {
    try {
        const { email, message } = await request.json();

        if (!email || !message) {
            return new Response(JSON.stringify({ success: false, error: 'Missing email or message.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const botToken = env.TELEGRAM_BOT_TOKEN;
        const chatId = env.TELEGRAM_CHAT_ID;

        if (!botToken || !chatId) {
            return new Response(JSON.stringify({ success: false, error: 'Server misconfiguration: missing credentials.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const text = `New Contact Form Submission!\n\nEmail: ${email}\n\nMessage:\n${message}`;
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Telegram API error:', errorText);
            throw new Error(`Telegram API responded with status: ${response.status}`);
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('Failed to process contact submission:', err);
        return new Response(JSON.stringify({ success: false, error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
