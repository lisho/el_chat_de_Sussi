// server.js (simplificado)
const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const cors = require('cors'); // Ya lo tienes importado
require('dotenv').config(); // Para cargar API_KEY desde .env

const app = express();

// --- CONFIGURACIÓN DE CORS ---
// Esta es la línea clave que necesitas ajustar.
// En desarrollo, puedes ser un poco más permisivo.
// Para producción, deberías ser más específico.

// Opción 1: Permitir un origen específico (RECOMENDADO PARA PRODUCCIÓN Y BUENO PARA DESARROLLO)
const corsOptions = {
    origin: ['https://sussi.onrender.com/'], // ¡ASEGÚRATE QUE ESTE ES EL PUERTO DONDE SIRVES TU FRONTEND!
    optionsSuccessStatus: 200 // Algunos navegadores antiguos (IE11, varios SmartTVs) se ahogan con 204
  };
  app.use(cors(corsOptions));
  
  // Opción 2: Permitir cualquier origen (SOLO PARA DESARROLLO RÁPIDO, NO PARA PRODUCCIÓN)
  // app.use(cors()); // Esto establece Access-Control-Allow-Origin: '*'
  
  // Opción 3: Configuración más detallada si necesitas permitir métodos o cabeceras específicas
  // app.use(cors({
  //   origin: 'http://127.0.0.1:5500',
  //   methods: ['GET', 'POST', 'OPTIONS'], // Asegúrate que OPTIONS está aquí para preflight
  //   allowedHeaders: ['Content-Type', 'Authorization'], // Si usas otras cabeceras
  //   credentials: true // Si necesitas enviar cookies
  // }));

app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/summarize', async (req, res) => {
    try {
        const { userInput, systemPrompt, messages } = req.body; // `messages` sería un array de {role, parts}

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" }); // O el modelo que prefieras

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