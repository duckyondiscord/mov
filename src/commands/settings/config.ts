import { Message } from "eris";
import { client } from "../../client/Client";
import { MovCommand } from "../../client/Command";
import { MovEmbed } from "../../client/Embed";
import { ISettingsDB } from "../../interfaces/database";
import { Modules } from "../../interfaces/module";
import { dateToString } from "../../utils/dateToString";
import { getMemberByID } from "../../utils/get";

async function generator(msg: Message, args: string[]) {
    const settings = await client.database.settings.get<ISettingsDB>(msg.guildID!)
    const e = new MovEmbed()
    if (!settings) {
        // settings would never get null
        // since it is already setted after the bot has started and sees the guild for first time
        // in rare cases, database couldn't set default values and would result in null
        client.createMessage(msg.channel.id, "Rare error has occured.")
        return
    }

    if (args.length >= 1) {
        const modulee = args[0]
        const subcommand = args[1]
        if (!subcommand) {
            if (modulee == "json") {
                client.createMessage(msg.channel.id, `\`\`\`json\n${JSON.stringify(settings.modules, null, 4)}\n\`\`\``)
                return
            } else if (!settings.modules[modulee as keyof Modules]) {
                client.createMessage(msg.channel.id, `Cannot find module \`${modulee}\``)
                return
            } else {
                const modul = settings.modules[modulee as keyof Modules]
                e.setTitle(`View detailed for ${modulee} in JSON`)
                    .setDesc(`\`\`\`json\n${JSON.stringify(modul, null, 4)}\n\`\`\``)
                    .addField("How to set the values?", `Use ${msg.prefix}examples to view all`)
                client.createMessage(msg.channel.id, e.build())
                return
            }
        }
        const key = args[2]
        const value = args.slice(3).join(" ")
        if (!key) {
            client.createMessage(msg.channel.id, "What key do you want to change to?")
            return
        } else if (!value) {
            client.createMessage(msg.channel.id, "What value for key do you want to change?")
            return
        }
        switch (subcommand.toLowerCase()) {
            case 'add':
                if (!Array.isArray((settings.modules[modulee as keyof Modules] as any)[key])) {
                    client.createMessage(msg.channel.id, "The key you're looking for is not an array!")
                    return
                }
                try {
                    (settings.modules[modulee as keyof Modules] as any)[key].push(JSON.parse(value))
                    await client.database.settings.set<ISettingsDB>(msg.guildID!, settings)
                    client.createMessage(msg.channel.id, `Successfully set!`)
                } catch (e) {
                    client.createMessage(msg.channel.id, `There's something went wrong: ${e}`)
                    return
                }
                break
            case 'remove':
                if (!Array.isArray((settings.modules[modulee as keyof Modules] as any)[key])) {
                    client.createMessage(msg.channel.id, "The key you're looking for is not an array!")
                    return
                }
                try {
                    (settings.modules[modulee as keyof Modules] as any)[key].splice((settings.modules[modulee as keyof Modules] as any)[key].indexOf(JSON.parse(value)), 1)
                    await client.database.settings.set<ISettingsDB>(msg.guildID!, settings)
                    client.createMessage(msg.channel.id, `Successfully set!`)
                } catch (e) {
                    client.createMessage(msg.channel.id, `There's something went wrong: ${e}`)
                    return
                }
                break
            case 'set':
                try {
                    try {
                        await client.database.settings.set(`${msg.guildID!}.modules.${modulee}.${key}`, JSON.parse(value))
                    } catch {
                        await client.database.settings.set(`${msg.guildID!}.modules.${modulee}.${key}`, value)
                    }
                    client.createMessage(msg.channel.id, `Successfully set!`)
                } catch (e) {
                    client.createMessage(msg.channel.id, `There's something went wrong: ${e}`)
                    return
                }
                break
            default:
                client.createMessage(msg.channel.id, `Invalid subcommand.`)
                return
        }
    } else {
        const botAsMember = await getMemberByID(client.user.id)
        e.setTitle("Bot Settings")
            .setDesc(`The prefix is \`${settings.prefix}\`. Added on ${dateToString(new Date(botAsMember!.joinedAt!))}\n\nView the detailed module using \`${settings.prefix}config <module>\``)
        for (const [k, v] of Object.entries(settings.modules)) {
            e.addField(`${k.toUpperCase()} [\`${k}\`]`, v.enable ? "Enabled" : "Disabled", true)
        }
        client.createMessage(msg.channel.id, e.build())
    }
}

class Config extends MovCommand {
    constructor() {
        super("config", generator, {
            aliases: ["settings", "conf"],
            description: "Bot settings - configure to change bot's behaviour",
            requirements: {
                permissions: {
                    administrator: true
                }
            }
        })
    }
}

export default new Config();