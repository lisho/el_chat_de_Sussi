// js/conversation.js
import { generateId } from './utils.js';
import { MAX_CONVERSATIONS, INITIAL_GREETING_AI, SYSTEM_PROMPT, MAX_MESSAGES_PER_CONV } from './config.js';

let conversations = [];
let currentConversationId = null;

export function getConversationsState() {
    return { conversations, currentConversationId };
}

export function createNewConversation(makeActive = true) {
    if (conversations.length >= MAX_CONVERSATIONS) {
        const oldestConversation = conversations.sort((a, b) => a.createdAt - b.createdAt)[0];
        conversations = conversations.filter(c => c.id !== oldestConversation.id);
        console.log("Límite de conversaciones alcanzado, eliminada la más antigua.");
    }

    const newId = generateId();
    const newConv = {
        id: newId,
        name: `Conversación ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
        messages: [{ ...INITIAL_GREETING_AI, timestamp: Date.now() }], // Timestamp fresco aquí
        createdAt: Date.now(),
        systemPrompt: SYSTEM_PROMPT
    };
    conversations.unshift(newConv);

    if (makeActive) {
        currentConversationId = newId;
    }
    saveConversations();
    return newConv;
}

export function switchConversation(id) {
    if (id === currentConversationId) return false; // No hubo cambio
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
        currentConversationId = id;
        saveConversations(); // Guardar el nuevo ID activo
        return true; // Hubo cambio
    }
    return false; // No se encontró la conversación
}

export function loadConversations() {
    try {
        const storedConversations = localStorage.getItem('iaResumidorConversations');
        if (storedConversations) {
            conversations = JSON.parse(storedConversations);
            conversations.forEach(conv => {
                if (!conv.createdAt) conv.createdAt = Date.now(); // Migración simple
                if (!conv.systemPrompt) conv.systemPrompt = SYSTEM_PROMPT;
                if (!conv.messages) conv.messages = [{ ...INITIAL_GREETING_AI, timestamp: conv.createdAt }];
                conv.messages.forEach(msg => { if (!msg.timestamp) msg.timestamp = conv.createdAt; }); // Asegurar timestamps
            });
            conversations.sort((a, b) => b.createdAt - a.createdAt);

            const lastActiveId = localStorage.getItem('iaResumidorLastActiveId');
            currentConversationId = conversations.find(c => c.id === lastActiveId)?.id || conversations[0]?.id;
        }
    } catch (error) {
        console.error("Error cargando conversaciones:", error);
        conversations = []; // Empezar de cero si hay error
    }

    if (conversations.length === 0) {
        // No creamos una nueva aquí, app.js lo decidirá
        return false; // Indica que no se cargaron o se reiniciaron
    } else if (!currentConversationId && conversations.length > 0) {
        currentConversationId = conversations[0].id; // Activar la más reciente si no hay activa
    }
    return true; // Indica que se cargaron/establecieron conversaciones
}

export function saveConversations() {
    try {
        localStorage.setItem('iaResumidorConversations', JSON.stringify(conversations));
        if (currentConversationId) {
            localStorage.setItem('iaResumidorLastActiveId', currentConversationId);
        }
    } catch (error) {
        console.error("Error guardando conversaciones:", error);
    }
}

export function getActiveConversation() {
    if (!currentConversationId) return null;
    return conversations.find(c => c.id === currentConversationId);
}

export function appendMessageToHistory(sender, text, isHtml = false) {
    const activeConv = getActiveConversation();
    if (!activeConv) {
        console.error("No hay conversación activa para añadir mensaje.");
        // En una app real, se debería crear una si no existe y el usuario intenta enviar.
        // O la UI debería prevenirlo.
        return null; // O lanzar un error
    }
    const newMessage = { sender, text, isHtml, timestamp: Date.now() };
    activeConv.messages.push(newMessage);

    if (activeConv.messages.length > MAX_MESSAGES_PER_CONV) {
        activeConv.messages.splice(0, activeConv.messages.length - MAX_MESSAGES_PER_CONV);
    }
    saveConversations();
    return newMessage; // Devolver el mensaje añadido para que app.js lo use
}