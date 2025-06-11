# Developing Pear UI Integration Libraries

This guide covers the development, testing and releasing workflow for Pear UI Integration Libraries like **pear-electron**. It is written generically so it can be adapted to new Pear UI integration libraries as they are created.

---

## What is pear-electron?

**pear-electron** is a Pear UI Integration Library designed to be consumed as a dependency by Pear applications. It bundles UI assets and logic for Electron-based Pear apps, delivering a seamless UI integration experience. 

---

## Testing pear-electron in a Consuming App
Changes to files included in the **boot.bundle** require a rebuild and repackaging so the consuming Pear application can bootstrap the latest UI code.

### Local Development

**pear-electron** is a Pear UI Integration Library, and as such is consumed as a dependency by Pear applications. The following flow is recommended to test local changes in a consuming Pear app.

A template Pear application for testing can be created:

```bash
pear init pear://electron/template -y
npm install
```

With the UI Library as the current working directory, dependencies can be installed.

```bash
cd path/to/local/pear-electron
npm install
```

After making and saving changes to the UI Library, the library's bundles need to be rebuilt, as they are the assets transferred when bootstrapping to a given version.

```bash
npm run prestage
```

The bootstrap link in the package.json ```pear``` field is the source from which Pear bootstraps the UI Library.

After rebuilding, the UI Library can be staged and the bootstrap field replaced with the stage link, version, and release using the format ```pear://release.version.link```.

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

Based on the output, the bootstrap link in package.json should be updated as follows:

```js
"pear": {
    "bootstrap": "pear://0.24779.dqgs5prptqozgwzanes31atf1imzbf5dfg4tgpgkp5mke83oziyy",
    ...
  },
```

The updated UI Library can now be packed into a distributable archive, which includes the new bootstrap link in its package.json.

```bash #
npm pack
# ...
# pear-electron-1.4.15.tgz
```

With the test app directory as the working location, the packed library can now be installed.

```bash #
cd path/to/electron-template
npm install path/to/local/pear-electron/pear-electron-1.4.15.tgz
```

Once installed, the test app can be started.

If the bootstrapped UI Library differs from the previously installed version, a sync message should appear on the first run of the app.

```bash
pear run .
# ✔ Synced 
# ...
```

## Releasing

To release the UI Library, the staged channel must be seeded and the packed library published to npm.

### Seeding

The previously staged channel should be seeded:

```bash
pear seed channel-name
```

### Publishing

The bootstrap link in the ```pear``` field of the package.json should always be verified for correctness before publishing.

After that, the version can be incremented and the library published to npm:

```bash
npm version minor
npm publish
```

Once published, the library can be installed via npm and Pear will bootstrap the UI Library using the provided bootstrap link in the package.json of the library.

This requires that the machine used to seed the library remains online in order for other machines to bootstrap the necessary resources.
