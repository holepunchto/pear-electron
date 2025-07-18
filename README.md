# pear-electron

> Pear User-Interface Library for Electron

**Status: WIP**

## Installation

```sh
npm install pear-electron
```

## Usage

Instantiate a `pear-electron` runtime instance from a Pear Application's entrypoint JavaScript file:

```js
import Runtime from 'pear-electron'
import Bridge from 'pear-bridge'

const runtime = new Runtime()

const bridge = new Bridge()
await bridge.ready()

const pipe = runtime.start({ bridge })
Pear.teardown(() => pipe.end())
```

Call `runtime.start` to open the UI.

> NOTE: naming the import `Runtime` instead of `PearElectron` is intentional, for two reasons. The `pear-electron` import resolves to a runtime start library or a User Interface library depending on environment and using `Runtime` and `ui` as assigned names means switching out `pear-electron` with an equivalent alternative only involves changing the two `pear-electron` import specifiers.

## Initialization API

### `new Runtime() -> runtime`

Create the runtime instances with `new Runtime()`.

### `runtime.ready()`

Prepare the runtime, runtime binaries for the runtime version may be bootstrapped peer-to-peer at this point. This only runs once per version and any prior bootstraps can be reused for subsequent versions where state hasn't changed. In a production scenario any bootstrapping would be performed in advance by the application distributable.

### `runtime.start(opts)`

Opens the UI. 

#### Options

* `bridge` - An instance of `pear-bridge`.

## User-Interface API

Inside the pear-electron runtime desktop application, pear-electron resolves to a UI control API.

**index.html**:
```html
<script src="./app.js" type="module">
```

**app.js**:
```js
import ui from 'pear-electron'
```

> NOTE: naming the import `ui` instead of `PearElectron` is intentional, for two reasons. The `pear-electron` import resolves to a runtime start library or a User Interface library depending on environment and using `Runtime` and `ui` as assigned names means switching out `pear-electron` with an equivalent alternative only involves changing the two `pear-electron` import specifiers.

### `ui.app <Object>`

UI Application controls

### `const success = await app.focus()`

Resolves to: `<Boolean>`

Focus current view or window.

### `const success = await app.blur()`

Resolves to: `<Boolean>`

Blur current view or window.

### `const success = await app.show()`

Resolves to: `<Boolean>`

Show current view or window.

### `const success = await app.hide()`

Resolves to: `<Boolean>`

Hide current view or window.

### `const sourceId = await app.getMediaSourceId()`

Get the sourceId of the current window or view.

**References**

* [win.getMediaSourceId()](const-sourceId--await-wingetMediaSourceId)


### `const success = await app.minimize()`

Resolves to: `<Boolean>`

Minimize current window.

### `const success = await app.maximize()`

Resolves to: `<Boolean>`

Maximize current window.

### `const success = await app.restore()`

Resolves to: `<Boolean>`

Unmaximize/unminimize the current window if it is currently maximized/minimized.

### `const success = await app.close()`

Resolves to: `<Boolean>`

Closes the current view or window.


### `const isVisible = await app.isVisible()`

Resolves to: `<Boolean>`

Whether the current window or view is visible.

### `const isMaximized = await app.isMaximized()`

Resolves to: `<Boolean>`

### `const isMinimized = await app.isMinimized()`

Resolves to: `<Boolean>`

### `const found = await app.find(options <Object>)`

Resolves to: `<Found> extends <streamx.Readable>`

Find and select text, emit matches as data events.

**Options**
* text `<String>` - search term
* forward `<Boolean>` - search forward (`true`) or backward (`false`). Defaults `true`.
* matchCase `<Boolean>`  - case-sensitivity. Default `false`.

#### `await found.proceed()`

Find & select next match, emit result as stream data.

#### `await found.clear()`

Stop search and clear matching text selection. Implies destroy.

#### `await found.keep()`

Stop search and convert matching text selection to text highlight. Implies destroy.

#### `await found.activate()`

Stop search and simulate a click event on the selected match. Implies destroy.


### `ui.media <Object>`

Media interface

#### `const status = await ui.media.status.microphone()`

Resolves to: `<String>`

If access to the microphone is available, resolved value will be `'granted'`.

Any other string indicates lack of permission. Possible values are `'granted'`, `'not-determined'`, `'denied'`, `'restricted'`, `'unknown'`.

#### `const status = await ui.media.status.camera()`

Resolves to: `<String>`

