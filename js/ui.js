// js/ui.js
import { INITIAL_GREETING_AI } from './config.js';

let uiElements = {}; // Para almacenar referencias al DOM

export function initUIElements(elements) {
    uiElements = elements;
    // Inicializar el contenido del botón de envío para restaurarlo después
    if (uiElements.sendButton) {
        uiElements.sendButtonOriginalContent = uiElements.sendButton.innerHTML;
    }
}

export function renderMessages(messages, currentConversationId) {
    if (!uiElements.chatMessages) return;
    uiElements.chatMessages.innerHTML = '';

    if (messages && messages.length > 0) {
        messages.forEach(msg => {
            // Llamar a appendMessageDOM sin el argumento 'animate' para la carga inicial
            appendMessageDOM(msg.sender, msg.text, msg.isHtml, false, msg.timestamp);
        });
    } else if (!currentConversationId && (!messages || messages.length === 0)) {
        const initialMsgDiv = document.createElement('div');
        const greeting = { ...INITIAL_GREETING_AI, timestamp: Date.now() };

        // Necesitamos que el botón de 'nueva conversación' dentro del saludo sea funcional.
        // startNewConversationFromGreeting será definida globalmente en app.js
        let greetingText = greeting.text;
        if (typeof window.startNewConversationFromGreeting === 'function') {
             // No es necesario modificar el texto si ya usa onclick="startNewConversationFromGreeting()"
        } else {
            console.warn("startNewConversationFromGreeting no está disponible globalmente. El botón en el saludo inicial podría no funcionar.");
        }
        initialMsgDiv.innerHTML = greetingText;
        uiElements.chatMessages.appendChild(initialMsgDiv);
    }
    scrollToBottom();
}

