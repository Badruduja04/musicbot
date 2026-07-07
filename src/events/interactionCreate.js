// ─── events/interactionCreate.js ─────────────
import { logger }    from '../utils/logger.js';
import { buildEmbed } from '../utils/helper.js';

export const name = 'interactionCreate';
export const once = false;

export async function execute(interaction, client) {
  // ── Autocomplete ──────────────────────────
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command?.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (err) {
      logger.error(`autocomplete [/${interaction.commandName}]: ${err.message}`);
      // Autocomplete errors must be handled silently — cannot reply with error
    }
    return;
  }

  // ── Slash commands ────────────────────────
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn(`Unknown command: /${interaction.commandName}`);
    return;
  }

  logger.debug(`[CMD] /${interaction.commandName} — ${interaction.user.tag} in ${interaction.guild?.name ?? 'DM'}`);

  try {
    await command.execute(interaction, client);
  } catch (err) {
    logger.error(`command [/${interaction.commandName}]: ${err.message}`);

    const errorEmbed = buildEmbed({
      title:       '❌ Terjadi Kesalahan',
      description: `Perintah gagal dieksekusi:\n\`\`\`${err.message}\`\`\``,
      color:       0xED4245,
      footer:      'Hubungi administrator jika masalah berlanjut',
    });

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    } catch {
      // Interaction might have expired
    }
  }
}
