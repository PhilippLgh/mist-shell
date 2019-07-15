const { remote, shell } = require('electron')
const { dialog } = require('electron').remote
const AutoLaunch = require('auto-launch')

const gridAutoLauncher = new AutoLaunch({
  name: 'Grid'
})

const notify = (title, body) => {
  const notification = new Notification(title, { body })
  notification.onclick = () => {
    const window = remote.getCurrentWindow()
    if (window) {
      window.show()
    }
  }
}

const showOpenDialog = (
  pathType = 'file',
  selectMultiple = false,
  defaultPath
) => {
  return new Promise((resolve, reject) => {
    const options = {
      properties: ['showHiddenFiles']
    }
    if (pathType === 'directory') {
      options.properties.push('openDirectory')
    } else {
      options.properties.push('openFile')
    }
    if (selectMultiple) {
      options.properties.push('multiSelections')
    }
    if (defaultPath) {
      options.defaultPath = defaultPath
    }
    dialog.showOpenDialog(options, filePaths => {
      if (!filePaths || filePaths.length === 0) {
        reject('No selection')
        return
      }
      resolve(filePaths.join(','))
    })
  })
}

const openExternalLink = href => {
  shell.openExternal(href)
}

const getLaunchOnBoot = async () => {
  return gridAutoLauncher.isEnabled()
}

const setLaunchOnBoot = enable => {
  if (enable) {
    gridAutoLauncher.enable()
  } else {
    gridAutoLauncher.disable()
  }
}

module.exports = {
  notify,
  showOpenDialog,
  openExternalLink,
  getLaunchOnBoot,
  setLaunchOnBoot
}
