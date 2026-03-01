const { app, BrowserWindow } = require('electron');
console.log('type of app:', typeof app);
app.whenReady().then(() => {
  console.log('app ready');
  app.quit();
});
