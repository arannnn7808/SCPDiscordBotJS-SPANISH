const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const CustomEmbedBuilder = require("../../utils/embedBuilder");
const ErrorHandler = require("../../utils/errorHandler");
const logger = require("../../utils/logger");

class CommandError extends Error {
  constructor(code, message, level = "error") {
    super(message);
    this.name = "CommandError";
    this.code = code;
    this.level = level;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Obtén información sobre un usuario.")
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("El usuario del que quieres obtener información"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
  folder: "utility",
  permissions: ["SendMessages"],
  cooldown: 5,

  async execute(interaction) {
    try {
      const targetUser =
        interaction.options.getUser("usuario") || interaction.user;
      const member = await interaction.guild.members.fetch(targetUser.id);

      if (!member) {
        throw new CommandError(
          "USER_NOT_FOUND",
          "El usuario especificado no está en el servidor.",
        );
      }

      const embed = await this.createUserInfoEmbed(member, interaction);
      await interaction.editReply({ embeds: [embed] });
      logger.info(`Userinfo command executed for ${targetUser.tag}`, {
        executor: interaction.user.tag,
        guildId: interaction.guild.id,
      });
    } catch (error) {
      await ErrorHandler.handle(error, interaction);
    }
  },

  createUserInfoEmbed(member, interaction) {
    const roles = member.roles.cache
      .sort((a, b) => b.position - a.position)
      .map((role) => role.toString())
      .slice(0, -1);

    return new CustomEmbedBuilder()
      .setTitle(`Información de Usuario: ${member.user.tag}`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setColor(member.displayHexColor || "#00FF00")
      .addField("ID", member.user.id, true)
      .addField("Apodo", member.nickname || "Ninguno", true)
      .addField(
        "Cuenta Creada",
        `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
        true,
      )
      .addField(
        "Se Unió al Servidor",
        `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
        true,
      )
      .addField("Roles", roles.length ? roles.join(", ") : "Ninguno")
      .addField("Es un Bot", member.user.bot ? "Sí" : "No", true)
      .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
      .setTimestamp()
      .build();
  },
};
