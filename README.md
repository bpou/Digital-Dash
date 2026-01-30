# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Bluetooth phone calling (HFP via oFono)

The Phone tab can place/answer/hang up calls over Bluetooth when the `bluetooth-service` can access an oFono modem. This requires oFono to be installed, configured, and paired to your phone with the Hands-Free profile (HFP).

### 1) Install oFono and BlueZ extras

On Debian/Ubuntu/Raspberry Pi OS:

```bash
sudo apt update
sudo apt install -y ofono bluez bluez-tools
```

`ofono-phonesim` is optional and not available on all distros; it is only needed for testing without a real phone.

### 2) Configure BlueZ for HFP

Edit `[/etc/bluetooth/main.conf](/etc/bluetooth/main.conf)` and ensure HFP is enabled:

```ini
[General]
Enable=Source,Sink,Media,Socket
Class=0x200414
```

Restart BlueZ:

```bash
sudo systemctl restart bluetooth
```

### 3) Configure oFono to use BlueZ

Create or edit `[/etc/ofono/main.conf](/etc/ofono/main.conf)`:

```ini
[General]
UseBlueZ=1
UseHfp=1
```

Restart oFono:

```bash
sudo systemctl restart ofono
```

### 4) Pair phone with HFP profile

Ensure your phone supports HFP and allow “phone calls” during pairing. Pair using the Settings tab in the UI. The oFono modem should appear as a BlueZ modem once connected.

### 5) Verify oFono sees the modem

Run:

```bash
sudo busctl --system call org.ofono / org.ofono.Manager GetModems
```

You should see an `/ofono/<modem>` path in the output. If not, re-pair the phone and confirm HFP permissions.

If you see `Call failed: Access denied`, allow the service user to call oFono over D-Bus. Install polkit first if needed (package names vary by distro):

```bash
sudo apt install -y polkitd pkexec
sudo systemctl restart polkit
```

Then replace any existing rule with this broader one:

```bash
sudo tee /etc/polkit-1/rules.d/60-digital-dash-ofono.rules <<'EOF'
polkit.addRule(function(action, subject) {
  if (action.id.indexOf("org.ofono.") === 0) {
    if (subject.user == "admin") {
      return polkit.Result.YES;
    }
  }
});
EOF
```

Then restart polkit and oFono:

```bash
sudo systemctl restart polkit
sudo systemctl restart ofono
```

### 6) Call actions from the UI

The Phone tab issues these backend endpoints:

- `POST /call/dial?number=...`
- `POST /call/answer`
- `POST /call/hangup`

These map to oFono voice call operations in [`server/bluetooth-service/server.js`](server/bluetooth-service/server.js:308). If calls still don’t start, check the bluetooth service logs:

```bash
sudo journalctl -u digital-dash-bluetooth.service -f
```
