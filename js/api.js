// js/api.js
import { marked } from 'https://esm.sh/marked@9.0.0'; // Ajusta la versión si es necesario

const BACKEND_URL = 'https://sussi-backend.onrender.com/api/summarize';
const REQUEST_TIMEOUT = 30000; // 30 segundos

export async function getAiResponse(userInput, conversation) {
    console.log("NUEVA API.getAiResponse EJECUTÁNDOSE");
    console.log("Enviando a backend:", { userInput, systemPrompt: conversation.systemPrompt, /* conversationHistory simplificado */ });

    let conversationHistoryForApi = [];
    if (conversation.messages.length > 1 || (conversation.messages.length === 1 && conversation.messages[0].sender !== 'ai')) {
        conversationHistoryForApi = conversation.messages.map(msg => ({
            sender: msg.sender,
            text: msg.text,
            isHtml: msg.isHtml
        }));
    }

    try {
        console.log(`Haciendo fetch a: ${BACKEND_URL}`);
        
        // Crear AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userInput: userInput,
                systemPrompt: conversation.systemPrompt,
                conversationHistory: conversationHistoryForApi,
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log("Respuesta del backend (status):", response.status, response.statusText);

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { 
                    error: `Error del servidor: ${response.status}`, 
                    details: response.statusText 
                };
            }
            console.error("Error de la API:", errorData);
            throw new Error(errorData.error || errorData.details || `Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        console.log("Datos JSON del backend:", data);
        
        let aiMessageText = data.aiResponse || "No se recibió respuesta de la IA.";

        // Procesar Markdown
        if (typeof marked === 'function') {
            aiMessageText = marked(aiMessageText);
        } else if (typeof marked?.parse === 'function') {
            aiMessageText = marked.parse(aiMessageText);
        } else {
            console.warn("Librería 'marked' no disponible. Mostrando como texto plano.");
            const tempDiv = document.createElement('div');
            tempDiv.textContent = aiMessageText;
            aiMessageText = tempDiv.innerHTML.replace(/\n/g, '<br>');
        }
        
        return { 
            sender: 'ai', 
            text: aiMessageText, 
            isHtml: true, 
            timestamp: Date.now() 
        };

    } catch (error) {
        console.error('Error en getAiResponse:', error);
        
        let userMessage = 'Error al conectar con la IA';
        if (error.name === 'AbortError') {
            userMessage = 'La solicitud tardó demasiado (timeout). Intenta de nuevo.';
        } else if (error.message.includes('Failed to fetch')) {
            userMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
        } else {
            userMessage = error.message;
        }

        return {
            sender: 'error',
            text: `<p>${userMessage}</p>`,
            isHtml: true,
            timestamp: Date.now()
        };
    }
}
