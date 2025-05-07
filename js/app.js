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
let deferredInstallPrompt = null; // Para el manejo de la instalación de PWA
const sendButtonOriginalContent = domElements.sendButton.innerHTML; // Guardar contenido original

// Pasar referencias a ui.js
UI.initUIElements(domElements);

if ('windowControlsOverlay' in navigator) {
    navigator.windowControlsOverlay.addEventListener('geometrychange', () => {
        // La geometría de los controles de ventana ha cambiado (ej. visible/no visible)
        // Puedes ajustar tu layout aquí si es necesario.
        console.log('Window Controls Overlay visible:', navigator.windowControlsOverlay.visible);
        console.log('Title bar rect:', navigator.windowControlsOverlay.getTitlebarAreaRect());
        // Aplicar una clase al body para estilos condicionales
        document.body.classList.toggle('window-controls-overlay-active', navigator.windowControlsOverlay.visible);
    });
}


// --- FUNCIONES DE ORQUESTACIÓN ---

function refreshFullUI() {
    const { conversations, currentConversationId } = Conversation.getConversationsState();
    UI.renderConversationList(conversations, currentConversationId, handleSwitchConversation, handleDeleteConversation);
    const activeConv = Conversation.getActiveConversation();
    if (activeConv) {
        UI.renderMessages(activeConv.messages, currentConversationId);
    } else {
        // Si no hay conversación activa (ej. después de borrar la última)
        // Podrías mostrar un mensaje por defecto o el saludo inicial si no hay NINGUNA conversación.
        if (conversations.length === 0) {
             UI.renderMessages([], null); // Para que muestre el saludo inicial de ui.js
        } else {
            domElements.chatMessages.innerHTML = '<p class="p-4 text-center text-slate-500">Selecciona una conversación o crea una nueva.</p>';
        }
    }
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

function handleDeleteConversation(id, name) {
    // Pedir confirmación al usuario
    if (confirm(`¿Estás seguro de que quieres eliminar la conversación "${name}"? Esta acción no se puede deshacer.`)) {
        const deleted = Conversation.deleteConversation(id);
        if (deleted) {
            console.log(`Conversación "${name}" (ID: ${id}) eliminada.`);
            // Si la conversación activa fue borrada, loadConversations() ya debería haber seleccionado una nueva (o null).
            // O, si currentConversationId es null después de borrar, crear una nueva si no quedan.
            const { conversations: remainingConversations, currentConversationId: newCurrentId } = Conversation.getConversationsState();
            if (remainingConversations.length === 0) {
                handleNewConversation(); // Crea una nueva si se borraron todas
            } else if (!newCurrentId && remainingConversations.length > 0) {
                // Esto no debería pasar si deleteConversation maneja bien currentConversationId
                // Pero por si acaso, activa la primera.
                Conversation.switchConversation(remainingConversations[0].id);
            }
            refreshFullUI(); // Refrescar toda la UI
        } else {
            alert(`No se pudo eliminar la conversación "${name}".`);
        }
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
            const aiFullMessageObject = await API.getAiResponse(userMessageText, activeConv);

            // Si aiFullMessageObject.sender es 'error', ya está formateado para ser mostrado como error.
            Conversation.appendMessageToHistory(aiFullMessageObject.sender, aiFullMessageObject.text, aiFullMessageObject.isHtml);
            UI.appendMessageDOM(aiFullMessageObject.sender, aiFullMessageObject.text, aiFullMessageObject.isHtml, true, aiFullMessageObject.timestamp);

        } catch (error) { // Este catch es más para errores inesperados en el flujo de app.js en sí
            console.error('Error inesperado en handleFormSubmit:', error);
            const errorTimestamp = Date.now();
            UI.appendMessageDOM('error', `<p>Hubo un problema inesperado en la aplicación. Intenta de nuevo.</p>`, true, true, errorTimestamp);
        } finally {
            UI.showTypingIndicator(false);
            UI.updateSendButton(false); // El contenido original ya está en uiElements
            domElements.messageInput.focus();
        }
        
    } else if (!activeConv) {
        alert("Por favor, inicia una nueva conversación antes de enviar un mensaje.");
    }
}

// --- INICIALIZACIÓN DE LA APLICACIÓN ---
function initializeApp() {
    const conversationsLoaded = Conversation.loadConversations();
    const { conversations, currentConversationId } = Conversation.getConversationsState();

    if (!conversationsLoaded || conversations.length === 0) {
        Conversation.createNewConversation(); // Crea una si no hay ninguna o no se cargaron
    } else if (!currentConversationId && conversations.length > 0) {
        // Si se cargaron conversaciones pero ninguna está activa (raro, pero por seguridad)
        Conversation.switchConversation(conversations[0].id);
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

    domElements.installAppBtn = document.getElementById('install-app-btn');

    // --- LÓGICA DE INSTALACIÓN DE PWA ---
    window.addEventListener('beforeinstallprompt', (event) => {
        // Prevenir que el mini-infobar aparezca en móviles (Chrome)
        event.preventDefault();
        // Guardar el evento para que pueda ser disparado después
        deferredInstallPrompt = event;
        // Mostrar nuestro botón de instalación personalizado
        if (domElements.installAppBtn) {
            domElements.installAppBtn.classList.remove('hidden');
            console.log("PWA instalable, mostrando botón de instalación.");
        }

        // Opcional: Escuchar el resultado de la instalación
        deferredInstallPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('Usuario aceptó la instalación de la PWA');
            } else {
                console.log('Usuario rechazó la instalación de la PWA');
            }
            // Ya sea aceptado o rechazado, no podemos usar deferredInstallPrompt de nuevo
            deferredInstallPrompt = null;
            // Ocultar el botón de instalación después de que el usuario interactuó
            if (domElements.installAppBtn) {
                domElements.installAppBtn.classList.add('hidden');
            }
        });
    });

    if (domElements.installAppBtn) {
        domElements.installAppBtn.addEventListener('click', async () => {
            if (deferredInstallPrompt) {
                // Mostrar el aviso de instalación del navegador
                deferredInstallPrompt.prompt();
                // deferredInstallPrompt.userChoice ya está siendo escuchado arriba
                // No necesitamos hacer nada más aquí, solo ocultar el botón después de la interacción (manejado por userChoice)
            } else {
                // Esto no debería pasar si el botón solo se muestra cuando deferredInstallPrompt está disponible
                console.log("El evento de instalación no está disponible.");
                // Podrías ocultar el botón si llega a este estado por alguna razón
                domElements.installAppBtn.classList.add('hidden');
            }
        });
    }

    // Ocultar el botón de instalación si la app ya está en modo standalone
    // Esto se puede hacer al inicio o con la media query
    function checkDisplayMode() {
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            console.log('La PWA ya está instalada y en modo standalone.');
            if (domElements.installAppBtn) {
                domElements.installAppBtn.classList.add('hidden');
            }
        } else {
            console.log('La PWA no está en modo standalone (ejecutándose en el navegador).');
        }
    }

    checkDisplayMode(); // Llamar para ocultar el botón si ya está instalada

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