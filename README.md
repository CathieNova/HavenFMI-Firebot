# HavenFMI-Firebot

Firebot startup script for Haven Minecraft Integration.

It lets Firebot send Minecraft actions to a linked player through the HavenFMI server bridge.

You can use it for chat commands, Channel Point Redemptions, Power-Ups, timed effects, viewer quests, bossbars, player messages, and custom Firebot setups.

---

## How to install

1. Put `havenMinecraftIntegration.js` in your Firebot startup scripts folder.
   Usually here:
   ```text
   C:\Users\YOURUSERNAME\AppData\Roaming\Firebot\v5\profiles\Main\scripts
   ```
2. Restart Firebot.
3. Install the HavenFMI server mod on your Minecraft server.
4. Start the Minecraft server.
5. Open **Haven Minecraft** in Firebot.
6. Set **Minecraft Server Address**.
   ```text
   http://127.0.0.1:8765
   ```
   If Firebot and the Minecraft server are on the same PC, keep `127.0.0.1`.

   If Firebot connects to another PC or hosted server, replace `SERVERIPHERE` with the server IP or domain:
   ```text
   http://SERVERIPHERE:8765
   ```
7. Paste your **Player Code**.
8. Select your Minecraft version.
9. Click **Save**.
10. Click **Test Connection**.

---

## Player Code

A server owner or staff member with permission needs to whitelist your Minecraft name first.

Server console:
```text
firebot whitelist add YOURMINECRAFTNAME
```

In-game:
```text
/firebot whitelist add YOURMINECRAFTNAME
```

After your name is whitelisted, join the server and run:
```text
/firebot code
```

Paste the code into **Haven Minecraft** in Firebot.

Do not show your Player Code on stream.

---
