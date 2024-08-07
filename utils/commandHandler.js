const { Collection } = require("discord.js");
const logger = require("./logger");
const ErrorHandler = require("./errorHandler");
const PermissionCheck = require("./permissionCheck");

class CommandHandler {
  constructor() {
    this.cooldowns = new Collection();
  }

  init(client) {
    this.client = client;
    logger.info("Command handler initialized");
  }

  async handle(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await this.prepareInteraction(interaction, command);

      if (!(await this.checkPermissions(interaction, command))) {
        return;
      }

      if (!(await this.checkCooldown(interaction, command))) {
        return;
      }

      await command.execute(interaction);
      logger.command(command.data.name, interaction.user, interaction.guild);
    } catch (error) {
      await ErrorHandler.handle(error, interaction);
    }
  }

  async prepareInteraction(interaction, command) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: command.ephemeral || false });
    }
    logger.debug(`Interaction prepared for command: ${command.data.name}`);
  }

  async checkPermissions(interaction, command) {
    if (command.permissions) {
      const hasPermission = await PermissionCheck.check(
        interaction,
        command.permissions,
      );
      if (!hasPermission) {
        logger.warn(
          `Permission check failed for command: ${command.data.name}`,
          {
            userId: interaction.user.id,
            guildId: interaction.guild?.id,
          },
        );
        return false;
      }
    }
    return true;
  }

  async checkCooldown(interaction, command) {
    if (!command.cooldown) return true;

    if (!this.cooldowns.has(command.data.name)) {
      this.cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = this.cooldowns.get(command.data.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(interaction.user.id)) {
      const expirationTime =
        timestamps.get(interaction.user.id) + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        await interaction.editReply({
          content: `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.data.name}\` command.`,
          ephemeral: true,
        });
        return false;
      }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    return true;
  }

  static getTargetUser(interaction) {
    const targetUser =
      interaction.options.getUser("usuario") ||
      interaction.options.getMember("usuario");
    if (!targetUser) {
      logger.warn(
        `Target user not found for command: ${interaction.commandName}`,
      );
      throw new Error(
        "El usuario especificado no se encuentra en el servidor.",
      );
    }
    return targetUser;
  }
}

module.exports = new CommandHandler();
