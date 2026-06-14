# Haven Minecraft Integration Firebot Script

Firebot startup script for Haven Minecraft Integration.

It adds Minecraft effects, events, variables, filters, viewer quests, and settings to Firebot.

You can use it for chat commands, Channel Point Redemptions, Power-Ups, timers, buttons, viewer quests, bossbars, player messages, and custom Firebot setups.

---

## Docs

Full setup and usage docs are here:

https://cathienova.github.io/HavenFMI-Docs/

---

## Requirements

* Firebot v5
* Supported Forge or NeoForge Minecraft server using the mod from https://www.curseforge.com/minecraft/mc-mods/haven-firebot-minecraft-integration-server
* (Optional) Client Mod for showing Questbook and Quest Tracker in-game, from https://www.curseforge.com/minecraft/mc-mods/haven-firebot-minecraft-integration-client

---

## Install

1. Download `havenMinecraftIntegration.js` from [**Releases**](https://github.com/CathieNova/HavenFMI-Firebot/releases).
2. Put the script in your Firebot startup scripts directory.
3. Restart Firebot.
4. Open **Haven Minecraft** tab in sidebar in Firebot.
5. Set the Minecraft server address.
6. Paste your Player Code.
7. Save the settings.
8. Click **Test Connection**.

Default Minecraft server address:

```text
http://127.0.0.1:8765
```

Use `127.0.0.1` when Firebot and the Minecraft server are on the same PC.

---

## Player Code

A server owner or staff member needs to whitelist your Minecraft name first.

After that, join the server and run:

```text
/firebot code
```

Paste the code into **Haven Minecraft** in Firebot.

Do not show your Player Code on stream.


## Supported Minecraft versions

- Forge 1.19.2
- Forge 1.20.1
- NeoForge 1.21.1
- NeoForge 26.1.2
