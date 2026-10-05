# OREI UKM-404

Control the UKM-404 4x4 USB matrix over Telnet. Designed for Companion 5.x using the Companion module API v1 and Node 22 runtime.

## Configuration

- **Target IP address:** the matrix LAN address.
- **Telnet port:** defaults to 23; match the unit's configured Telnet port.
- **Host 1–4 name / Device 1–4 name:** enter friendly port names. Blank names fall back to Host 1–4 / Device 1–4. Names appear in action and feedback dropdowns and presets. Preset button text uses name variables, so buttons created from these presets update when names change. Existing buttons from v1.0.x must be recreated from the new presets or have their text changed to the name variables.
- **Refresh interval (seconds):** 0.5–3600, default 2. The module queries all four routes at this interval, including changes made using the front panel, remote, web interface, or another controller.

The connection becomes OK after all four routes have been read. It reconnects automatically after a connection loss or missing responses. Variables change to `Unknown` when disconnected so stale routes do not light feedbacks.

## Actions and feedback

- Route one device to a host (1–4).
- Route all devices to one host.
- Refresh routing immediately.
- Boolean feedbacks: selected device/host route and connection status.
- 16 ready-to-use presets cover every device/host combination.

## Variables

`$(ukm404:device_1_host)` through `$(ukm404:device_4_host)` contain the confirmed host number, or `Unknown`. Replace `ukm404` with your connection label.

`$(ukm404:connected)` is `Yes` or `No`.

`$(ukm404:host_1_name)` through `host_4_name` and `$(ukm404:device_1_name)` through `device_4_name` expose the configured names. `$(ukm404:device_1_host_name)` through `device_4_host_name` report the name of the selected host, or `Unknown`. Numeric routing variables remain available.

## Supported firmware

Tested with MCU 1.00.06 / web 2.00.05. This module uses commands such as `set device 1 in host 2` and `get device 1 in host`. Some older OREI documentation uses a different `SetUSB` protocol, which this module does not support. Run `help` on your unit to verify the protocol.
