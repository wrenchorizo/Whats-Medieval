const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');
const Player = require('./Player'); // Importamos tu modelo de jugador

// ==========================================
// 1. CONEXIÓN A MONGO DB ATLAS
// ==========================================
// Coloca aquí tu URI de conexión de MongoDB Atlas
const MONGO_URI = 'mongodb+srv://PeterDonas:PeterDonas@cluster0.r5enf7h.mongodb.net/?appName=Cluster0'; 

mongoose.connect(MONGO_URI)
  .then(() => console.log('📦 Conectado con éxito a MongoDB Atlas'))
  .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// ==========================================
// 2. INICIALIZACIÓN DE BAILEYS (WHATSAPP SOCKET)
// ==========================================
async function connectToWhatsApp() {
    // Guarda las credenciales en una carpeta para mantener la sesión abierta 24/7 en Render
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }), // Silencia logs innecesarios
        auth: state,
        printQRInTerminal: false 
    });

    // Control de conexiones y desconexiones
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log('📸 Escanea el código QR con tu WhatsApp para iniciar el RPG.');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ Conexión cerrada. ¿Reconectando?:', shouldReconnect);
            if (shouldReconnect) connectToWhatsApp(); // Reconexión automática si es un error del servidor
        } else if (connection === 'open') {
            console.log('⚔️ ¡El RPG Medieval está online! Escuchando comandos...');
        }
    });

    // Guardar credenciales de sesión automáticamente
    sock.ev.on('creds.update', saveCreds);

    // ==========================================
    // 3. CAPTURA Y PROCESAMIENTO DE COMANDOS
    // ==========================================
    const PREFIX = ';';

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return; 

        // Extraer el texto plano del mensaje
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        
        // Si no empieza con tu prefijo definitivo ";", el bot lo ignora
        if (!text.startsWith(PREFIX)) return;

        // Limpiar el comando y separar los argumentos por espacios
        const args = text.slice(PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const from = msg.key.remoteJid; 

        // ==========================================
        // 4. REPOSITORIO DE COMANDOS
        // ==========================================

        // --- COMANDO: ;crear ---
        if (command === 'crear') {
            const razaElegida = args[0] ? args[0].toLowerCase() : null;
            const razasValidas = ['humano', 'elfo', 'enano', 'orco', 'demonio', 'ángel', 'angel'];

            // Validación de formato
            if (!razaElegida || !razasValidas.includes(razaElegida)) {
                return await sock.sendMessage(from, { 
                    text: '⚠️ *¡Formato incorrecto!*\n\nUso: `;crear [raza]`\n\n*Razas disponibles:*\n👤 Humano\n🧝 Elfo\n🧔 Enano\n👹 Orco\n😈 Demonio\n👼 Ángel' 
                }, { quoted: msg });
            }

            // Verificar si ya existe en la base de datos de Atlas
            const usuarioExiste = await Player.findOne({ userId: from });
            if (usuarioExiste) {
                return await sock.sendMessage(from, { 
                    text: `❌ ¡Ya tienes un personaje creado! Eres un *${usuarioExiste.raza}* de Nivel ${usuarioExiste.nivel}.` 
                }, { quoted: msg });
            }

            // Stats Base por defecto
            let hpMax = 100;
            let atk = 10;
            let def = 5;
            let staminaMax = 100;
            let manaMax = 100;
            let razaFormateada = razaElegida.charAt(0).toUpperCase() + razaElegida.slice(1);

            // Modificadores de estadísticas según la Raza elegida
            if (razaElegida === 'orco') { 
                atk += 4; 
                hpMax += 20; 
                staminaMax += 20; 
                manaMax -= 30;    
            }
            if (razaElegida === 'enano') { 
                def += 5; 
                hpMax += 10; 
                staminaMax += 15; 
            }
            if (razaElegida === 'elfo') { 
                atk += 2; 
                manaMax += 30;    
            } 
            if (razaElegida === 'demonio') { 
                atk += 5; 
                manaMax += 10; 
            }
            if (razaElegida === 'ángel' || razaElegida === 'angel') { 
                def += 3; 
                hpMax += 15; 
                manaMax += 20; 
                razaFormateada = 'Ángel'; 
            }

            // Instanciar el nuevo documento de MongoDB usando Player.js
            const nuevoJugador = new Player({
                userId: from,
                nombre: msg.pushName || 'Aventurero Desconocido',
                raza: razaFormateada,
                stats: { 
                    hp: hpMax, 
                    hpMax: hpMax, 
                    atk: atk, 
                    def: def,
                    stamina: staminaMax,
                    staminaMax: staminaMax,
                    mana: manaMax,
                    manaMax: manaMax
                }
            });

            // Guardar en la nube
            await nuevoJugador.save();

            // Mensaje de éxito
            await sock.sendMessage(from, { 
                text: `✨ *¡EL DESTINO HA SIDO ESCRITO!* ✨\n\nBienvenido, *${nuevoJugador.nombre}*. Has iniciado tu viaje en el reino como un **${razaFormateada}**.\n\n🎒 Recibes: 💰 100 monedas de oro.\n📜 Usa \`;perfil\` para ver tus estadísticas y recursos iniciales.` 
            }, { quoted: msg });
        }
        
    });
}

// Inicializar el hilo del bot
connectToWhatsApp();