If access to the camera is available, resolved value will be `'granted'`.

Any other string indicates lack of permission. Possible values are `'granted'`, `'not-determined'`, `'denied'`, `'restricted'`, `'unknown'`.

#### `const status = await ui.media.status.screen()`

Resolves to: `<String>`

If access to the screen is available, resolved value will be `'granted'`.

Any other string indicates lack of permission. Possible values are `'granted'`, `'not-determined'`, `'denied'`, `'restricted'`, `'unknown'`.

#### `const success = await ui.media.access.microphone()`

Resolves to: `<Boolean>`

Request access to the microphone. Resolves to `true` if permission is granted.

#### `const success = await ui.media.access.camera()`

Resolves to: `<Boolean>`

Request access to the camera. Resolves to `true` if permission is granted.

#### `const success = await ui.media.access.screen()`

Resolves to: `<Boolean>`

Request access to screen sharing. Resolves to `true` if permission is granted.

#### `const sources = await ui.media.desktopSources(options <Object>)`

Captures available desktop sources. Resolves to an array of objects with shape `{ id <String>, name <String>, thumbnail <NativeImage>, display_id <String>, appIcon <NativeImage> }`. The `id` is the window or screen identifier. The `name` is the window title or `'Screen <index>'` in multiscreen scenarios or else `Entire Screen`. The `display_id` identifies the screen. The thumbnail is a scaled down screen capture of the window/screen.

**Options**

* `types <Array<String>>` - Default: `['screen', 'window']`. Filter by types. Types are `'screen'` and `'window'`.
* `thumbnailSize <Object>` - Default: `{width: 150, height: 150}`. Set thumbnail scaling (pixels)
* `fetchWindowIcons <Boolean>` - Default: `false`. Populate `appIcon` with Window icons, or else `null`.

**References**

