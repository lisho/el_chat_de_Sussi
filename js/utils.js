// js/utils.js
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Aquí podrían ir otras utilidades, como formateadores de fecha, etc.