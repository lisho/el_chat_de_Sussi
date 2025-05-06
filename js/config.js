// js/config.js
export const MAX_CONVERSATIONS = 10;
export const SYSTEM_PROMPT = `Eres un asistente de IA especializado en resumir y formatear textos. Debes ser conciso, claro y presentar la información de manera estructurada cuando se te pida. Utiliza Markdown para formatear tus respuestas (listas, negritas, cursivas, etc.) que luego será convertido a HTML.`;
export const INITIAL_GREETING_AI = {
    sender: 'ai',
    text: `<p class="text-sm">¡Hola! Soy tu asistente de IA mejorado. Pega el texto que quieres resumir y formatear. Puedo ayudarte a extraer puntos clave, generar resúmenes ejecutivos y mucho más.</p><p class="text-sm mt-1">Puedes iniciar una <button class="text-emerald-300 hover:text-emerald-100 underline" onclick="startNewConversationFromGreeting()">nueva conversación</button> en cualquier momento.</p>`,
    isHtml: true,
    timestamp: Date.now() // Considera generar esto cuando se usa, no al definir la constante.
};
export const MAX_MESSAGES_PER_CONV = 200;