import { Canvas, CanvasRenderingContext2D, createCanvas, loadImage, registerFont } from "canvas";
import { labels } from "@catppuccin/palette";
import { Message, User } from "eris";
import { ILevelDB, IUserDB } from "../interfaces/database";
import { client } from "../client/Client";
import { getLeaderboardRank } from "./getLeaderboardRank";
import { getUserByID } from "./get";
import { DEFAULT_USER_SETTINGS } from "../constant/defaultConfig";

registerFont("./assets/Roboto-Bold.ttf", {
    family: "RobotoB"
})

async function progressBar(ctx: CanvasRenderingContext2D, level: ILevelDB, coloraccent: string, width: number, height: number, x: number, y: number) {
    const currentXP = level.xp
    const requiredXP = 5 * (Math.pow(level.level, 2)) + (50 * level.level) + 100

    const fillN = Math.floor(currentXP / requiredXP * width)

    ctx.fillStyle = labels.crust.mocha.hex
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, 10)
    ctx.fill()
    ctx.closePath()

    // too small to fit
    ctx.fillStyle = coloraccent
    if (fillN > 5) {
        ctx.beginPath()
        ctx.roundRect(x, y, fillN, height, 10)
        ctx.fill()
        ctx.closePath()
    }

    ctx.font = "18px 'RobotoB'"
    const xp = `XP ${currentXP}/${requiredXP}`
    const t = ctx.measureText(xp)
    ctx.globalCompositeOperation = 'difference';
    ctx.fillText(xp, (x + (width / 2)) - t.width / 2, y + 16)
    ctx.globalCompositeOperation = 'normal';
}

async function getUserPref(userr: User): Promise<IUserDB> {
    const user = await client.database.user.get<IUserDB>(userr.id)
    return user || DEFAULT_USER_SETTINGS
}

