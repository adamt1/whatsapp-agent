const API_URL = process.env.NEXT_PUBLIC_GREEN_API_URL;
const ID_INSTANCE = process.env.NEXT_PUBLIC_GREEN_API_ID_INSTANCE;
const API_TOKEN = process.env.NEXT_PUBLIC_GREEN_API_TOKEN_INSTANCE;

import { supabase } from './supabase';

export interface GreenApiSettings {
    wid: string;
    countryCode: string;
    canSendMessage: boolean;
    canReceiveMessage: boolean;
    canReceiveNotifications: boolean;
    directApprove: boolean;
}

export interface GreenApiState {
    stateInstance: 'authorized' | 'notAuthorized' | 'blocked' | 'starting';
}

class GreenApiService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = `${API_URL}/waInstance${ID_INSTANCE}`;
    }

    private async request(method: string, endpoint: string, body?: any) {
        const url = `${this.baseUrl}/${endpoint}/${API_TOKEN}`;
        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Failed to ${endpoint}`);
        }
        return response.json();
    }

    async getSettings(): Promise<GreenApiSettings> {
        return this.request('GET', 'getSettings');
    }

    async getStateInstance(): Promise<GreenApiState> {
        return this.request('GET', 'getStateInstance');
    }

    async sendTyping(chatId: string, type: 'typing' | 'recording' = 'typing', time: number = 5000) {
        try {
            const body: any = { chatId, typingTime: time };
            if (type === 'recording') {
                body.typingType = 'recording';
            }
            return await this.request('POST', 'sendTyping', body);
        } catch (e) {
            console.error('Failed to set typing status:', e);
        }
    }

    async sendMessage(chatId: string, message: string) {
        const body: any = { chatId, message };

        const response = await this.request('POST', 'sendMessage', body);

        // Log to Supabase
        await supabase.from('messages').insert({
            chat_id: chatId,
            message_text: message,
            message_id: response.idMessage,
            type: 'text'
        });

        return response;
    }

    async sendFileByUrl(chatId: string, urlFile: string, fileName: string, caption?: string) {
        const body: any = { chatId, urlFile, fileName, caption };

        return this.request('POST', 'sendFileByUrl', body);
    }
}

export const greenApi = new GreenApiService();
