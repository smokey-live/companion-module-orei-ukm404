# companion-module-orei-ukm404

A Bitfocus Companion connection for the OREI UKM-404 4x4 USB matrix.

Configure its IP address, Telnet port, and refresh interval. Route individual devices or all devices to a host, use 16 routing button presets, and monitor confirmed routes through variables and boolean feedback. Automatic polling captures routing changes made outside Companion; reconnects clear stale state.

See [module help](companion/HELP.md) for configuration and variable names.

## Install in Companion 5.x

Build or download the module `.tgz`, open Companion's **Modules** page, choose **Import module**, and upload the package. Then add the **OREI UKM-404** connection and configure the matrix address. Community catalog availability requires acceptance by Bitfocus; publishing this repository does not add it to the catalog automatically.

## Development

Requires Node.js 22.20 or later and pnpm.

```sh
pnpm install
pnpm test
pnpm package
```

The generated `.tgz` can be imported into Companion. Unit tests cover fragmented Telnet negotiation, response parsing, command echo rejection, readback, and stale state clearing. Live hardware testing is documented in [TESTING.md](TESTING.md).

## Protocol

Uses the UKM-404 V1.1 user manual's lowercase command protocol and live `help` output. No factory resets, firmware changes, or network configuration actions are exposed. The older standalone RS-232 command document describes a different protocol.

MIT licensed. Contributions and hardware reports are welcome via issues and pull requests.