export function appendMessageDOM(sender, messageText, isHtml = false, animate = true, timestamp) {
    if (!uiElements.chatMessages) return;

    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('flex', 'items-start', 'space-x-3', 'max-w-full', 'mb-1');
    if (animate) {
        messageWrapper.classList.add('new-message-animation');
    }

    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('rounded-full', 'w-10', 'h-10', 'flex-shrink-0', 'flex', 'items-center', 'justify-center', 'shadow-md');

    const icon = document.createElement('i');
    icon.classList.add('fas');

    const messageContentOuter = document.createElement('div');
    messageContentOuter.classList.add('flex', 'flex-col');

    const bubbleDiv = document.createElement('div');
    // Clases base para todas las burbujas
    bubbleDiv.classList.add('p-3', 'rounded-lg', 'shadow-md', 'text-sm', 'leading-relaxed');

    const metaInfoSpan = document.createElement('span');
    metaInfoSpan.classList.add('text-xs', 'text-slate-500', 'mt-1');

    const time = new Date(timestamp || Date.now()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    if (sender === 'user') {
        messageWrapper.classList.add('justify-end');
        messageContentOuter.classList.add('items-end');
        bubbleDiv.classList.add('chat-bubble-user', 'text-white', 'rounded-br-none');
        bubbleDiv.classList.add('max-w-md', 'lg:max-w-lg', 'xl:max-w-xl'); // Tamaños
        metaInfoSpan.textContent = `Tú - ${time}`;
        metaInfoSpan.classList.add('text-right');

        messageContentOuter.appendChild(bubbleDiv);
        messageContentOuter.appendChild(metaInfoSpan);
        messageWrapper.appendChild(messageContentOuter);
    } else { // AI o Error
        messageWrapper.classList.add('justify-start');

        if (sender === 'error') {
            avatarDiv.classList.add('bg-red-500');
            icon.classList.add('fa-exclamation-triangle', 'text-white');
            bubbleDiv.classList.add('bg-red-100', 'text-red-700', 'border', 'border-red-300');
        } else { // 'ai'
            avatarDiv.classList.add('bg-slate-600');
            icon.classList.add('fa-robot', 'text-white');
            bubbleDiv.classList.add('chat-bubble-ai', 'text-white');
        }
        avatarDiv.appendChild(icon);

        // Clases comunes para la burbuja de AI/Error
        bubbleDiv.classList.add('rounded-tl-none');
        bubbleDiv.classList.add('max-w-md', 'lg:max-w-lg', 'xl:max-w-xl'); // Tamaños

        metaInfoSpan.textContent = `${sender === 'error' ? 'Error' : 'IA'} - ${time}`;

        messageContentOuter.appendChild(bubbleDiv);
        messageContentOuter.appendChild(metaInfoSpan);
        messageWrapper.appendChild(avatarDiv);
        messageWrapper.appendChild(messageContentOuter);
    }

    if (isHtml) {
        bubbleDiv.innerHTML = messageText;
    } else {
        const tempDiv = document.createElement('div');
        tempDiv.textContent = messageText;
        bubbleDiv.innerHTML = tempDiv.innerHTML.replace(/\n/g, '<br>');
    }

    uiElements.chatMessages.appendChild(messageWrapper);
    if (animate) {
        scrollToBottom();
    }
}

export function renderConversationList(conversations, currentConversationId, switchConversationCallback) {
    if (!uiElements.conversationList) return;
    uiElements.conversationList.innerHTML = '';
    if (conversations.length === 0) {
        uiElements.conversationList.innerHTML = '<p class="text-xs text-slate-400 p-2">No hay conversaciones guardadas.</p>';
        return;
    }
    conversations.forEach(conv => {
        const item = document.createElement('button');
        // Usar className para asignar múltiples clases iniciales, luego classList si es necesario
        item.className = 'w-full text-left p-2 rounded-md hover:bg-slate-600 transition-colors text-sm truncate conversation-item';
        if (conv.id === currentConversationId) {
            item.classList.add('active', 'font-semibold'); // .add() está bien para clases individuales
        }
        item.textContent = conv.name || `Conversación ${conv.id.substring(0, 5)}`;
        item.setAttribute('data-id', conv.id);
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', `Cambiar a ${item.textContent}`);
        item.addEventListener('click', () => switchConversationCallback(conv.id));
        uiElements.conversationList.appendChild(item);
    });
}

export function scrollToBottom() {
    if (uiElements.chatMessages) {
        uiElements.chatMessages.scrollTop = uiElements.chatMessages.scrollHeight;
    }
}

export function showTypingIndicator(show) {
    if (uiElements.typingIndicatorContainer) {
        uiElements.typingIndicatorContainer.style.display = show ? 'block' : 'none';
        if (show) scrollToBottom();
    }
}

export function updateSendButton(isSending) {
    if (!uiElements.sendButton || typeof uiElements.sendButtonOriginalContent === 'undefined') return;
    uiElements.sendButton.disabled = isSending;
    uiElements.sendButton.innerHTML = isSending ? '<i class="fas fa-spinner fa-spin"></i>' : uiElements.sendButtonOriginalContent;
}

export function adjustTextareaHeight(textareaElement) {
    if (!textareaElement) return;

    const maxHeightPx = 200;
    textareaElement.style.height = 'auto'; // Restablecer para recalcular

    const computedStyle = getComputedStyle(textareaElement);
    const paddingTop = parseInt(computedStyle.paddingTop, 10);
    const paddingBottom = parseInt(computedStyle.paddingBottom, 10);
    const borderTop = parseInt(computedStyle.borderTopWidth, 10);
    const borderBottom = parseInt(computedStyle.borderBottomWidth, 10);
    
    // La altura base debe ser al menos para el número de filas especificado en el HTML
    const baseRows = parseInt(textareaElement.getAttribute('rows')) || 2;
    const lineHeight = parseInt(computedStyle.lineHeight, 10);
    // Altura mínima calculada basada en 'rows' y 'line-height' más padding y border vertical
    const minHeight = (baseRows * lineHeight) + paddingTop + paddingBottom + borderTop + borderBottom;

    // scrollHeight incluye el contenido, padding, pero no el borde ni el margin.
    // Para que coincida con la altura visual, a veces se necesita añadir el padding vertical si el box-sizing es content-box
    // Sin embargo, style.height normalmente se refiere al content-box.
    // scrollHeight es una buena medida de la altura del contenido + padding.
    let newHeight = textareaElement.scrollHeight;

    // Asegurar que no sea menor que la altura mínima basada en 'rows'
    newHeight = Math.max(newHeight, minHeight);
    
    // Aplicar la altura, limitada por maxHeightPx
    if (newHeight > maxHeightPx) {
        textareaElement.style.height = `${maxHeightPx}px`;
        textareaElement.style.overflowY = 'auto'; // Mostrar scroll si excede el máximo
    } else {
        textareaElement.style.height = `${newHeight}px`;
        textareaElement.style.overflowY = 'hidden'; // Ocultar scroll si no es necesario
    }
}


export function clearMessageInput() {
    if (uiElements.messageInput) {
        uiElements.messageInput.value = '';
        adjustTextareaHeight(uiElements.messageInput); // Reajustar altura al vaciar
    }
}