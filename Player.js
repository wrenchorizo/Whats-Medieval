const mongoose = require('mongoose');

const CharacterSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // Número de WhatsApp del usuario
    nombre: { type: String, required: true },               // Apodo/Tag de WhatsApp
    raza: { type: String, required: true },                 // Elfo, Orco, Humano, Enano, Demonio, Ángel
    nivel: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    oro: { type: Number, default: 100 },                    // Moneda inicial de comercio
    
    // SISTEMA DE ALINEAMIENTO
    // 0 = Neutro. Valores positivos = Héroe. Valores negativos = Villano.
    karma: { type: Number, default: 0 },                    

    // ESTADÍSTICAS DEL PERSONAJE
    stats: {
        // Puntos de Vida
        hp: { type: Number, default: 100 },
        hpMax: { type: Number, default: 100 },
        
        // Poder de Combate y Mitigación
        atk: { type: Number, default: 10 },
        def: { type: Number, default: 5 },
        
        // Recursos de Energía (Actuales y Máximos)
        stamina: { type: Number, default: 100 },    // Para ataques físicos y herramientas
        staminaMax: { type: Number, default: 100 },
        
        mana: { type: Number, default: 100 },       // Para hechizos y habilidades mágicas
        manaMax: { type: Number, default: 100 }
    },
    
    // EQUIPO ACTUALMENTE COLOCADO
    equipo: {
        arma: { type: String, default: 'Manos Desnudas' },
        armadura: { type: String, default: 'Ropa Vieja' }
    },
    
    // MOCHILA DE OBJETOS
    // Aquí se guardarán los strings de las espadas, hachas o herramientas que consigan
    inventario: { type: [String], default: [] } 
});

module.exports = mongoose.model('Character', CharacterSchema);
