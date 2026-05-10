# Digital Dash Plymouth Theme

This theme is optimized for zero-flash boot into the cluster UI.

## Installation

```bash
sudo mkdir -p /usr/share/plymouth/themes/digital-dash
sudo cp digital-dash.plymouth digital-dash.script splash.png /usr/share/plymouth/themes/digital-dash/
sudo plymouth-set-default-theme digital-dash
sudo update-initramfs -u
```

## splash.png Requirements

The `splash.png` should either:
1. Match the cluster's background color exactly (#07090c) as a solid image, OR
2. Be the same splash image used by the kiosk session (Das Rolf.png)

For best zero-flash results, use option 2 with the exact same image file referenced in `start-kiosk-session.sh`.

## Key Features

- Uses #07090c background color (matches cluster bg-[#07090c])
- No animation or transitions (instant draw)
- Retains splash until compositor takes over
- Works with `--retain-splash` Plymouth flag