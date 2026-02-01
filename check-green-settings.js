const API_URL = process.env.NEXT_PUBLIC_GREEN_API_URL;
const ID_INSTANCE = process.env.NEXT_PUBLIC_GREEN_API_ID_INSTANCE;
const API_TOKEN = process.env.NEXT_PUBLIC_GREEN_API_TOKEN_INSTANCE;

async function checkSettings() {
    const url = `${API_URL}/waInstance${ID_INSTANCE}/getSettings/${API_TOKEN}`;
    const response = await fetch(url);
    const settings = await response.json();
    console.log('Green API Settings:', JSON.stringify(settings, null, 2));
}

checkSettings();
