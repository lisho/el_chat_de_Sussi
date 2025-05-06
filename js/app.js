// js/app.js
import * as Config from './config.js';
import * as Utils from './utils.js';
import * as UI from './ui.js';
import * as Conversation from './conversation.js';
import * as API from './api.js';

// REFERENCIAS AL DOM (obtenidas una vez)
const domElements = {
    chatForm: document.getElementById('chat-form'),
    messageInput: document.getElementById('message-input'),
    chatMessages: document.getElementById('chat-messages'),
    sendButton: document.getElementById('send-button'),
    conversationList: document.getElementById('conversation-list'),
    newConversationBtn: document.getElementById('new-conversation-btn'),
    typingIndicatorContainer: document.getElementById('typing-indicator-container'),
    notificationsPlaceholderBtn: document.getElementById('notifications-placeholder-btn')
};
const sendButtonOriginalContent = domElements.sendButton.innerHTML; // Guardar contenido original

// Pasar referencias a ui.js
UI.initUIElements(domElements);


// --- FUNCIONES DE ORQUESTACIÓN ---

function refreshFullUI() {
    const { conversations, currentConversationId } = Conversation.getConversationsState();
    UI.renderConversationList(conversations, currentConversationId, handleSwitchConversation);
    const activeConv = Conversation.getActiveConversation();
    UI.renderMessages(activeConv ? activeConv.messages : [], activeConv ? currentConversationId : null);
}

function handleNewConversation() {
    Conversation.createNewConversation();
    refreshFullUI();
    domElements.messageInput.focus();
}

// Hacerla global para que el botón en el saludo inicial funcione
window.startNewConversationFromGreeting = () => {
    handleNewConversation();
};


function handleSwitchConversation(id) {
    const switched = Conversation.switchConversation(id);
    if (switched) {
        refreshFullUI();
        domElements.messageInput.focus();
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const userMessageText = domElements.messageInput.value.trim();
    const activeConv = Conversation.getActiveConversation();

    if (userMessageText && activeConv) {
        const userMsgObject = Conversation.appendMessageToHistory('user', userMessageText, false);
        UI.appendMessageDOM(userMsgObject.sender, userMsgObject.text, userMsgObject.isHtml, true, userMsgObject.timestamp);
        UI.clearMessageInput();

        UI.showTypingIndicator(true);
        UI.updateSendButton(true, sendButtonOriginalContent);

        try {
            // const aiMsgObject = await API.getAiResponse(userMessageText, activeConv); // Simulación actual
            // Conversation.appendMessageToHistory(aiMsgObject.sender, aiMsgObject.text, aiMsgObject.isHtml);
            // UI.appendMessageDOM(aiMsgObject.sender, aiMsgObject.text, aiMsgObject.isHtml, true, aiMsgObject.timestamp);
            // Refactorizado para que API.getAiResponse devuelva el objeto completo del mensaje
            const aiFullMessageObject = await API.getAiResponse(userMessageText, activeConv);
            // No necesitamos añadirlo al historial otra vez si la API ya devuelve el objeto completo con sender, etc.
            // Pero sí necesitamos guardarlo en la conversación actual:
            Conversation.appendMessageToHistory(aiFullMessageObject.sender, aiFullMessageObject.text, aiFullMessageObject.isHtml);
            // Y luego mostrarlo
            UI.appendMessageDOM(aiFullMessageObject.sender, aiFullMessageObject.text, aiFullMessageObject.isHtml, true, aiFullMessageObject.timestamp);

        } catch (error) {
            console.error('Error al obtener respuesta de IA:', error);
            const errorTimestamp = Date.now();
            // No lo guardamos en el historial, solo lo mostramos
            UI.appendMessageDOM('error', `<p>Hubo un problema al contactar a la IA: ${error.message}. Intenta de nuevo.</p>`, true, true, errorTimestamp);
        } finally {
            UI.showTypingIndicator(false);
            UI.updateSendButton(false, sendButtonOriginalContent);
            domElements.messageInput.focus();
        }
    } else if (!activeConv) {
        alert("Por favor, inicia una nueva conversación antes de enviar un mensaje.");
    }
}

// --- INICIALIZACIÓN DE LA APLICACIÓN ---
function initializeApp() {
    const conversationsLoaded = Conversation.loadConversations();
    if (!conversationsLoaded || Conversation.getConversationsState().conversations.length === 0) {
        Conversation.createNewConversation(); // Crea una si no hay ninguna
    }
    refreshFullUI();

    // Ajustar altura inicial del textarea
    UI.adjustTextareaHeight(domElements.messageInput);

    // Event Listeners
    domElements.chatForm.addEventListener('submit', handleFormSubmit);

    domElements.messageInput.addEventListener('input', () => {
        UI.adjustTextareaHeight(domElements.messageInput);
    });

    domElements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            domElements.chatForm.requestSubmit ? domElements.chatForm.requestSubmit() : domElements.chatForm.dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}));
        }
    });

    domElements.newConversationBtn.addEventListener('click', handleNewConversation);

    domElements.notificationsPlaceholderBtn.addEventListener('click', () => {
        alert("La funcionalidad de notificaciones push se implementaría aquí, solicitando permiso al usuario y configurando el Service Worker para recibir mensajes del servidor.");
    });

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js') // Ruta relativa al root
                .then(registration => console.log('ServiceWorker V2 registrado con éxito:', registration.scope))
                .catch(error => console.log('Fallo en el registro de ServiceWorker V2:', error));
        });
    }
    domElements.messageInput.focus();
}

// Ejecutar cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', initializeApp);