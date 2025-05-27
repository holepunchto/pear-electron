### Testing pear-electron in another app
1. ```npm run prestage```
2. ```pear stage dev```
3. set pear.bootstrap in package.json to stage version (length) and link
    - e.g: ```"pear://[release].[version].[link]"```
    - -> ```"pear://0.2648.yceb7sjhgfzsnza7oc38hy3oxu9dhnywi3mzxdm9ubc48kjnxqgo"```
4. ```npm pack```
5. (in test app) -> ```npm i path/to/pack.tgz```

if everything went right the console should log "✔ Synced" before starting the app