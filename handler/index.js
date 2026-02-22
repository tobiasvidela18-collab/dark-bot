const fs = require("fs").promises;
const path = require("path");
const Discord = require("discord.js");

module.exports = async (client) => {
    client.slashCommands = new Discord.Collection();

    async function loadCommands() {
        const SlashsArray = [];
        const commandFolders = await fs.readdir(path.join(process.cwd(), 'Comandos'));

        for (const folder of commandFolders) {
            const folderPath = path.join(process.cwd(), 'Comandos', folder);
            const commandFiles = await fs.readdir(folderPath);

            for (const file of commandFiles) {
                if (!file.endsWith('.js')) continue;

                try {
                    const commandPath = `../Comandos/${folder}/${file}`;
                    delete require.cache[require.resolve(commandPath)];
                    const command = require(commandPath);

                    if (!command?.name) continue;

                    // Limpieza total para Discord API
                    const commandData = {
                        name: command.name.toLowerCase().trim(),
                        description: command.description || "Sin descripción",
                        options: command.options || []
                    };

                    client.slashCommands.set(commandData.name, command);
                    SlashsArray.push(commandData);

                    console.log(`✅ Comando Cargado: ${commandData.name}`);
                } catch (error) {
                    console.error(`❌ Error en comando ${file}:`, error);
                }
            }
        }
        return SlashsArray;
    }

    const SlashsArray = await loadCommands();

    client.once("ready", async () => {
        try {
            // Registro global y por servidor para asegurar que aparezcan
            await client.application.commands.set(SlashsArray);
            
            for (const guild of client.guilds.cache.values()) {
                await guild.commands.set(SlashsArray);
            }
            
            console.log(`🚀 API: ${SlashsArray.length} Comandos Slash sincronizados con Discord.`);
        } catch (error) {
            console.error('❌ Error al registrar en la API:', error);
        }
    });
};