// js/api.js
import { marked } from 'https://esm.sh/marked@9.0.0'; // Ajusta la versión si es necesario

const BACKEND_URL = 'https://sussi-asistant.onrender.com';

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
        });
        console.log("Respuesta del backend (raw):", response);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Error desconocido del servidor", details: response.statusText }));
            console.error("Error de la API (fetch no ok):", errorData);
            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        console.log("Datos JSON del backend:", data);
        let aiMessageText = data.aiResponse || "No se recibió respuesta de la IA.";

        if (typeof marked === 'function') {
            // Para marked v5+, la función principal es `marked.parse()`. Si usas una versión anterior, podría ser solo `marked()`.
            // Revisa la documentación de la versión específica que estés cargando.
            // Asumiendo que 'marked' es la función parse directamente desde esm.sh o que es un objeto con un método 'parse'.
            // Con `import { marked } from '...'`, `marked` suele ser la función parse directamente.
            aiMessageText = marked(aiMessageText);
        } else {
            console.warn("Librería 'marked' no encontrada o no es una función. La respuesta de la IA se mostrará como texto plano.");
            const tempDiv = document.createElement('div');
            tempDiv.textContent = aiMessageText;
            aiMessageText = tempDiv.innerHTML.replace(/\n/g, '<br>');
        }
        
        return { sender: 'ai', text: aiMessageText, isHtml: true, timestamp: Date.now() };

    } catch (error) {
        console.error('Error en getAiResponse (catch):', error);
        return {
            sender: 'error',
            text: `<p>Error al conectar con la IA: ${error.message}. Revisa la consola del backend para más detalles.</p>`,
            isHtml: true,
            timestamp: Date.now()
        };
    }
}