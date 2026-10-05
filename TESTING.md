# Validation

Tested 2026-10-05 with an OREI UKM-404 running MCU 1.00.06 / web 2.00.05 and Companion 5.0.7 on Linux.

- All 16 device/host routes passed using the module's Telnet client.
- A route change made through a separate Telnet session was detected by periodic polling.
- Forced TCP disconnect cleared cached routes; automatic reconnection recovered all four routes.
- All 16 imported Companion routing presets were pressed through Companion and the resulting Companion variable values checked.
- Original routes were restored after testing: devices 1 and 2 to host 2; devices 3 and 4 to host 1.
- Parser/transport automated tests passed, including fragmented negotiations and responses and ignoring echoed set commands.
- Module package generated successfully using Bitfocus module tools.

Companion 5.0.7 was tested directly. Other 5.x versions have not been individually tested; this module uses the API v1.14 supported by Companion 5.0.0 and the Node 22 runtime.
