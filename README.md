---
# LokiMail Client                             
##### NOTE: This version is optimised for macOS.   
##### Before compiling, use the following commands 
##### &nbsp;
---
##### Install app dependencies
##### &nbsp;
``` JS
npm install
```
##### Find the below line of code in Package.js and edit the “–arch=” option, to build the app for Apple Silicon or Intel versions of macOS.
##### &nbsp;
``` JS
"package-mac": "electron-packager . --overwrite --platform=darwin --arch=arm64 --icon=app/assets/icons/icon.icns --prune=true --out=release-builds"
```
* ###### Apple Silicon => --arch=arm64
* ###### Intel => --arch=x64
##### Run the following command to build the app. (You must install the app dependencies before)
##### &nbsp;
``` JS
npm run package-mac
```