* [win.getMediaSourceId()](#const-sourceid--await-wingetmediasourceid)
* [view.getMediaSourceId()](#const-sourceid--await-viewgetmediasourceid)
* [self.getMediaSourceId()](#const-sourceid--await-selfgetmediasourceid)
* [parent.getMediaSourceId()](#const-sourceid--await-parentgetmediasourceid)
* https://www.electronjs.org/docs/latest/api/desktop-capturer#desktopcapturergetsourcesoptions
* https://www.electronjs.org/docs/latest/api/structures/desktop-capturer-source
* [`<NativeImage>`](https://www.electronjs.org/docs/latest/api/native-image)

Exits the process with the provided exit code.

### `const win = new ui.Window(entry <String>, options <Object>)`

Desktop Applications only.

Create a new `Window` instance.

**Options**

* `show <Boolean>` Default: `true` - show the window as soon as it has been opened
* `x <Integer>` - the horizontal position of left side of the window (pixels)
* `y <Integer>` - vertical window position (pixels)
* `width <Integer>` - the width of the window (pixels)
* `height <Integer>` - the height of the window (pixels)
* `animate <Boolean>` Default: `false` - animate the dimensional change. MacOS only, ignored on other OS's.
* `center <Boolean` - center the window upon opening
* `minWidth <Integer>` - window minimum width (pixels)
* `minHeight <Integer>` - window minimum height (pixels)
* `maxWidth <Integer>` - window maximum width (pixels)
* `maxHeight <Integer>` - window maximum height (pixels)
* `resizable <Boolean>` - window resizability
* `movable <Boolean>` - window movability
* `minimizable <Boolean>` - window minimizability
* `maximizable <Boolean>` - window maximizability
* `closable <Boolean>` - window closability
* `focusable <Boolean>` - window focusability
* `alwaysOnTop <Boolean>` - Set window to always be on top
* `fullscreen <Boolean>` - Set window to fullscreen upon open
* `kiosk <Boolean>` - Set window to enter kiosk mode upon open
* `autoHideMenuBar <Boolean>` - Hide menu bar unless Alt key is pressed (Linux, Windows)
* `hasShadow <Boolean>` - Set window shadow
* `opacity <Number>` - Set window opacity (0.0 - 1.0) (Windows, macOS)
* `transparent <Boolean>` - Set window transparency
* `backgroundColor <String>` Default: `'#FFF'` - window default background color. Hex, RGB, RGBA, HSL HSLA, CSS color

### `win.on[ce]('message', (...args) => { })`
### `for await (const [ ...args ] of win)`

Receive a message from the window. The received `args` array is deserialized via `JSON.parse`.

**References**

* [`win.send()`](#await-winsendargs)

### `const success = await win.open(options <Object>)`

Resolves to: `<Boolean>`

Open the window.

**Options**

* `show` Default: `true` - show the window as soon as it has been opened
* `x <Integer>` - the horizontal position of left side of the window (pixels)
* `y <Integer>` - vertical window position (pixels)
* `width <Integer>` - the width of the window (pixels)
* `height <Integer>` - the height of the window (pixels)
* `animate <Boolean>` Default: `false` - animate the dimensional change. MacOS only, ignored on other OS's.
* `center <Boolean` - center the window upon opening
* `minWidth <Integer>` - window minimum width (pixels)
* `minHeight <Integer>` - window minimum height (pixels)
* `maxWidth <Integer>` - window maximum width (pixels)
* `maxHeight <Integer>` - window maximum height (pixels)
* `resizable <Boolean>` - window resizability
* `movable <Boolean>` - window movability
* `minimizable <Boolean>` - window minimizability
* `maximizable <Boolean>` - window maximizability
* `closable <Boolean>` - window closability
* `focusable <Boolean>` - window focusability
* `alwaysOnTop <Boolean>` - Set window to always be on top
* `fullscreen <Boolean>` - Set window to fullscreen upon open
* `kiosk <Boolean>` - Set window to enter kiosk mode upon open
* `autoHideMenuBar <Boolean>` - Hide menu bar unless Alt key is pressed (Linux, Windows)
* `hasShadow <Boolean>` - Set window shadow
* `opacity <Number>` - Set window opacity (0.0 - 1.0) (Windows, macOS)
* `transparent <Boolean>` - Set window transparency
* `backgroundColor <String>` Default: `'#FFF'` - window default background color. Hex, RGB, RGBA, HSL HSLA, CSS color

### `const success = await win.close()`

Resolves to: `<Boolean>`

Close the window.

### `const success = await win.show()`

Resolves to: `<Boolean>`

Show the window.

### `const success = await win.hide()`

Resolves to: `<Boolean>`

Hide the window.

### `const success = await win.focus(options <Object>)`

Resolves to: `<Boolean>`

Focus the window.

**Options**

* `steal` Default: `true` - brings the window to the foreground and attempts to take focus, even if another application is currently active, or the window is hidden or minimized.

### `const success = await win.blur()`

Resolves to: `<Boolean>`

Blur the window.

### `const success = await win.minimize()`

Resolves to: `<Boolean>`

Minimize the window.

### `const success = await win.maximize()`

Resolves to: `<Boolean>`

Maximize the window.

### `const success = await win.restore()`

Resolves to: `<Boolean>`

Unmaximize/unminimize the window if it is currently maximized/minimized.

### `const sourceId = await win.getMediaSourceId()`

Resolves to: `<String>`

Correlates to the `id` property of objects in the array returned from [ui.media.desktopSources](#const-sources---await-appmediadesktopsources-options).

**References**

* [ui.media.desktopSources](#const-sources--await-appmediadesktopsourcesoptions-object)
* https://www.electronjs.org/docs/latest/api/browser-window#wingetmediasourceid

### `await win.send(...args)`

Send arguments to the window. They will be serialized with `JSON.stringify`.

### `const found = await win.find(options <Object>)`

Resolves to: `<Found> extends <streamx.Readable>`

Find and select text, emit matches as data events.

**Options**
* text `<String>` - search term
* forward `<Boolean>` - search forward (`true`) or backward (`false`). Defaults `true`.
* matchCase `<Boolean>`  - case-sensitivity. Default `false`.

#### `await found.proceed()`

Find & select next match, emit result as stream data.

#### `await found.clear()`

Stop search and clear matching text selection. Implies destroy.

#### `await found.keep()`

Stop search and convert matching text selection to text highlight. Implies destroy.

#### `await found.activate()`

Stop search and simulate a click event on the selected match. Implies destroy.


### `const dimensions = await win.dimensions()`

Resolves to: `{x <Integer>, y <Integer>, width <Integer>, height <Integer>} | null`.

The height, width, horizontal (`x`), vertical (`y`) position of the window relative to the screen.

All units are (pixels)

If the window is closed this will resolve to `null`.

**References**

* [await win.dimensions(options)](#await-windimensionsoptions-object)

### `await win.dimensions(options <Object>)`

```js
const win = new ui.Window('./some.html', {
  x: 10,
  y: 450,
  width: 300,
  height: 350
})

await win.open()
await new Promise((resolve) => setTimeout(resolve, 1000))

await win.dimensions({
  x: 20,
  y: 50,
  width: 550,
  height: 300,
  animate: true // only has an effect on macOS
})

```

Sets the dimensions of the window.

**Options**

* `x <Integer>` - the horizontal position of left side of the window (pixels)
* `y <Integer>` - the vertical position of the top of the window (pixels)
* `width <Integer>` - the width of the window (pixels)
* `height <Integer>` - the height of the window (pixels)
* `animate <Boolean>` Default: `false` - animate the dimensional change. MacOS only, ignored on other OS's.
* `position <String>` - may be `'center'` to set the window in the center of the screen or else `undefined`.

**References**

* [const dimensions = await win.dimensions()](#const-dimensions-await-windimensions)


### `const visible = await win.isVisible()`

Resolves to: `<Boolean>`

Whether the window is visible.

### `const minimized = await win.isMinimized()`

Resolves to: `<Boolean>`

Whether the window is minimized.

### `const maximized = await win.isMaximized()`

Resolves to: `<Boolean>`

Whether the window is maximized.

### `const closed = await win.isClosed()`

Resolves to: `<Boolean>`

Whether the window is closed.

### `const view = new ui.View(options <Object>)`

Desktop Applications only.

Create a new `View` instance. Views provide isolated content views. Frameless, chromeless windows that can be embedded inside other windows and views.

**Options**

* `x <Integer>` - the horizontal position of left side of the view (pixels)
* `y <Integer>` - vertical view position (pixels)
* `width <Integer>` - the width of the view (pixels)
* `height <Integer>` - the height of the view (pixels)
* `backgroundColor <String>` Default: `'#FFF'` - view default background color. Hex, RGB, RGBA, HSL HSLA, CSS color
* `autoresize <Object>` Default `{ width=true, height=true, vertical=false, horizontal=false }` - dimensions for the view to autoresize alongside. For example, if `width` is `true` and the view container increases/decreases in width, the view will increase/decrease in width at the same rate.

**References**

* https://www.electronjs.org/docs/latest/api/browser-view#viewsetautoresizeoptions-experimental
* https://www.electronjs.org/docs/latest/api/browser-view#viewsetbackgroundcolorcolor-experimental

### `view.on[ce]('message', (...args) => { })`
### `for await (const [ ...args ] of view)`

Receive a message from the view. The received `args` array is deserialized via `JSON.parse`.

**References**

* [`view.send()`](#await-viewsendargs)

### `const success = await view.open(options <Object>)`

Resolves to: `<Boolean>`

Open the view.

**Options**

* `x <Integer>` - the horizontal position of left side of the view (pixels)
* `y <Integer>` - vertical view position (pixels)
* `width <Integer>` - the width of the view (pixels)
* `height <Integer>` - the height of the view (pixels)
* `backgroundColor <String>` Default: `'#FFF'` - view default background color. Hex, RGB, RGBA, HSL HSLA, CSS color
* `autoresize <Object>` Default `{ width=true, height=true, vertical=false, horizontal=false }` - dimensions for the view to autoresize alongside. For example, if `width` is `true` and the view container increases/decreases in width, the view will increase/decrease in width at the same rate.

### `const success = await view.close()`

Resolves to: `<Boolean>`

Close the view.

### `const success = await view.show()`

Resolves to: `<Boolean>`

Show the view.

### `const success = await view.hide()`

Resolves to: `<Boolean>`

Hide the view.

### `const success = await view.focus()`

Resolves to: `<Boolean>`

Focus the view.

### `const success = await view.blur()`

Resolves to: `<Boolean>`

Blur the view.

### `const sourceId = await view.getMediaSourceId()`

Resolves to: `<String>`

Supplies the `id` property of objects in the array returned from [ui.media.desktopSources](#const-sources---await-appmediadesktopsources-options).

**References**

* [ui.media.desktopSources](#const-sources---await-appmediadesktopsources-options)
* https://www.electronjs.org/docs/latest/api/browser-window#wingetmediasourceid

### `await view.send(...args)`

Send arguments to the view. They will be serialized with `JSON.stringify`.

### `const found = await win.find(options <Object>)`

Resolves to: `<Found> extends <streamx.Readable>`

Find and select text, emit matches as data events.

**Options**
* text `<String>` - search term
* forward `<Boolean>` - search forward (`true`) or backward (`false`). Defaults `true`.
* matchCase `<Boolean>`  - case-sensitivity. Default `false`.

#### `await found.proceed()`

Find & select next match, emit result as stream data.

#### `await found.clear()`

Stop search and clear matching text selection. Implies destroy.

#### `await found.keep()`

Stop search and convert matching text selection to text highlight. Implies destroy.

#### `await found.activate()`

Stop search and simulate a click event on the selected match. Implies destroy.

### `const dimensions = await view.dimensions()`

Resolves to: `{x <Integer>, y <Integer>, width <Integer>, height <Integer>} | null`.

The height, width, horizontal (`x`), vertical (`y`) position of the window relative to the screen.

All units are (pixels)

If the Window is closed this will resolve to `null`.

**References**

* [await view.dimensions(options)](#await-viewdimensionsoptions-object)

### `await view.dimensions(options <Object>)`

```js
const view = new ui.View('./some.html', {
  x: 10,
  y: 450,
  width: 300,
  height: 350
})

await view.open()
await new Promise((resolve) => setTimeout(resolve, 1000))

await view.dimensions({
  x: 20,
  y: 50,
  width: 550,
  height: 300
})
```

Sets the dimensions of the view.

**Options**

* `x <Integer>` - the horizontal position of left side of the window (pixels)
* `y <Integer>` - the vertical position of the top of the window (pixels)
* `width <Integer>` - the width of the window (pixels)
* `height <Integer>` - the height of the window (pixels)


**References**

* [const dimensions = await view.dimensions()](#const-dimensions--await-viewdimensions)

### `const visible = await view.isVisible()`

Resolves to: `<Boolean>`

Whether the view is visible.

### `const closed = await view.isClosed()`

Resolves to: `<Boolean>`

Whether the view is closed.

### `const { self } = ui.Window`  `const { self } = ui.View`

> DEPRECATED use `ui.app`.

### `const { parent } = ui.Window`  `const { parent } = ui.View`

### `parent.on[ce]('message', (...args) => { })`
### `for await (const [ ...args ] of parent)`

Receive a message from the parent window or view. The received `args` array is deserialized via `JSON.parse`.

### `await parent.send(...args)`

Send arguments to the parent view or window. They will be serialized with `JSON.stringify`.


### `const success = await parent.focus()`

Resolves to: `<Boolean>`

Focus parent view or window.

### `const success = await parent.blur()`

Resolves to: `<Boolean>`

Blur parent view or window.

### `const success = await parent.show()`

Resolves to: `<Boolean>`

Show parent view or window.

### `const success = await parent.hide()`

Resolves to: `<Boolean>`

Hide parent view or window.

### `const sourceId = await parent.getMediaSourceId()`

Get the sourceId of the parent window or view.

**References**

* [win.getMediaSourceId()](#const-sourceId--await-wingetMediaSourceId)


### `const success = await parent.minimize()`

Resolves to: `<Boolean>`

Minimize parent window.

Throws a `TypeError` if `parent` is a view.

### `const success = await parent.maximize()`

Resolves to: `<Boolean>`

Maximize parent window.

Throws a `TypeError` if `parent` is a view.

### `const success = await parent.restore()`

Resolves to: `<Boolean>`

Unmaximize/unminimize the parent window if it is currently maximized/minimized.

Throws a `TypeError` if `parent` is a view.

### `const success = await parent.close()`

Resolves to: `<Boolean>`

Closes the parent view or window.

### `const isVisible = await parent.isVisible()`

Resolves to: `<Boolean>`

Whether the parent window or view is visible.

### `const isMaximized = await parent.isMaximized()`
Resolves to: `<Boolean>`

Whether the parent window is maximized. Throws a `TypeError` if `parent` is a view.


### `const isMinimized = await parent.isMinimized()`

Resolves to: `<Boolean>`

Whether the parent window is minimized. Throws a `TypeError` if `parent` is a view.

### `const found = await parent.find(options <Object>)`

Resolves to: `<Found> extends <streamx.Readable>`

Find and select text, emit matches as data events.

**Options**
* text `<String>` - search term
* forward `<Boolean>` - search forward (`true`) or backward (`false`). Defaults `true`.
* matchCase `<Boolean>`  - case-sensitivity. Default `false`.

#### `await found.proceed()`

Find & select next match, emit result as stream data.

#### `await found.clear()`

Stop search and clear matching text selection. Implies destroy.

#### `await found.keep()`

Stop search and convert matching text selection to text highlight. Implies destroy.

#### `await found.activate()`

Stop search and simulate a click event on the selected match. Implies destroy.

## Graphical User Interface Options

GUI options for an application are set in the application `package.json` `pear.gui` field.

### `width <Number>`

Window width (pixels).

### `height <Number>`

Window height (pixels).

### `x <Number>`

Horizontal window position (pixels).

### `y <Number>`

Vertical window position (pixels).

### `minWidth <Number>`

Window minimum width (pixels).

### `minHeight <Number>`

Window minimum height (pixels).

### `maxWidth <Number>`

Window maximum width (pixels).

### `maxHeight <Number>`

Window maximum height (pixels).

### `center <Boolean>` (default: `false`)

Center window.

### `resizable <Boolean>` (default: `true`)

Window resizability.

### `movable <Boolean>` (default: `true`)

Window movability.

### `minimizable <Boolean>` (default: `true`)

Window minimizability.

### `maximizable <Boolean>` (default: `true`)

Window maximizability.

### `closable <Boolean>` (default: `true`)

Window closability.

### `focusable <Boolean>` (default: `true`)

Window focusability.

### `alwaysOnTop <Boolean>` (default: `false`)

Set window to always be on top.

### `fullscreen <Boolean>` (default: `false`)

Set window to fullscreen on start.

### `kiosk <Boolean>` (default: `false`)

Set window to enter kiosk mode on start.

### `autoHideMenuBar <Boolean>` (default: `false`)

Hide menu bar unless Alt key is pressed (Linux, Windows).

### `hasShadow <Boolean>` (default: `true`)

Window shadow.

### `opacity <Number>` (default: `1`)

Set window opacity (0.0 - 1.0) (Windows, macOS).

### `transparent <Boolean>` (default: `false`)

Enable transparency. Must be set for opacity to work.

### `backgroundColor <String>` (default: "#000" non-transparent, "#00000000" transparent)

Background color (Hex, RGB, RGBA, HSL, HSLA, CSS color).

## Web APIs

Most [Web APIs](https://developer.mozilla.org/en-US/docs/Web/API) will work as-is.

This section details deviations in behavior from and notable aspects of Web APIs as they relate to `pear-electron`.

### `window.open`

The [`window.open`](https://developer.mozilla.org/en-US/docs/Web/API/Window/open) Web API function will ignore all arguments except for the URL parameter.

In browsers, `window.open` opens a new browser window. The opened window belongs to the same browser from which `window.open` is called.

With `pear-electron` UI Library, `window.open` loads the URL in the **default system browser**. It does *not* create a new application window (use `Pear.Window` to create application windows).

Therefore Pear's `window.open` only supports a single URL argument. The `target` and `windowFeatures` parameters that browsers support are discarded.

### Scripts and Modules

Like browsers, there is no support for CommonJS (e.g. the `require` function as used by Node.js is not supported in Pear Applications).

Like browsers, there is support for native EcmaScript Modules (ESM). A JavaScript Script has no module capabilities. A JavaScript Module has ESM capabilities.

Use `<script type="module" src="path/to/my-file.js">` to load a JavaScript Module.

Use `<script src="path/to/my-file.js">` to load a JavaScript Script.

## Libraries

### `pear-electron/api`

Function that takes a base Pear API class and extends it with pear-electron APIs. Only really useful when working with spoofed/mock Pear global in ui tests.


## Development

The `pear-electron` library is a Pear User Interface Runtime Library, as such `pear-electron` (and any Pear UI Lib.) is multifaceted and behaves differently depending on context.

* When loaded into a UI,  `pear-electron` is the UI API
* When loaded into non-UI (i.e app entrypoint js file), `pear-electron` is the runtime initializor
  * When there is no runtime binary on the system, `pear-electron` performs bootstrapping of the UI runtime executable, into `<pear-dir>/interfaces/pear-electron/<semver>`
* The `pear-electron` repo is also self-bootstrapping and generates the runtime drive (with `by-arch`, `prebuilds` and `boot.bundle`), which can then be staged with Pear. The pear link for the staged `pear-electron` contents in `pear-electron` `package.json` `pear.gui.runtime` field is then set, with fork and length included. This locks runtime builds for a given semver to a specific runtime drive checkout.
  * This is what `pear-electron` bootstraps from during `runtime.ready()`.


# LICENSE

Apache 2.0
