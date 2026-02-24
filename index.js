require('dotenv').config();
const { Client, Collection, MessageEmbed, MessageActionRow, MessageButton, Modal, TextInputComponent } = require('discord.js');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const cron = require('node-cron'); // Asegúrate de tener instalado: npm install node-cron
const config = require('./DataBaseJson/config.json');

moment.locale('es');

const client = new Client({
    intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS", "GUILD_VOICE_STATES", "GUILD_PRESENCES"],
    partials: ["MESSAGE", "CHANNEL", "REACTION", "USER", "GUILD_MEMBER"],
});

// --- 🛠️ SISTEMA DE CONTADOR DIARIO ---
const contadorPath = './DataBaseJson/contador.json';
if (!fs.existsSync(contadorPath)) {
    fs.writeFileSync(contadorPath, JSON.stringify({ count: 0 }, null, 2));
}

// Reinicio del contador a las 00:00hs
cron.schedule('0 0 * * *', () => {
    fs.writeFileSync(contadorPath, JSON.stringify({ count: 0 }, null, 2));
    console.log("✅ Contador diario reiniciado.");
}, { timezone: "America/Argentina/Buenos_Aires" }); // Ajusta tu zona horaria

client.slashCommands = new Collection();
require('./handler')(client);

// --- 🛠️ CONFIGURACIÓN DE IDs ---
const rolPermitidoId = "1475299077544480891"; 
const canalLogsId = "1475299346873323673"; 

const CATEGORIAS = {
    COMPRA: "1475299296659243018",  
    SOPORTE: "1475299280553115791", 
    PARTNER: "1475299307102929159"  
};

// --- FUNCIÓN PARA ENVIAR LOGS ---
const enviarLog = (embed) => {
    const canal = client.channels.cache.get(canalLogsId);
    if (canal) canal.send({ embeds: [embed] }).catch(() => {});
};

