require('dotenv').config();
const { Client, Collection, MessageEmbed, MessageActionRow, MessageButton, Modal, TextInputComponent } = require('discord.js');
const Discord = require('discord.js');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const transcript = require('discord-html-transcripts');
const config = require('./DataBaseJson/config.json');

moment.locale('es');

const client = new Client({
    intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES", "GUILD_PRESENCES", "GUILD_MESSAGE_REACTIONS", "GUILD_VOICE_STATES", "DIRECT_MESSAGES"],
    partials: ["MESSAGE", "CHANNEL", "REACTION", "USER", "GUILD_MEMBER"],
});

client.slashCommands = new Collection();

// --- CARGA DEL HANDLER (ESTO FALTABA) ---
require('./Handler')(client);

// --- CARGA DE EVENTOS ---
const eventsPath = path.join(__dirname, 'Events');
if (fs.existsSync(eventsPath)) {
    fs.readdirSync(eventsPath).forEach(file => {
        if (file.endsWith('.js')) {
            try { require(`./Events/${file}`)(client); } catch (e) { console.error(e); }
        }
    });
}

const rolPermitidoId = "1469967630365622403"; 

// --- VERIFICACIÓN DE VIDA (Escribe !test en Discord) ---
client.on('messageCreate', async (message) => {
    if (message.content === '!test') return message.reply('✅ El bot está encendido y leyendo mensajes.');
});

client.on('interactionCreate', async (interaction) => {
    
    // Slash Commands
    if (interaction.isCommand()) {
        const cmd = client.slashCommands.get(interaction.commandName);
        if (!cmd) return console.log(`Comando no encontrado: ${interaction.commandName}`);
        try { 
            await cmd.run(client, interaction); 
        } catch (e) { 
            console.error(e); 
            if (!interaction.replied) interaction.reply({ content: "Error al ejecutar el comando.", ephemeral: true });
        }
        return;
    }

    // Botones
    if (interaction.isButton()) {
        const { customId, guild, user, member } = interaction;

        if (customId === "copiar_cvu" || customId === "copiar_cvu22") return interaction.reply({ content: "0000003100072461415651", ephemeral: true });
        if (customId === "copiar_alias" || customId === "copiar_alias22") return interaction.reply({ content: "710shop", ephemeral: true });

        // Tickets Modals Trigger
        if (customId === "ticket_compra") {
            const modal = new Modal().setCustomId('modal_compra').setTitle('Formulario de Compra');
            const p = new TextInputComponent().setCustomId('p_prod').setLabel("Producto").setStyle('SHORT').setRequired(true);
            const m = new TextInputComponent().setCustomId('p_metodo').setLabel("Método").setStyle('SHORT').setRequired(true);
            const c = new TextInputComponent().setCustomId('p_cant').setLabel("Cantidad").setStyle('SHORT').setRequired(true);
            modal.addComponents(new MessageActionRow().addComponents(p), new MessageActionRow().addComponents(m), new MessageActionRow().addComponents(c));
            return await interaction.showModal(modal);
        }

        if (customId === "fechar_ticket") {
            if (!member.roles.cache.has(rolPermitidoId)) return interaction.reply({ content: "No staff.", ephemeral: true });
            await interaction.reply("🔒 Cerrando...");
            setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
        }
    }

    // Modals Submit
    if (interaction.isModalSubmit()) {
        const { customId, fields, guild, user } = interaction;

        if (customId === 'modalanuncio_v2') {
            await interaction.deferReply({ ephemeral: true });
            try {
                const titulo = fields.getTextInputValue("titulo");
                const desc = fields.getTextInputValue("desc");
                const thumbnail = fields.getTextInputValue("thumbnail");
                const banner = fields.getTextInputValue("banner");
                let cor = fields.getTextInputValue("cor") || "#000001";

                const embed = new MessageEmbed()
                    .setDescription(desc)
                    .setColor(cor)
                    .setTimestamp();
                
                if (titulo) embed.setTitle(titulo);
                if (thumbnail?.startsWith("http")) embed.setThumbnail(thumbnail);
                if (banner?.startsWith("http")) embed.setImage(banner);

                await interaction.channel.send({ embeds: [embed] });
                await interaction.editReply({ content: "✅ Enviado." });
            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: "❌ Error." });
            }
        }
    }
});

client.on('ready', () => { console.log(`🔥 ${client.user.username} online!`); });
client.login(process.env.TOKEN || config.token);