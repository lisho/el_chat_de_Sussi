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
    // 'group' para group-hover en el botón. 'relative' para el posicionamiento absoluto del botón.
    messageWrapper.classList.add('flex', 'items-start', 'space-x-3', 'max-w-full', 'mb-1', 'group', 'relative');
    if (animate) {
        messageWrapper.classList.add('new-message-animation');
    }

    const avatarContainer = document.createElement('div');
    avatarContainer.classList.add('rounded-full', 'w-10', 'h-10', 'flex-shrink-0', 'flex', 'items-center', 'justify-center', 'shadow-md');

    const messageContentOuter = document.createElement('div'); // Contenedor para burbuja y nombre/hora
    messageContentOuter.classList.add('flex', 'flex-col');
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add('p-3', 'rounded-lg', 'shadow-md', 'text-sm', 'leading-relaxed');
    
    const metaInfoSpan = document.createElement('span');
    metaInfoSpan.classList.add('text-xs', 'text-slate-500', 'mt-1');
    
    const time = new Date(timestamp || Date.now()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const date = new Date(timestamp || Date.now()).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    if (sender === 'user') {
        messageWrapper.classList.add('justify-end');
        messageContentOuter.classList.add('items-end'); // Alinear contenido a la derecha
        bubbleDiv.classList.add('chat-bubble-user', 'text-white', 'rounded-br-none');
        bubbleDiv.classList.add('max-w-md', 'lg:max-w-lg', 'xl:max-w-xl');
        metaInfoSpan.textContent = `Tú - ${date} - ${time}`;
        metaInfoSpan.classList.add('text-right');

        messageContentOuter.appendChild(bubbleDiv);
        messageContentOuter.appendChild(metaInfoSpan);
        messageWrapper.appendChild(messageContentOuter);
    } else { // AI o Error
        messageWrapper.classList.add('justify-start'); // Mensaje a la izquierda
        messageContentOuter.classList.add('items-start'); // Alinear contenido a la izquierda

        if (sender === 'ai') {
            avatarContainer.classList.add('bg-slate-700');
            const imgAvatar = document.createElement('img');
            imgAvatar.src = 'images/sussi-avatar.jpeg';
            imgAvatar.alt = 'Avatar IA';
            imgAvatar.classList.add('w-full', 'h-full', 'object-cover', 'rounded-full');
            avatarContainer.appendChild(imgAvatar);
            bubbleDiv.classList.add('chat-bubble-ai', 'text-white');
        } else if (sender === 'error') {
            avatarContainer.classList.add('bg-red-500');
            const icon = document.createElement('i');
            icon.classList.add('fas', 'fa-exclamation-triangle', 'text-white');
            avatarContainer.appendChild(icon);
            bubbleDiv.classList.add('bg-red-100', 'text-red-700', 'border', 'border-red-300');
        }
        
        bubbleDiv.classList.add('rounded-tl-none');
        bubbleDiv.classList.add('max-w-md', 'lg:max-w-lg', 'xl:max-w-xl'); // Tamaños

        metaInfoSpan.textContent = `${sender === 'error' ? 'Error' : 'IA'} - ${date} - ${time}`;
        
        messageContentOuter.appendChild(bubbleDiv);
        messageContentOuter.appendChild(metaInfoSpan);

        // El orden de appendChild es importante para flexbox y posicionamiento
        messageWrapper.appendChild(avatarContainer);   // Avatar primero a la izquierda
        messageWrapper.appendChild(messageContentOuter); // Luego el contenido del mensaje

        // --- BOTÓN DE COPIAR (SOLO PARA IA, FUERA DE LA BURBUJA) ---
        if (sender === 'ai') {
            const copyButton = document.createElement('button');
            // Clases para posicionar fuera, a la derecha de la burbuja, y un poco más grande
            // 'self-center' o 'self-start'/'self-end' para alinear verticalmente con el messageWrapper si es necesario
            // Ajusta 'top-1/2 -translate-y-1/2' para centrar verticalmente respecto a la burbuja
            // O 'bottom-0' para alinearlo con la parte inferior de la burbuja
            // El 'ml-2' lo separa de la burbuja
            copyButton.className = 'ml-2 p-2 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded-md hover:bg-slate-200 active:bg-slate-300 self-center';
            // Ícono un poco más grande (FontAwesome no usa fa-sm, fa-lg, etc. para tamaño directo, pero podemos ajustar el padding del botón o el font-size del ícono)
            copyButton.innerHTML = '<i class="fas fa-copy"></i>'; // quitamos fa-xs para tamaño por defecto del ícono
            copyButton.setAttribute('aria-label', 'Copiar texto de la IA');
            copyButton.setAttribute('title', 'Copiar texto');
            
            let textToCopy;
            if (isHtml) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = messageText;
                textToCopy = tempDiv.textContent || tempDiv.innerText || "";
            } else {
                textToCopy = messageText;
            }

            copyButton.addEventListener('click', (event) => {
                event.stopPropagation();
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                        copyButton.innerHTML = '<i class="fas fa-check text-emerald-500"></i>';
                        setTimeout(() => {
                            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                        }, 1500);
                    })
                    .catch(err => {
                        console.error('Error al copiar texto: ', err);
                        const originalIcon = copyButton.innerHTML;
                        copyButton.innerHTML = '<i class="fas fa-times text-red-500"></i>';
                        setTimeout(() => {
                            copyButton.innerHTML = originalIcon;
                        }, 2000);
                    });
            });
            // Añadir el botón de copiar directamente al messageWrapper, después del contenido del mensaje
            messageWrapper.appendChild(copyButton);
        }
    }

    // Establecer el contenido de la burbuja
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

export function renderConversationList(conversations, currentConversationId, switchConversationCallback, deleteConversationCallback) {
    if (!uiElements.conversationList) return;
    uiElements.conversationList.innerHTML = '';
    if (conversations.length === 0) {
        uiElements.conversationList.innerHTML = '<p class="text-xs text-slate-400 p-2">No hay conversaciones guardadas.</p>';
        return;
    }
    conversations.forEach(conv => {
        const listItem = document.createElement('div'); // Contenedor para el botón y el ícono de borrado
        listItem.className = 'flex items-center justify-between group'; // group para hover en el ícono

        const itemButton = document.createElement('button');
        itemButton.className = 'flex-grow text-left p-2 rounded-md hover:bg-slate-600 transition-colors text-sm truncate conversation-item';
        if (conv.id === currentConversationId) {
            itemButton.classList.add('active', 'font-semibold');
        }
        itemButton.textContent = conv.name || `Conversación ${conv.id.substring(0, 5)}`;
        itemButton.setAttribute('data-id', conv.id);
        itemButton.setAttribute('role', 'button');
        itemButton.setAttribute('aria-label', `Cambiar a ${itemButton.textContent}`);
        itemButton.addEventListener('click', () => switchConversationCallback(conv.id));

        const deleteButton = document.createElement('button');
        deleteButton.className = 'p-2 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100';
        deleteButton.innerHTML = '<i class="fas fa-trash-alt fa-xs"></i>';
        deleteButton.setAttribute('aria-label', `Eliminar ${itemButton.textContent}`);
        deleteButton.setAttribute('data-id', conv.id);
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Evitar que el clic también cambie la conversación
            deleteConversationCallback(conv.id, itemButton.textContent); // Pasamos el ID y el nombre para confirmación
        });

        listItem.appendChild(itemButton);
        listItem.appendChild(deleteButton);
        uiElements.conversationList.appendChild(listItem);
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