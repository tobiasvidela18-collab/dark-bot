require('dotenv').config();
const { Client, Collection, MessageEmbed, MessageActionRow, MessageButton, Modal, TextInputComponent } = require('discord.js');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const config = require('./DataBaseJson/config.json');

moment.locale('es');

const client = new Client({
    intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS"],
    partials: ["MESSAGE", "CHANNEL", "REACTION", "USER", "GUILD_MEMBER"],
});

client.slashCommands = new Collection();

// Carga del Handler
require('./handler')(client);

// Configuración de IDs (Asegúrate de que sean correctos)
const rolPermitidoId = "1469967630365622403"; 
const categoriaTickets = "1469950823474659409"; // Coloca aquí el ID de la categoría donde quieres que se creen

client.on('interactionCreate', async (interaction) => {
    
    // Ejecución de Slash Commands
    if (interaction.isCommand()) {
        const cmd = client.slashCommands.get(interaction.commandName);
        if (!cmd) return;
        try { 
            await cmd.run(client, interaction); 
        } catch (e) { 
            console.error(e); 
            if (!interaction.replied) interaction.reply({ content: "Error al ejecutar el comando.", ephemeral: true });
        }
        return;
    }

    // Manejo de Botones
    if (interaction.isButton()) {
        const { customId, guild, user, member } = interaction;

        // Botones de pago rápido
        if (customId === "copiar_cvu") return interaction.reply({ content: "0000003100072461415651", ephemeral: true });
        if (customId === "copiar_alias") return interaction.reply({ content: "710shop", ephemeral: true });

        // Trigger del Modal de Compra
        if (customId === "ticket_compra") {
            const modal = new Modal().setCustomId('modal_compra').setTitle('Formulario de Compra');
            const p = new TextInputComponent().setCustomId('p_prod').setLabel("¿Qué producto deseas comprar?").setStyle('SHORT').setRequired(true);
            const m = new TextInputComponent().setCustomId('p_metodo').setLabel("Método (ARS, USD, Crypto)").setStyle('SHORT').setRequired(true);
            const c = new TextInputComponent().setCustomId('p_cant').setLabel("Cantidad").setStyle('SHORT').setRequired(true).setValue("1");
            
            modal.addComponents(
                new MessageActionRow().addComponents(p), 
                new MessageActionRow().addComponents(m), 
                new MessageActionRow().addComponents(c)
            );
            return await interaction.showModal(modal);
        }

        // Botón para cerrar ticket
        if (customId === "fechar_ticket") {
            if (!member.roles.cache.has(rolPermitidoId)) return interaction.reply({ content: "❌ Solo el staff puede cerrar este ticket.", ephemeral: true });
            await interaction.reply("🔒 Cerrando ticket en 3 segundos...");
            setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
        }
    }

    // Manejo del Envío del Modal
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_compra') {
            const producto = interaction.fields.getTextInputValue('p_prod');
            const metodo = interaction.fields.getTextInputValue('p_metodo');
            const cantidad = interaction.fields.getTextInputValue('p_cant');

            // Crear canal de ticket
            const canal = await interaction.guild.channels.create(`compra-${interaction.user.username}`, {
                type: 'GUILD_TEXT',
                parent: categoriaTickets,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: ['VIEW_CHANNEL'] },
                    { id: interaction.user.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES'] },
                    { id: rolPermitidoId, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] }
                ]
            });

            const embedBienvenida = new MessageEmbed()
                .setTitle("🛒 Nuevo Pedido de Compra")
                .setColor("#2f3136")
                .setDescription(`Bienvenido ${interaction.user}, el Staff te atenderá en breve.\n\n**Detalles del pedido:**`)
                .addFields(
                    { name: "📦 Producto", value: producto, inline: true },
                    { name: "💳 Método", value: metodo, inline: true },
                    { name: "🔢 Cantidad", value: cantidad, inline: true }
                )
                .setFooter({ text: "Presiona el botón rojo para cerrar el ticket." })
                .setTimestamp();

            const filaCerrar = new MessageActionRow().addComponents(
                new MessageButton().setCustomId("fechar_ticket").setLabel("Cerrar Ticket").setStyle("DANGER").setEmoji("🔒")
            );

            await canal.send({ content: `<@&${rolPermitidoId}> | ${interaction.user}`, embeds: [embedBienvenida], components: [filaCerrar] });
            await interaction.reply({ content: `✅ Ticket creado correctamente en ${canal}`, ephemeral: true });
        }
    }
});

client.on('ready', () => { console.log(`🔥 ${client.user.username} listo para vender!`); });
client.login(process.env.TOKEN || config.token);