// --- LÓGICA DE INTERACCIONES ---
client.on('interactionCreate', async (interaction) => {
    
    if (interaction.isCommand()) {
        const cmd = client.slashCommands.get(interaction.commandName);
        if (cmd) try { await cmd.run(client, interaction); } catch (e) { console.error(e); }
        return;
    }

    if (interaction.isButton()) {
        const { customId, member, guild, user, channel } = interaction;

        if (customId === "copiar_cvu") return interaction.reply({ content: "0000003100072461415651", ephemeral: true });
        if (customId === "copiar_alias") return interaction.reply({ content: "710shop", ephemeral: true });

        if (customId === "ticket_compra") {
            const modal = new Modal().setCustomId('modal_compra').setTitle('Formulario de Compra');
            const p = new TextInputComponent().setCustomId('p_prod').setLabel("Producto a comprar").setStyle('SHORT').setRequired(true);
            const m = new TextInputComponent().setCustomId('p_metodo').setLabel("Método (ARS, USD, Crypto)").setStyle('SHORT').setRequired(true);
            modal.addComponents(new MessageActionRow().addComponents(p), new MessageActionRow().addComponents(m));
            return await interaction.showModal(modal);
        }

        if (customId === "ticket_soporte") {
            const modal = new Modal().setCustomId('modal_soporte').setTitle('Centro de Soporte');
            const p = new TextInputComponent().setCustomId('p_duda').setLabel("Describe tu problema").setStyle('PARAGRAPH').setRequired(true);
            modal.addComponents(new MessageActionRow().addComponents(p));
            return await interaction.showModal(modal);
        }

        if (customId === "ticket_partner") {
            const modal = new Modal().setCustomId('modal_partner').setTitle('Solicitud de Partner');
            const p = new TextInputComponent().setCustomId('p_propuesta').setLabel("Cuéntanos tu propuesta").setStyle('PARAGRAPH').setRequired(true);
            modal.addComponents(new MessageActionRow().addComponents(p));
            return await interaction.showModal(modal);
        }

        if (customId === "fechar_ticket") {
            if (!member.roles.cache.has(rolPermitidoId)) return interaction.reply({ content: "❌ Solo el Staff puede cerrar tickets.", ephemeral: true });
            enviarLog(new MessageEmbed().setTitle("🔒 Ticket Cerrado").setDescription(`**Staff:** ${user.tag}\n**Canal:** ${channel.name}`).setColor("ORANGE").setTimestamp());
            await interaction.reply("🔒 Cerrando ticket en 3 segundos...");
            setTimeout(() => channel.delete().catch(() => {}), 3000);
        }
    }

    if (interaction.isModalSubmit()) {
        
        // --- MODAL DE EMBED PERSONALIZADO (CON BOTÓN DE COMPRA) ---
        if (interaction.customId === 'modalanuncio_v2') {
            await interaction.deferReply({ ephemeral: true });
            const titulo = interaction.fields.getTextInputValue('titulo');
            const desc = interaction.fields.getTextInputValue('desc');
            const thumb = interaction.fields.getTextInputValue('thumbnail');
            const banner = interaction.fields.getTextInputValue('banner');
            const color = interaction.fields.getTextInputValue('cor');

            // ID del canal de compra para el botón
            const canalCompraId = "1469950823474659409"; 
            const linkCompra = `https://discord.com/channels/${interaction.guild.id}/${canalCompraId}`;

            const embedUser = new MessageEmbed()
                .setTitle(titulo || "")
                .setDescription(desc)
                .setColor(color.startsWith('#') ? color : `#${color}`)
                .setTimestamp();

            if (thumb && thumb.startsWith('http')) embedUser.setThumbnail(thumb);
            if (banner && banner.startsWith('http')) embedUser.setImage(banner);

            const rowBoton = new MessageActionRow().addComponents(
                new MessageButton()
                    .setLabel("🛒Comprar Aqui / Buy Here")
                    .setStyle('LINK')
                    .setURL(linkCompra)
            );

            await interaction.channel.send({ embeds: [embedUser], components: [rowBoton] });
            return await interaction.editReply({ content: "✅ Embed enviado con botón de compra." });
        }

        // --- LÓGICA DE TICKETS ---
        await interaction.deferReply({ ephemeral: true });
        
        let cateId = "";
        let tipoTicket = "";
        let nombreCanal = "";
        let camposInfo = [];

        if (interaction.customId === 'modal_compra') {
            cateId = CATEGORIAS.COMPRA;
            tipoTicket = "Compras";
            nombreCanal = `🛒-compra-${interaction.user.username}`;
            camposInfo = [
                { name: "📦 Producto", value: interaction.fields.getTextInputValue('p_prod'), inline: true },
                { name: "💳 Método", value: interaction.fields.getTextInputValue('p_metodo'), inline: true }
            ];
        } else if (interaction.customId === 'modal_soporte') {
            cateId = CATEGORIAS.SOPORTE;
            tipoTicket = "Soporte";
            nombreCanal = `🛠️-soporte-${interaction.user.username}`;
            camposInfo = [{ name: "❓ Problema", value: interaction.fields.getTextInputValue('p_duda') }];
        } else if (interaction.customId === 'modal_partner') {
            cateId = CATEGORIAS.PARTNER;
            tipoTicket = "Partner";
            nombreCanal = `🤝-partner-${interaction.user.username}`;
            camposInfo = [{ name: "📝 Propuesta", value: interaction.fields.getTextInputValue('p_propuesta') }];
        }

        try {
            const canal = await interaction.guild.channels.create(nombreCanal, {
                type: 'GUILD_TEXT',
                parent: cateId,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: ['VIEW_CHANNEL'] },
                    { id: interaction.user.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES'] },
                    { id: rolPermitidoId, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] }
                ]
            });

            const ticketID = Math.floor(Math.random() * 900000) + 100000;
            const fecha = moment().format('dddd, D [de] MMMM [de] YYYY HH:mm');

            const embedBienvenida = new MessageEmbed()
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setTitle("SISTEMA DE TICKETS")
                .setColor("#5865F2")
                .setDescription(`¡Bienvenido/a ${interaction.user}! El Staff te atenderá pronto.`)
                .addFields(
                    { name: "Categoría", value: tipoTicket, inline: true },
                    { name: "ID del Ticket", value: `\`${ticketID}\``, inline: true },
                    { name: "Fecha", value: `\`${fecha}\``, inline: true }
                )
                .addFields(camposInfo)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: "710 Shop - Gestión de Tickets" });

            const botones = new MessageActionRow().addComponents(
                new MessageButton().setCustomId("fechar_ticket").setLabel("Cerrar").setStyle("DANGER").setEmoji("🔒"),
                new MessageButton().setCustomId("asumir").setLabel("Asumir").setStyle("SUCCESS").setEmoji("✅"),
                new MessageButton().setCustomId("notificar").setLabel("Notificar").setStyle("SECONDARY").setEmoji("📢")
            );

            await canal.send({ content: `${interaction.user} | <@&${rolPermitidoId}>`, embeds: [embedBienvenida], components: [botones] });
            await interaction.editReply({ content: `✅ Ticket creado: ${canal}` });
            
            enviarLog(new MessageEmbed().setTitle("🎫 Ticket Abierto").setDescription(`**Usuario:** ${interaction.user.tag}\n**Tipo:** ${tipoTicket}\n**Canal:** ${canal}`).setColor("BLUE").setTimestamp());

        } catch (e) {
            console.error(e);
            await interaction.editReply({ content: "❌ Error al crear el canal." });
        }
    }
});

