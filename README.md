# pear-electron

> Pear User-Interface Library for Electron

## Installation <a name="installation"></a>

```sh
npm install pear-electron
```

## Usage
Ensure the `package.json` `pear` configuration object contains a `pre` field pointing to `pear-electron/pre`.

```js
{
  "pear": {
    "pre": "pear-electron/pre"
  }
}
```

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

Given an `index.html` containing `<script src="./app.js"></script>` in `app.js` import `pear-electron` User Interface API:

```js
import ui from 'pear-electron'


```

## Application Configuration <a name="application-configuration"></a>

Set the [`pear.pre`](https://docs.pears.com/configuration#pear-pre) to `pear-electron/pre` (or ensure that it's imported at the top of any alternative pre script).


```json
{
  "pear": {
    "pre": "pear-electron/pre"
  }
}

```

Prior to run from disk and prior to run from key, the `pear-electron/pre` script automatically adjusts application configuration to include runtime binary [`pear.assets`](https://docs.pears.com/configuration#pear-assets) as well as adding statically analyzed script tags as [`pear.stage.entrypoints`](https://docs.pears.com/configuration#pear-stage-entrypoints) from the [`pear.gui.main`](#pear-gui-main) HTML entrypoint.

The application `package.json` `pear` field can also define its own [`pear.assets`](https://docs.pears.com/configuration#pear-assets).

## Initialization API <a name="initialization-api"></a>

### `new Runtime() -> runtime` <a name="new-runtime"></a>

Create the runtime instances with `new Runtime()`.

### `runtime.ready()` <a name="runtime-ready"></a>

Prepare the runtime, runtime binaries for the runtime version may be bootstrapped peer-to-peer at this point. This only runs once per version and any prior bootstraps can be reused for subsequent versions where state hasn't changed. In a production scenario any bootstrapping would be performed in advance by the application distributable.

### `runtime.start(opts)` <a name="runtime-start"></a>

Opens the UI. 

#### Options

* `bridge` - An instance of [`pear-bridge`](https://github.com/holepunchto/pear-bridge).

## User-Interface API <a name="user-interface-api"></a>

Inside the `pear-electron` runtime desktop application, pear-electron resolves to a UI control API.

**index.html**:
```html
<script src="./app.js" type="module"><script>
```

**app.js**:
```js
import ui from 'pear-electron'
// do something with ui:
setTimeout(async () => { await ui.app.focus({ steal: true }) })
```

> NOTE: naming the import `ui` instead of `PearElectron` is intentional, for two reasons. The `pear-electron` import resolves to a runtime start library or a User Interface library depending on environment and using `Runtime` and `ui` as assigned names means switching out `pear-electron` with an equivalent alternative only involves changing the two `pear-electron` import specifiers.

### `ui.app <Object>` <a name="ui-app"></a>

UI Application controls

### `const success = await ui.app.focus([options <Object>])` <a name="ui-app-focus"></a>

Resolves to: `<Boolean>`

Foreground current view or window.

**Options**

* `steal` Default: `false` -  focus input as well as foregrounding 

### `const success = await ui.app.blur()` <a name="ui-app-blur"></a>

Resolves to: `<Boolean>`

Blur current view or window.

### `const success = await ui.app.show()` <a name="ui-app-show"></a>

Resolves to: `<Boolean>`

Show current view or window.

### `const success = await ui.app.hide()` <a name="ui-app-hide"></a>

Resolves to: `<Boolean>`

Hide current view or window.

#### `const success = await ui.app.badge(count <Integer|null>)` <a name="ui-app-badge"></a>

Resolves to: `<Boolean>`

Set the badge number for the application on desktop for Linux & MacOS. Setting the `count` to `0` will hide the badge while `null` will display a plain dot on MacOS only.

Returns a `Boolean` promise for whether the call succeeded.

#### `const untray = await ui.app.tray(options <Object>[, listener <Function>])` <a name="ui-app-tray"></a>

Resolves to: `<Function>`

Configure a tray icon for the application. 

This method will return a promise which resolves to an `untray()` function for removing the tray.

The `listener` function is triggered whenever a menu item or the tray icon is clicked. It receives a single argument `key` that represents the menu item `key` that was clicked or the special value of `'click'` for when the menu icon itself was clicked. If no `listener` function is provided, a default listener will show the application window when triggered with `'click'` or `'show'` and quits with `'quit'`.

A Pear application should set `pear.gui.closeHide` option to `true` in `package.json` `pear` options object when using `ui.app.tray`.

WARNING: Linux tray support varies which can cause scenarios where the application's tray doesn't work and closing the app will be hidden and inaccessible. Using a tray and `closeHide` on Linux is not recommended. Set `pear.gui.linux.closeHide` option to `false` in `package.json` `pear` options object.

**Options**

* `icon <String>` Default: The Pear icon - The path for icon for the tray
  relative to the project root. Supported formats: PNG & JPEG
* `menu <Object>` Default: ``{ show: `Show ${Pear.app.name}`, quit: 'Quit' }`` - The
  tray menu items. Each property of the object is the `key` passed to the
  `listener` and whose value is the text displayed in the menu.
* `os <Object>` Default: `{ win32: true, linux: true, darwin: true  }` - which
  platforms support using the tray menu. The platform is checked via the
  `process.platform` value.

### `const sourceId = await ui.app.getMediaSourceId()` <a name="ui-app-getmediasourceid"></a>

Get the sourceId of the current window or view.

### `const success = await ui.app.minimize()` <a name="ui-app-minimize"></a>

Resolves to: `<Boolean>`

Minimize current window.

### `const success = await ui.app.maximize()` <a name="ui-app-maximize"></a>

Resolves to: `<Boolean>`

Maximize current window.

### `const success = await ui.app.restore()` <a name="ui-app-restore"></a>

Resolves to: `<Boolean>`

Unmaximize/unminimize the current window if it is currently maximized/minimized.

### `const success = await ui.app.close()` <a name="ui-app-close"></a>

Resolves to: `<Boolean>`

Closes the current view or window.


### `const isVisible = await ui.app.isVisible()` <a name="ui-app-isvisible"></a>

Resolves to: `<Boolean>`

Whether the current window or view is visible.

### `const isMaximized = await ui.app.isMaximized()` <a name="ui-app-ismaximized"></a>

Resolves to: `<Boolean>`

### `const isMinimized = await ui.app.isMinimized()` <a name="ui-app-isminimized"></a>

Resolves to: `<Boolean>`

### `const found = await ui.app.find(options <Object>)` <a name="ui-app-find"></a>

Resolves to: `<Found> extends <streamx.Readable>`

Find and select text, emit matches as data events.

**Options**
* text `<String>` - search term
* forward `<Boolean>` - search forward (`true`) or backward (`false`). Defaults `true`.
* matchCase `<Boolean>`  - case-sensitivity. Default `false`.

#### `await found.proceed()` <a name="found-proceed"></a>

Find & select next match, emit result as stream data.

#### `await found.clear()` <a name="found-clear"></a>

Stop search and clear matching text selection. Implies destroy.

#### `await found.keep()` <a name="found-keep"></a>

Stop search and convert matching text selection to text highlight. Implies destroy.

#### `await found.activate()` <a name="found-activate"></a>

Stop search and simulate a click event on the selected match. Implies destroy.

### `ui.media <Object>` <a name="ui-media"></a>

Media interface

#### `const status = await ui.media.status.microphone()` <a name="ui-media-status-microphone"></a>

Resolves to: `<String>`

If access to the microphone is available, resolved value will be `'granted'`.

Any other string indicates lack of permission. Possible values are `'granted'`, `'not-determined'`, `'denied'`, `'restricted'`, `'unknown'`.

#### `const status = await ui.media.status.camera()` <a name="ui-media-status-camera"></a>

Resolves to: `<String>`

If access to the camera is available, resolved value will be `'granted'`.

Any other string indicates lack of permission. Possible values are `'granted'`, `'not-determined'`, `'denied'`, `'restricted'`, `'unknown'`.

#### `const status = await ui.media.status.screen()` <a name="ui-media-status-screen"></a>

Resolves to: `<String>`

If access to the screen is available, resolved value will be `'granted'`.

Any other string indicates lack of permission. Possible values are `'granted'`, `'not-determined'`, `'denied'`, `'restricted'`, `'unknown'`.

#### `const success = await ui.media.access.microphone()` <a name="ui-media-access-microphone"></a>

Resolves to: `<Boolean>`

Request access to the microphone. Resolves to `true` if permission is granted.

#### `const success = await ui.media.access.camera()` <a name="ui-media-access-camera"></a>

Resolves to: `<Boolean>`

Request access to the camera. Resolves to `true` if permission is granted.

#### `const success = await ui.media.access.screen()` <a name="ui-media-access-screen"></a>

Resolves to: `<Boolean>`

Request access to screen sharing. Resolves to `true` if permission is granted.

#### `const sources = await ui.media.desktopSources(options <Object>)` <a name="ui-media-desktopsources"></a>

Captures available desktop sources. Resolves to an array of objects with shape `{ id <String>, name <String>, thumbnail <NativeImage>, display_id <String>, appIcon <NativeImage> }`. The `id` is the window or screen identifier. The `name` is the window title or `'Screen <index>'` in multiscreen scenarios or else `Entire Screen`. The `display_id` identifies the screen. The thumbnail is a scaled down screen capture of the window/screen.

**Options**

* `types <Array<String>>` - Default: `['screen', 'window']`. Filter by types. Types are `'screen'` and `'window'`.
* `thumbnailSize <Object>` - Default: `{width: 150, height: 150}`. Set thumbnail scaling (pixels)
* `fetchWindowIcons <Boolean>` - Default: `false`. Populate `appIcon` with Window icons, or else `null`.

**See Also**

* [app.getMediaSourceId()](#app-getmediasourceid)
* [view.getMediaSourceId()](#view-getmediasourceid)
* [win.getMediaSourceId()](#win-getmediasourceid)
* [parent.getMediaSourceId()](#parent-getmediasourceid)
* https://www.electronjs.org/docs/latest/api/desktop-capturer#desktopcapturergetsourcesoptions
* https://www.electronjs.org/docs/latest/api/structures/desktop-capturer-source
* [`<NativeImage>`](https://www.electronjs.org/docs/latest/api/native-image)

Exits the process with the provided exit code.

### `const win = new ui.Window(entry <String>, options <Object>)` <a name="ui-window"></a>

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

### `win.on[ce]('message', (...args) => { })` <a name="win-recieve-messages"></a>
### `for await (const [ ...args ] of win)`

Receive a message from the window. The received `args` array is deserialized via `JSON.parse`.

### `const success = await win.open(options <Object>)` <a name="win-open">

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

### `const success = await win.close()` <a name="win-close"></a>

Resolves to: `<Boolean>`

Close the window.

### `const success = await win.show()` <a name="win-show"></a>

Resolves to: `<Boolean>`

Show the window.

### `const success = await win.hide()` <a name="win-hide"></a>

Resolves to: `<Boolean>`

Hide the window.

### `const success = await win.focus([options <Object>])` <a name="win-focus"></a>

Resolves to: `<Boolean>`

Focus the window.

**Options**

* `steal` Default: `true` - 

### `const success = await win.blur()` <a name="win-blur"></a>

Resolves to: `<Boolean>`

Blur the window.

### `const success = await win.minimize()` <a name="win-minimize"></a>

Resolves to: `<Boolean>`

Minimize the window.

### `const success = await win.maximize()` <a name="win-maximize"></a>

Resolves to: `<Boolean>`

Maximize the window.

### `const success = await win.restore()` <a name="win-restore"></a>

Resolves to: `<Boolean>`

Unmaximize/unminimize the window if it is currently maximized/minimized.

### `const sourceId = await win.getMediaSourceId()`  <a name="win-getmediasourceid"></a>

Resolves to: `<String>`

Correlates to the `id` property of objects in the array returned from [ui.media.desktopSources](#ui-media-desktopsources).

### `await win.send(...args)`  <a name="win-send"></a>

Send arguments to the window. They will be serialized with `JSON.stringify`.

### `const found = await win.find(options <Object>)`  <a name="win-find"></a>

Resolves to: `<Found> extends <streamx.Readable>`

Find and select text, emit matches as data events.

**Options**
* text `<String>` - search term
* forward `<Boolean>` - search forward (`true`) or backward (`false`). Defaults `true`.
* matchCase `<Boolean>`  - case-sensitivity. Default `false`.

#### `await found.proceed()` <a name="win-find-found-proceed"></a>

Find & select next match, emit result as stream data.

#### `await found.clear()` <a name="win-find-found-clear"></a>

Stop search and clear matching text selection. Implies destroy.

#### `await found.keep()` <a name="win-find-found-keep"></a>

Stop search and convert matching text selection to text highlight. Implies destroy.

#### `await found.activate()` <a name="win-find-found-activate"></a>

Stop search and simulate a click event on the selected match. Implies destroy.

### `const dimensions = await win.dimensions([options <Object>])` <a name="win-dimensions"></a>

When options object is not provided, behaves as a getter and resolves to a a bounds object.

Resolves to: `{x <Integer>, y <Integer>, width <Integer>, height <Integer>} | null`.

The height, width, horizontal (`x`), vertical (`y`) position of the window relative to the screen.

All units are (pixels)

If the window is closed this will resolve to `null`.

When options object is provided, behaves as a setter and resolves to `undefined`.

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

### `const visible = await win.isVisible()` <a name="win-isvisible"></a>

Resolves to: `<Boolean>`

Whether the window is visible.

### `const minimized = await win.isMinimized()` <a name="win-isminimized"></a>

Resolves to: `<Boolean>`

Whether the window is minimized.

### `const maximized = await win.isMaximized()` <a name="win-ismaximized"></a>

Resolves to: `<Boolean>`

Whether the window is maximized.

### `const closed = await win.isClosed()` <a name="win-isclosed"></a>

Resolves to: `<Boolean>`

Whether the window is closed.

### `const view = new ui.View(options <Object>)` <a name="ui-view"></a>

Desktop Applications only.

Create a new `View` instance. Views provide isolated content views. Frameless, chromeless windows that can be embedded inside other windows and views.

**Options**

* `x <Integer>` - the horizontal position of left side of the view (pixels)
* `y <Integer>` - vertical view position (pixels)
* `width <Integer>` - the width of the view (pixels)
* `height <Integer>` - the height of the view (pixels)
* `backgroundColor <String>` Default: `'#FFF'` - view default background color. Hex, RGB, RGBA, HSL HSLA, CSS color
* `autoresize <Object>` Default `{ width=true, height=true, vertical=false, horizontal=false }` - dimensions for the view to autoresize alongside. For example, if `width` is `true` and the view container increases/decreases in width, the view will increase/decrease in width at the same rate.


* https://www.electronjs.org/docs/latest/api/browser-view#viewsetbackgroundcolorcolor-experimental

### `view.on[ce]('message', (...args) => { })` <a name="view-recieve-messages"></a>
### `for await (const [ ...args ] of view)`

Receive a message from the view. The received `args` array is deserialized via `JSON.parse`.



### `const success = await view.open(options <Object>)` <a name="view-open"></a>

Resolves to: `<Boolean>`

Open the view.

**Options**

* `x <Integer>` - the horizontal position of left side of the view (pixels)
* `y <Integer>` - vertical view position (pixels)
* `width <Integer>` - the width of the view (pixels)
* `height <Integer>` - the height of the view (pixels)
* `backgroundColor <String>` Default: `'#FFF'` - view default background color. Hex, RGB, RGBA, HSL HSLA, CSS color
* `autoresize <Object>` Default `{ width=true, height=true, vertical=false, horizontal=false }` - dimensions for the view to autoresize alongside. For example, if `width` is `true` and the view container increases/decreases in width, the view will increase/decrease in width at the same rate.

### `const success = await view.close()` <a name="view-close"></a>

Resolves to: `<Boolean>`

Close the view.

### `const success = await view.show()` <a name="view-show"></a>

Resolves to: `<Boolean>`

Show the view.

### `const success = await view.hide()` <a name="view-hide"></a>

Resolves to: `<Boolean>`

Hide the view.

### `const success = await view.focus([options <Object>])` <a name="view-focus"></a>

Resolves to: `<Boolean>`

Foreground the view.

**Options**

* `steal` Default: `false` -  focus input as well as foregrounding 

### `const success = await view.blur()` <a name="view-blur"></a>

Resolves to: `<Boolean>`

Blur the view.

### `const sourceId = await view.getMediaSourceId()` <a name="view-getmediasourceid"></a>

Resolves to: `<String>`

Supplies the `id` property of objects in the array returned from [ui.media.desktopSources](#ui-media-desktopsources).

### `await view.send(...args)` <a name="view-send"></a>

Send arguments to the view. They will be serialized with `JSON.stringify`.

### `const found = await view.find(options <Object>)` <a name="view-find"></a>

Resolves to: `<Found> extends <streamx.Readable>`

Find and select text, emit matches as data events.

**Options**

* text `<String>` - search term
* forward `<Boolean>` - search forward (`true`) or backward (`false`). Defaults `true`.
* matchCase `<Boolean>`  - case-sensitivity. Default `false`.

#### `await found.proceed()` <a name="view-find-found-proceed"></a>

Find & select next match, emit result as stream data.

#### `await found.clear()` <a name="view-find-found-clear"></a>

Stop search and clear matching text selection. Implies destroy.

#### `await found.keep()` <a name="view-find-found-keep"></a>

Stop search and convert matching text selection to text highlight. Implies destroy.

#### `await found.activate()` <a name="view-find-found-activate"></a>

Stop search and simulate a click event on the selected match. Implies destroy.

### `const dimensions = await view.dimensions([options <Object>])` <a name="view-dimensions"></a>

When options object is not provided, behaves as a getter and resolves to a a bounds object.

Resolves to: `{x <Integer>, y <Integer>, width <Integer>, height <Integer>} | null`.

The height, width, horizontal (`x`), vertical (`y`) position of the window relative to the screen.

All units are (pixels)

If the parent window is closed this will resolve to `null`.

When options object is provided, behaves as a setter and resolves to `undefined`.

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

### `const visible = await view.isVisible()` <a name="view-isvisible"></a>

Resolves to: `<Boolean>`

Whether the view is visible.

### `const closed = await view.isClosed()` <a name="view-isclosed"></a>

Resolves to: `<Boolean>`

Whether the view is closed.

### `const { self } = ui.Window`  `const { self } = ui.View` <a name="deprecated-self"></a>

> DEPRECATED use `ui.app`.

### `const { parent } = ui.Window`  `const { parent } = ui.View` <a name="parent"></a>

### `parent.on[ce]('message', (...args) => { })` <a name="parent-receive-messages"></a>
### `for await (const [ ...args ] of parent)`

Receive a message from the parent window or view. The received `args` array is deserialized via `JSON.parse`.

### `await parent.send(...args)` <a name="parent-send"></a>

Send arguments to the parent view or window. They will be serialized with `JSON.stringify`.


### `const success = await parent.focus([options <Object>])` <a name="parent-focus"></a>

Resolves to: `<Boolean>`

Foreground parent view or window.

**Options**

* `steal` Default: `false` -  focus input as well as foregrounding 

### `const success = await parent.blur()` <a name="parent-blur"></a>

Resolves to: `<Boolean>`

Blur parent view or window.

### `const success = await parent.show()` <a name="parent-show"></a>

Resolves to: `<Boolean>`

Show parent view or window.

### `const success = await parent.hide()` <a name="parent-hide"></a>

Resolves to: `<Boolean>`

Hide parent view or window.

### `const sourceId = await parent.getMediaSourceId()` <a name="parent-getmediasourceid"></a>

Get the sourceId of the parent window or view.




### `const success = await parent.minimize()` <a name="parent-minimize"></a>

Resolves to: `<Boolean>`

Minimize parent window.

Throws a `TypeError` if `parent` is a view.

### `const success = await parent.maximize()` <a name="parent-maximize"></a>

Resolves to: `<Boolean>`

Maximize parent window.

Throws a `TypeError` if `parent` is a view.

### `const success = await parent.restore()` <a name="parent-restore"></a>

Resolves to: `<Boolean>`

Unmaximize/unminimize the parent window if it is currently maximized/minimized.

Throws a `TypeError` if `parent` is a view.

### `const success = await parent.close()` <a name="parent-close"></a>

Resolves to: `<Boolean>`

Closes the parent view or window.

### `const isVisible = await parent.isVisible()` <a name="parent-isvisible"></a>

Resolves to: `<Boolean>`

Whether the parent window or view is visible.

### `const isMaximized = await parent.isMaximized()` <a name="parent-ismaximized"></a>
Resolves to: `<Boolean>`

Whether the parent window is maximized. Throws a `TypeError` if `parent` is a view.


### `const isMinimized = await parent.isMinimized()` <a name="parent-isminimized"></a>

Resolves to: `<Boolean>`

Whether the parent window is minimized. Throws a `TypeError` if `parent` is a view.

### `const found = await parent.find(options <Object>)` <a name="parent-find"></a>

Resolves to: `<Found> extends <streamx.Readable>`

Find and select text, emit matches as data events.

**Options**
* text `<String>` - search term
* forward `<Boolean>` - search forward (`true`) or backward (`false`). Defaults `true`.
* matchCase `<Boolean>`  - case-sensitivity. Default `false`.

#### `await found.proceed()` <a name="parent-find-found-proceed"></a>

Find & select next match, emit result as stream data.

#### `await found.clear()` <a name="parent-find-found-clear"></a>

Stop search and clear matching text selection. Implies destroy.

#### `await found.keep()` <a name="parent-find-found-keep"></a>

Stop search and convert matching text selection to text highlight. Implies destroy.

#### `await found.activate()` <a name="parent-find-found-activate"></a>

Stop search and simulate a click event on the selected match. Implies destroy.

## Graphical User Interface Options <a name="pear-gui"></a>

GUI options for an application are set in the application `package.json` `pear.gui` field.

Example `package.json`:

```json
{
  "name": "my-app",
  "pear": {
    "gui": {
      "width": 800,
      "height": 600
    }
  }
}
```

### `pear.gui.width <Number>` <a name="pear-gui-width"></a>

Window width (pixels).

### `pear.gui.height <Number>` <a name="pear-gui-height"></a>

Window height (pixels).

### `pear.gui.x <Number>` <a name="pear-gui-x"></a>

Horizontal window position (pixels).

### `pear.gui.y <Number>` <a name="pear-gui-y"></a>

Vertical window position (pixels).

### `pear.gui.minWidth <Number>` <a name="pear-gui-minwidth"></a>

Window minimum width (pixels).

### `pear.gui.minHeight <Number>` <a name="pear-gui-minheight"></a>

Window minimum height (pixels).

### `pear.gui.maxWidth <Number>` <a name="pear-gui-maxwidth"></a>

Window maximum width (pixels).

### `pear.gui.maxHeight <Number>` <a name="pear-gui-maxheight"></a>

Window maximum height (pixels).

### `pear.gui.center <Boolean>` (default: `false`) <a name="pear-gui-center"></a>

Center window.

### `pear.gui.resizable <Boolean>` (default: `true`) <a name="pear-gui-resizable"></a>

Window resizability.

### `pear.gui.movable <Boolean>` (default: `true`) <a name="pear-gui-movable"></a>

Window movability.

### `pear.gui.minimizable <Boolean>` (default: `true`) <a name="pear-gui-minimizable"></a>

Window minimizability.

### `pear.gui.maximizable <Boolean>` (default: `true`) <a name="pear-gui-maximizable"></a>

Window maximizability.

### `pear.gui.closable <Boolean>` (default: `true`) <a name="pear-gui-closable"></a>

Window closability.

### `pear.gui.focusable <Boolean>` (default: `true`) <a name="pear-gui-focusable"></a>

Window focusability.

#### `pear.gui.closeHides <Boolean>` (default: `false`) <a name="pear-gui-closehides"></a>

Keep app running when all windows are closed.

WARNING: Linux tray support varies which can cause scenarios where the application's tray doesn't work and closing the app will be hidden and inaccessible. Using a tray and `closeHides` on Linux is not recommended.

### `pear.gui.alwaysOnTop <Boolean>` (default: `false`) <a name="pear-gui-alwaysontop"></a>

Set window to always be on top.

### `pear.gui.fullscreen <Boolean>` (default: `false`) <a name="pear-gui-fullscreen"></a>

Set window to fullscreen on start.

### `pear.gui.kiosk <Boolean>` (default: `false`) <a name="pear-gui-kiosk"></a>

Set window to enter kiosk mode on start.

### `pear.gui.autoHideMenuBar <Boolean>` (default: `false`) <a name="pear-gui-autohidemenubar"></a>

Hide menu bar unless Alt key is pressed (Linux, Windows).

### `pear.gui.hasShadow <Boolean>` (default: `true`) <a name="pear-gui-hasshadow"></a>

Window shadow.

### `pear.gui.opacity <Number>` (default: `1`) <a name="pear-gui-opacity"></a>

Set window opacity (0.0 - 1.0) (Windows, macOS).

### `pear.gui.transparent <Boolean>` (default: `false`) <a name="pear-gui-transparent"></a>

Enable transparency. Must be set for opacity to work.

### `pear.gui.backgroundColor <String>` (default: "#000" non-transparent, "#00000000" transparent) <a name="pear-gui-backgroundcolor"></a>

Background color (Hex, RGB, RGBA, HSL, HSLA, CSS color).

### `pear.gui.userAgent <string>` <a name="pear-gui-useragent"></a>

User Agent override to use when electron makes web requests.

#### `pear.gui[platform] <Object>` <a name="pear-gui-platform"></a>

Platform specific options can be set by nesting options under the platform name. For example the following sets the macOS version to not be resizable:

```json
{
  "pear": {
    "gui": {
      "darwin": {
        "resizable": false
      }
    }
  }
}
```

The following `platform`s are supported:

- `darwin`
- `linux`
- `win32`


## Web APIs <a name="web-apis"></a>

Most [Web APIs](https://developer.mozilla.org/en-US/docs/Web/API) will work as-is.

This section details deviations in behavior from and notable aspects of Web APIs as they relate to `pear-electron`.

### `window.open`

The [`window.open`](https://developer.mozilla.org/en-US/docs/Web/API/Window/open) Web API function will ignore all arguments except for the URL parameter.

In browsers, `window.open` opens a new browser window. The opened window belongs to the same browser from which `window.open` is called.

With `pear-electron` UI Library, `window.open` loads the URL in the **default system browser**. It does *not* create a new application window (use `Pear.Window` to create application windows).

Therefore Pear's `window.open` only supports a single URL argument. The `target` and `windowFeatures` parameters that browsers support are discarded.

### Scripts and Modules <a name="scripts-and-modules"></a>

Like browsers, there is no support for CommonJS (e.g. the `require` function as used by Node.js is not supported in Pear Applications).

Like browsers, there is support for native EcmaScript Modules (ESM). A JavaScript Script has no module capabilities. A JavaScript Module has ESM capabilities.

Use `<script type="module" src="path/to/my-file.js">` to load a JavaScript Module.

Use `<script src="path/to/my-file.js">` to load a JavaScript Script.

## Development <a name="development"></a>

The `pear-electron` library is a Pear User Interface Runtime Library, providing multiple capabilities:

* When loaded into a pear entrypoint JS file, `pear-electron` exports `runtime.js`, the runtime initializor.
* When loaded into electron, `pear-electron` exports a UI library that is injected via `Pear[Pear.constructor.UI]` inside the runtime build that becomes the asset defined on `pear.assets.ui` configuration. 
* The `pear-electron/pre` script provides autoconfiguration, it sets `pear.assets.ui` on the application per `pear.assets.ui` in the `pear-electron/package.json`.

The `pear-electron` repo is self-bootstrapping and generates the runtime drive with `by-arch`, `prebuilds` and `boot.bundle`, which can then be staged with Pear. 

```sh
npm run prestage
```

```sh
pear stage dev
```

Set the `package.json` `pear.assets.ui.link` to the versioned pear link (`pear://<fork>.<length>.<key>`) of the staged application. This means the `pear-electron/pre` of the next publish of `pear-electron` will autoconfigure the applications `pear.assets.ui` to the updated versioned pear link. This effectively locks runtime builds for a given SemVer to a specific runtime drive checkout.

To check a change with an application, use `npm pack` to get `tar.gz` archive and then install that archive into an application:

```sh
cd pear-electron
npm pack
cd ../some-pear-app
npm i ../pear-electron/name-of-the-tar.gz
```

Then run the app with the `-d` (development) and `--pre-io` flag (to see any output from the `pear-electron/pre` script).

```sh
pear run --pre-io -d . 
```

# LICENSE <a name="license"></a>

Apache 2.0
