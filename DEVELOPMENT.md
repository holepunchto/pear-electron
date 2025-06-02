# Developing Pear UI Integration Libraries

This guide covers the development and testing workflow for Pear UI Integration Libraries like **pear-electron**. It is written generically so you can adapt it to new Pear UI integration libraries you create.

---

## What is pear-electron?

**pear-electron** is a Pear UI Integration Library designed to be consumed as a dependency by Pear applications. It bundles UI assets and logic for Electron-based Pear apps, delivering a seamless UI integration experience. 

---

## Testing pear-electron in a Consuming App
Changes to files included in the **boot.bundle** require a rebuild and repackaging so the consuming Pear application can bootstrap the latest UI code.

### Local Development

**pear-electron** is a Pear UI Integration Library, and as such is consumed as a dependency by pear applications. Here is a recommended flow to test your local changes in another Pear app.

Create a template Pear application for testing.

```bash
pear init pear://electron/template -y
npm install
pear run .
```

Switch to your local **pear-electron** directory and install dependencies.

```bash
cd path/to/local/pear-electron
npm install
```

Then, rebuild your bundles whenever you make changes to **pear-electron** that you want to test in a UI app.

```bash
npm run prestage
```

The bootstrap link in package.json ```pear``` field is what pear bootstraps **pear-electron** from.

You can now stage the **pear-electron** rebuild and replace this with your stage link, version and release with the format ```pear://release.version.link```.

```bash
pear stage channel-name

# ...
#
# Latest version is now 24779 with release set to 0
#
# Use `pear release dev` to set release to latest version
#
# [ pear://dqgs5prptqozgwzanes31atf1imzbf5dfg4tgpgkp5mke83oziyy ]
```

Given the output your bootstrap link in package.json should look like:

```js
"pear": {
    "bootstrap": "pear://0.24779.dqgs5prptqozgwzanes31atf1imzbf5dfg4tgpgkp5mke83oziyy",
    ...
  },
```

Now you can pack your edited **pear-electron** library.

```bash #
npm pack
# ...
# pear-electron-1.4.15.tgz
```

And then switch to the dir of your test app you set up earlier and install the pack.

```bash #
cd path/to/electron-template
npm install path/to/local/pear-electron/pear-electron-1.4.15.tgz
```

After that you can start your test app.

If your installed **pear-electron** is now different than the previous one, you should see something like this on the first run of the app with the new pack:

```bash
pear run .
# ✔ Synced 
# ...
```

## Releasing

To release your edited **pear-electron** library, you can do so by seeding the channel you staged it on and releasing the library on npm.

### Seeding

Seed the channel you staged your edited **pear-electron** on earlier.

```bash
pear seed channel-name
```

Make sure your bootstrap link in the ```pear``` field of the package.json is correct.

After that you can adjust your version and publish on npm.

```bash
npm version minor
npm publish
```

Now anyone can install your library through npm and pear will bootstrap **pear-electron** through the provided bootstrap link.

This means that the seeder of your library needs to be online in order for other machines to bootstrap the necessary resources.
