const Discord = require("discord.js");
const path = require('path');
const config = require(path.join(process.cwd(), 'DataBaseJson', 'config.json'));

module.exports = {
  name: "embed",
  description: "🔨 | Envía un embed personalizado con botón de compra.",

  run: async (client, interaction) => {
    if (!interaction.member.permissions.has("ADMINISTRATOR")) {
      return interaction.reply({ 
        content: `❌ | ¡No tienes permiso!`, 
        ephemeral: true 
      });
    }

    try {
      const modal = new Discord.Modal()
        .setCustomId('modalanuncio_v2') 
        .setTitle('🎉 | Crear Embed');

      const tituloInput = new Discord.TextInputComponent()
        .setCustomId('titulo').setLabel('Título:').setStyle('SHORT').setRequired(false);

      const descInput = new Discord.TextInputComponent()
        .setCustomId('desc').setLabel('Descripción:').setStyle('PARAGRAPH').setRequired(true);

      const thumbInput = new Discord.TextInputComponent()
        .setCustomId('thumbnail').setLabel('Thumbnail URL: (opcional)').setStyle('SHORT').setRequired(false);

      const bannerInput = new Discord.TextInputComponent()
        .setCustomId('banner').setLabel('Banner URL: (opcional)').setStyle('SHORT').setRequired(false);

      const colorInput = new Discord.TextInputComponent()
        .setCustomId('cor').setLabel('Color(hex):').setStyle('SHORT').setPlaceholder('#000001').setRequired(true);

      modal.addComponents(
        new Discord.MessageActionRow().addComponents(tituloInput),
        new Discord.MessageActionRow().addComponents(descInput),
        new Discord.MessageActionRow().addComponents(thumbInput),
        new Discord.MessageActionRow().addComponents(bannerInput),
        new Discord.MessageActionRow().addComponents(colorInput)
      );

      await interaction.showModal(modal);

    } catch (error) {
      console.error(error);
    }
  }
};