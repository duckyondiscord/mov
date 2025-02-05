import { Message } from "eris";
import { client } from "../../client/Client";
import { MovCommand } from "../../client/Command";
import { MovEmbed } from "../../client/Embed";
import { DEFAULT_USER_SETTINGS } from "../../constant/defaultConfig";
import { IUserDB } from "../../interfaces/database";

async function generator(msg: Message, args: string[]) {
    let uSettings = await client.database.user.get<IUserDB>(msg.author.id)
    if (!uSettings) {
        uSettings = await client.database.user.set<IUserDB>(msg.author.id, DEFAULT_USER_SETTINGS)
    }
    // to prevent from adding useralias to existing aliases smh
    const allCommandsNameAndAliases = Object.values(client.commands)
        .flatMap(m => m.aliases)
        .concat(
            Object.keys(client.commands)
        )
        .concat(
            uSettings.aliases.flatMap(m => m.alias)
        )
    if (args.length < 1 || !isNaN(Number(args[0]))) {
        let page = !isNaN(Number(args[0])) ? Number(args[0]) : 1
        const maxPage = Math.ceil(uSettings.aliases.length / 20)

        if (page > maxPage) {
            page = maxPage
        }
        try {
            const e = new MovEmbed()
                .setTitle(`User aliases [${uSettings.aliases.flatMap(m => m.alias).length}]`)
                .setDesc(`If you want to modify your aliases, use \`${msg.prefix}aliases add <alias name> <target>\` or \`${msg.prefix}aliases remove <alias name>\`\nYou cannot have user alias if it conflicts with command name, its build-in aliases AND your user alias`)
            if (uSettings.aliases.length < 1) {
                e.addField("No aliases?", "you don't have any user aliases set")
            } else {
                for (const alias of uSettings.aliases.slice((page - 1) * 20, page * 20)) {
                    e.addField(`Target: ${alias.commandTarget}`, alias.alias.map(m => `\`${m}\``).join(", "))
                }
                e.setFooter(`Page ${page}/${maxPage}`, msg.author.avatarURL)
            }
            client.createMessage(msg.channel.id, e.build())
            return
        } catch (e) {
            console.error(e)
            client.createMessage(msg.channel.id, `There was an error viewing your aliases. Please contact the developer for this!`)
            return
        }
    }
    const action = args[0]
    const name = args[1]
    const target = args[2]
    if (!name) {
        client.createMessage(msg.channel.id, "Missing alias name argument")
        return
    }
    switch (action.toLowerCase()) {
        case "add":
        case "create":
            if (allCommandsNameAndAliases.includes(name)) {
                client.createMessage(msg.channel.id, "Your alias is conflict with existing command name, alias or your other aliases. Please try a different one")
                return
            }
            if (!target) {
                client.createMessage(msg.channel.id, "What's that alias for? (Missing target command)")
                return
            }
            if (name.length >= 150) {
                client.createMessage(msg.channel.id, "Cannot create alias longer than 150 characters")
                return
            }
            const cmd = client.resolveCommand(target)
            if (!cmd) {
                client.createMessage(msg.channel.id, "That target command is not found.")
                return
            }
            const existingCmd = uSettings.aliases.find(m => m.commandTarget == cmd.label)
            if (!existingCmd) {
                uSettings.aliases.push({
                    commandTarget: cmd.label,
                    alias: [name]
                })
            } else {
                existingCmd.alias.push(name)
                uSettings.aliases.splice(uSettings.aliases.findIndex(m => m.commandTarget == cmd.label), 1)
                uSettings.aliases.push(existingCmd)
            }
            client.createMessage(msg.channel.id, `Successfully added alias \`${name}\`!`)
            break

        case "remove":
        case "rm":
            const existingAlias = uSettings.aliases.find(m => m.alias.includes(name))
            if (!existingAlias) {
                client.createMessage(msg.channel.id, "That alias doesn't exist. You probably already removed it")
                return
            }
            existingAlias.alias.splice(existingAlias.alias.findIndex(m => m == name), 1)
            uSettings.aliases.splice(uSettings.aliases.findIndex(m => m.commandTarget == existingAlias.commandTarget), 1)
            uSettings.aliases.push(existingAlias)
            break

        default:
            client.createMessage(msg.channel.id, "Invalid action")
            return
    }
    client.database.user.set(msg.author.id, uSettings)
}

class Aliases extends MovCommand {
    constructor() {
        super("aliases", generator, {
            aliases: ["alias"]
        })
    }
}

export default new Aliases();