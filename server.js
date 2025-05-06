// server.js (simplificado)
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config(); // Para cargar API_KEY desde .env

const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/summarize', async (req, res) => {
    try {
        const { userInput, systemPrompt, messages } = req.body; // `messages` sería un array de {role, parts}

        const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // O el modelo que prefieras

        // Construir el historial para Gemini
        // El formato es [{ role: "user", parts: [{text: "..."}]}, {role: "model", parts: [{text: "..."}]}]
        // El systemPrompt puede ir como primer mensaje del "user" o a través de `generationConfig` si el modelo lo soporta explícitamente.
        // Para Gemini, el "system prompt" se suele poner como la primera instrucción de "user".
        // O puedes usar la API de Chat si necesitas un flujo conversacional más estructurado.

        let chatHistory = [];
        if (systemPrompt) {
             // Gemini no tiene un rol "system" explícito en la API `generateContent`
             // Así que lo incluimos como parte del primer mensaje del usuario o como contexto general.
             // Para un chat, se usa `startChat`
        }

        // Si envías el historial de mensajes:
        // chatHistory = messages.map(msg => ({
        //    role: msg.sender === 'user' ? 'user' : 'model',
        //    parts: [{ text: msg.text }] // Cuidado si msg.text es HTML, Gemini espera texto plano.
        // }));
        // chatHistory.push({ role: "user", parts: [{ text: userInput }] });

        // Ejemplo simple con `generateContent` y un prompt compuesto
        const prompt = `${systemPrompt}\n\nUsuario: ${userInput}\n\nIA:`;

        const result = await model.generateContent(prompt); // Para un solo turno
        // O para chat:
        // const chat = model.startChat({ history: chatHistory, generationConfig: { ... } });
        // const result = await chat.sendMessage(userInput);

        const response = await result.response;
        const text = response.text();

        res.json({ aiResponse: text }); // Gemini generalmente devuelve Markdown

    } catch (error) {
        console.error("Error en /api/summarize:", error);
        res.status(500).json({ message: error.message || "Error procesando la solicitud de IA" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));