async function genAvatar(ctx: CanvasRenderingContext2D, user: User, x: number, y: number, round?: boolean): Promise<void> {
    const { colorAccent } = await getUserPref(user)

    if (round) {
        const img = await loadImage(user.dynamicAvatarURL("png"))

        const arcX = x + 40
        const arcY = y + 40

        ctx.save()
        ctx.beginPath()
        ctx.arc(arcX, arcY, 40, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()

        ctx.beginPath()
        ctx.arc(arcX, arcY, 40, 0, Math.PI * 2)
        ctx.strokeStyle = colorAccent
        ctx.lineWidth = 4
        ctx.clip()
        ctx.drawImage(img, x, y, 80, 80)
        ctx.stroke()
        ctx.closePath()
        ctx.restore()

    } else {
        const img = await loadImage(user.dynamicAvatarURL("png"))

        ctx.strokeStyle = colorAccent
        ctx.lineWidth = 4
        ctx.drawImage(img, x, y, 80, 80)
        ctx.stroke()
    }
}

async function generateBg(canvas: Canvas, ctx: CanvasRenderingContext2D, user: User): Promise<void> {
    const { customBackgroundURL, colorAccent } = await getUserPref(user)
    if (!user.dynamicBannerURL("png") && customBackgroundURL == "color") {
        ctx.fillStyle = colorAccent
        ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else {
        const url = (customBackgroundURL != "color" ? customBackgroundURL : colorAccent) || user.dynamicBannerURL("png")!
        const img = await loadImage(url)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
}

function rankTxt(ctx: CanvasRenderingContext2D, rank: number, x: number, y: number) {
    switch (rank) {
        case 1:
            ctx.fillStyle = labels.yellow.mocha.hex
            break
        case 2:
            // grey aka silver
            ctx.fillStyle = labels.subtext1.mocha.hex
            break
        case 3:
            // catppuccin doesn't have bronze color
            ctx.fillStyle = "#c6902eff"
            break
        default:
            ctx.fillStyle = labels.overlay0.mocha.hex
            break
    }
    ctx.fillText(`#${rank}`, x, y)
}

export async function checkURLValidity(url: string): Promise<Boolean> {
    const canvas = createCanvas(100, 100)
    const ctx = canvas.getContext("2d")

    try {
        const img = await loadImage(url)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        return true
    } catch {
        return false
    }
}

export async function genXPRank(user: User, level: ILevelDB): Promise<Buffer> {

    const { colorAccent, customBackgroundURL } = await getUserPref(user)
    const canvas = createCanvas(450, 155)
    const ctx = canvas.getContext("2d")

    await generateBg(canvas, ctx, user)

    ctx.fillStyle = labels.base.mocha.hex
    if (customBackgroundURL !== "color") {
        ctx.globalAlpha = 0.5
    }


    const canvasContent = { w: canvas.width - 45, h: canvas.height - 20 }

    ctx.beginPath()
    ctx.roundRect(20, 10, canvasContent.w, canvasContent.h, 10)
    ctx.fill()
    ctx.closePath()

    ctx.globalAlpha = 1

    const name = `${user.username}#${user.discriminator}`

    await genAvatar(ctx, user, 40, (canvas.height / 2) - 60, true)

    ctx.font = "16px 'RobotoB'"
    ctx.fillStyle = labels.text.mocha.hex
    let size = 16
    let nameW = ctx.measureText(name)
    while ((canvasContent.w / 4 - nameW.width / 2) < 20) {
        size--
        ctx.font = `${size}px 'RobotoB'`
        nameW = ctx.measureText(name)
    }
    ctx.fillText(name, canvasContent.w / 4 - nameW.width / 2, canvas.height - 15)

    ctx.font = "16px 'RobotoB'"
    ctx.fillStyle = labels.overlay2.mocha.hex
    const totalXPstr = `Total XP: ${level.totalxp.toLocaleString()}`
    const ttttwidth = ctx.measureText(totalXPstr)
    ctx.fillText(totalXPstr, canvasContent.w / 1.5 - ttttwidth.width / 2, canvas.height - 15)

    ctx.fillStyle = colorAccent
    ctx.font = "46px 'RobotoB'"
    const txtLvl = `Level ${level.level}`
    const t = ctx.measureText(txtLvl)
    ctx.fillText(txtLvl, (canvasContent.w / 2 - t.width / 2) + 35, (canvas.height / 2) + 10)

    progressBar(ctx, level, colorAccent, canvasContent.w - 30, 20, 30, (canvas.height / 2) + 25)

    const leaderboardRank = await getLeaderboardRank(user.id)
    ctx.fillStyle = labels.overlay0.mocha.hex
    ctx.font = "20px 'RobotoB'"
    rankTxt(ctx, leaderboardRank.rank, (canvasContent.w / 2 - t.width / 2) + 35, (canvas.height / 2) - 30)

    return canvas.toBuffer()
}

async function leaderboardContent(ctx: CanvasRenderingContext2D, canvas: Canvas, entry: { id: string, value: ILevelDB }, rank: number, index: number): Promise<void> {

    const contentIndex = 35 * index
    ctx.fillStyle = labels.base.mocha.hex
    ctx.beginPath()
    ctx.roundRect(10, contentIndex, canvas.width - 20, 30, 5)
    ctx.fill()
    ctx.closePath()

    const u = await getUserByID(entry.id, true)
    const name = u ? u.username + "#" + u.discriminator : entry.id

    ctx.fillStyle = labels.text.mocha.hex
    ctx.font = "16px 'RobotoB'"
    switch (rank + 1) {
        case 1:
            ctx.fillStyle = labels.yellow.mocha.hex
            break
        case 2:
            // grey aka silver
            ctx.fillStyle = labels.subtext1.mocha.hex
            break
        case 3:
            // catppuccin doesn't have bronze color
            ctx.fillStyle = "#c6902eff"
            break
        default:
            ctx.fillStyle = labels.overlay0.mocha.hex
            break
    }
    ctx.fillText(`#${rank + 1}`, 15, contentIndex + 20)
    ctx.fillStyle = labels.text.mocha.hex
    let size = 16
    let nameN = ctx.measureText(name)
    while (nameN.width > 200) {
        size--
        ctx.font = `${size}px 'RobotoB'`
        nameN = ctx.measureText(name)
    }
    ctx.fillText(name, 50, contentIndex + 20, 250)

    ctx.font = "16px 'RobotoB'"
    ctx.fillStyle = labels.subtext1.mocha.hex
    ctx.fillText(`•`, 260, contentIndex + 20)
    ctx.fillStyle = labels.text.mocha.hex
    ctx.fillText(`Level ${entry.value.level.toLocaleString()} | Total XP: ${entry.value.totalxp.toLocaleString()}`, 280, contentIndex + 20)
}

export async function leaderboardCanvas(levels: { id: string, value: ILevelDB }[], msg: Message<any>, page: number) {
    const canvas = createCanvas(550, (35 * levels.length) + 60)
    const ctx = canvas.getContext("2d")

    ctx.fillStyle = labels.crust.mocha.hex
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (page == 0) page = + 1

    let rank: number = (page - 1) * 15
    let index = 0

    for (const entry of levels) {
        await leaderboardContent(ctx, canvas, entry, rank, index)
        rank++
        index++
    }

    const { colorAccent } = await getUserPref(msg.author)

    ctx.fillStyle = colorAccent
    ctx.beginPath()
    ctx.roundRect(10, (35 * index) + 10, canvas.width - 20, 40, 5)
    ctx.fill()
    ctx.closePath()

    const yourRank = await getLeaderboardRank(msg.author.id)
    const positionI = (35 * index) + 35

    switch (yourRank.rank) {
        case 1:
            ctx.fillStyle = labels.yellow.mocha.hex
            break
        case 2:
            // grey aka silver
            ctx.fillStyle = labels.subtext1.mocha.hex
            break
        case 3:
            // catppuccin doesn't have bronze color
            ctx.fillStyle = "#c6902eff"
            break
        default:
            ctx.fillStyle = labels.overlay0.mocha.hex
            break
    }
    ctx.strokeStyle = labels.crust.mocha.hex
    ctx.lineWidth = 3
    ctx.fillText(`#${yourRank.rank}`, 15, positionI)
    ctx.stroke()

    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = "#ffffff"
    const name = `${msg.author.username}#${msg.author.discriminator}`
    let size = 16
    let nameN = ctx.measureText(name)
    while (nameN.width > 200) {
        size--
        ctx.font = `${size}px 'RobotoB'`
        nameN = ctx.measureText(name)
    }
    ctx.fillText(name, 50, positionI, 250)

    ctx.font = "16px 'RobotoB'"
    ctx.fillStyle = labels.subtext1.mocha.hex
    ctx.fillText(`•`, 260, positionI)

    ctx.fillStyle = "#ffffff"
    ctx.fillText(`Level ${yourRank.data.level} | Total XP: ${yourRank.data.totalxp.toLocaleString()}`, 280, positionI)

    ctx.globalCompositeOperation = 'normal';
    return canvas.toBuffer()
}

export async function urlToDataURI(url: string) {
    const img = await loadImage(url)
    const canvas = new Canvas(img.width, img.height, "image")
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)

    return canvas.toDataURL()
}