// --- 🕵️‍♂️ VIGILANCIA Y AUDITORÍA (EXTENDIDO) ---

// Mensajes Borrados/Editados
client.on('messageDelete', m => {
    if (m.author?.bot) return;
    enviarLog(new MessageEmbed().setTitle("🗑️ Mensaje Borrado").setColor("RED").addField("Autor", `${m.author?.tag || "Unknown"}`, true).addField("Canal", `${m.channel}`, true).addField("Contenido", `\`\`\`${m.content || "Sin texto/Imagen"}\`\`\``).setTimestamp());
});

client.on('messageUpdate', (o, n) => {
    if (o.author?.bot || o.content === n.content) return;
    enviarLog(new MessageEmbed().setTitle("✏️ Mensaje Editado").setColor("YELLOW").addField("Autor", `${o.author.tag}`, true).addField("Antes", `\`\`\`${o.content}\`\`\``).addField("Después", `\`\`\`${n.content}\`\`\``).setTimestamp());
});

// Canales Creados/Borrados/Editados
client.on('channelCreate', c => enviarLog(new MessageEmbed().setTitle("🆕 Canal Creado").setColor("GREEN").setDescription(`Nombre: **${c.name}**\nTipo: **${c.type}**`).setTimestamp()));
client.on('channelDelete', c => enviarLog(new MessageEmbed().setTitle("🛑 Canal Borrado").setColor("RED").setDescription(`Nombre: **${c.name}**`).setTimestamp()));
client.on('channelUpdate', (o, n) => {
    if (o.name !== n.name) enviarLog(new MessageEmbed().setTitle("📝 Canal Editado (Nombre)").setColor("BLUE").setDescription(`Antes: **${o.name}**\nDespués: **${n.name}**`).setTimestamp());
});

// Roles Creados/Borrados/Editados/Asignados
client.on('roleCreate', r => enviarLog(new MessageEmbed().setTitle("🆕 Rol Creado").setColor("GREEN").setDescription(`Nombre: **${r.name}**`).setTimestamp()));
client.on('roleDelete', r => enviarLog(new MessageEmbed().setTitle("🛑 Rol Borrado").setColor("RED").setDescription(`Nombre: **${r.name}**`).setTimestamp()));
client.on('guildMemberUpdate', (o, n) => {
    const added = n.roles.cache.filter(r => !o.roles.cache.has(r.id));
    const removed = o.roles.cache.filter(r => !n.roles.cache.has(r.id));
    if (added.size > 0) enviarLog(new MessageEmbed().setTitle("➕ Rol Añadido").setColor("GREEN").setDescription(`Usuario: ${n.user.tag}\nRol: **${added.map(r => r.name).join(", ")}**`).setTimestamp());
    if (removed.size > 0) enviarLog(new MessageEmbed().setTitle("➖ Rol Quitado").setColor("ORANGE").setDescription(`Usuario: ${n.user.tag}\nRol: **${removed.map(r => r.name).join(", ")}**`).setTimestamp());
});

// Entradas/Salidas y Contador
client.on('guildMemberAdd', m => {
    const data = JSON.parse(fs.readFileSync(contadorPath, 'utf8'));
    data.count += 1;
    fs.writeFileSync(contadorPath, JSON.stringify(data, null, 2));
    enviarLog(new MessageEmbed().setTitle("📥 Miembro Nuevo").setColor("GREEN").setDescription(`**${m.user.tag}** se unió.\nContador hoy: **${data.count}**`).setThumbnail(m.user.displayAvatarURL()).setTimestamp());
});

client.on('guildMemberRemove', m => enviarLog(new MessageEmbed().setTitle("📤 Miembro Salió").setColor("RED").setDescription(`**${m.user.tag}** abandonó el servidor.`).setTimestamp()));

// Canales de Voz
client.on('voiceStateUpdate', (o, n) => {
    let e = new MessageEmbed().setColor("AQUA").setTimestamp();
    if (!o.channelId && n.channelId) enviarLog(e.setTitle("🔊 Voz: Conexión").setDescription(`${n.member.user.tag} entró a **${n.channel.name}**`));
    else if (o.channelId && !n.channelId) enviarLog(e.setTitle("🔇 Voz: Desconexión").setDescription(`${o.member.user.tag} salió de **${o.channel.name}**`));
});

client.on('ready', () => { 
    console.log(`🔥 ${client.user.username} - SISTEMA PRO ACTIVADO`); 
    const canalLogs = client.channels.cache.get(canalLogsId);
    if (canalLogs) {
        canalLogs.send({ embeds: [new MessageEmbed().setTitle("✅ Bot Online").setDescription("Sistema de auditoría y tickets online 🔥").setColor("#00FF00").setTimestamp()] }).catch(console.error);
    }
});

client.login(process.env.TOKEN || config.token);