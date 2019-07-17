const { EventEmitter } = require('events')
const path = require('path')
const createRenderer = require('../electron-shell')
const WindowManager = require('../WindowManager')
const {
  AppManager: PackageManager
} = require('@philipplgh/electron-app-manager')

const { getUserConfig } = require('../Config')
const UserConfig = getUserConfig()

const is = require('../utils/main/is')
const {
  checkConnection,
  getShippedGridUiPath,
  getCachePath
} = require('../utils/main/util')

const GRID_UI_CACHE = getCachePath('grid-ui')

// console.log('grid ui cache created at', GRID_UI_CACHE)

const gridUiManager = new PackageManager({
  repository: 'https://github.com/ethereum/grid-ui',
  auto: true, // this will automatically check for new packages...
  intervalMins: 60, // ...every 60 minutes. the first check will be after 1 minute though
  cacheDir: GRID_UI_CACHE, // updates are automatically downloaded to this path
  searchPaths: is.prod() ? [getShippedGridUiPath()] : undefined, // tell app-manager also to look for shipped packages
  logger: require('debug')('GridPackageManager'),
  policy: {
    onlySigned: false
  }
})

gridUiManager.on('update-downloaded', release => {
  console.log('a new grid-ui version was downloaded:', release.version)
  // TODO we can use this event to inform the user to restart
})

const getGridUiUrl = async () => {
  let useHotLoading = false
  const HOT_LOAD_URL = 'package://github.com/ethereum/grid-ui'
  if (is.dev()) {
    const PORT = '3080'
    const appUrl = `http://localhost:${PORT}/index.html`
    const isServerRunning = await checkConnection('localhost', PORT)
    /**
     * check if grid-ui is started and the server is running.
     * otherwise load latest grid-ui package from github ("hot-load")
     */
    if (isServerRunning) {
      return appUrl
    } else {
      console.log(
        'WARNING: grid ui webserver not running - fallback to hot-loading'
      )
      return HOT_LOAD_URL
    }
  } else {
    // production:
    if (useHotLoading) {
      return HOT_LOAD_URL
    } // else: use caching
    console.log('check for cached packages')
    let packagePath = ''
    try {
      // with the argument we can provide additional search paths besides cache
      const cached = await gridUiManager.getLatestCached()
      if (!cached) {
        console.warn(
          'WARNING: no cached packages found. fallback to hot-loading'
        )
        useHotLoading = true
      } else {
        console.log('package location', cached.location)
        packagePath = cached.location
      }
    } catch (error) {
      console.log('error during check', error)
    }

    // fallback necessary?
    if (useHotLoading || !packagePath) {
      return HOT_LOAD_URL
    }

    let appUrl = await gridUiManager.load(packagePath)
    console.log('app url: ' + appUrl)
    return appUrl
  }
}

class AppManager extends EventEmitter {
  constructor() {
    super()
  }
  async getAppsFromRegistries() {
    let apps = []
    try {
      const registries = UserConfig.getItem('registries', [])
      for (let index = 0; index < registries.length; index++) {
        const registry = registries[index]
        try {
          const result = await PackageManager.downloadJson(registry)
          apps = [...apps, ...result.apps]
        } catch (error) {
          console.log('could not load apps from registry:', registry, error)
        }
      }
    } catch (error) {
      console.log('could not load apps from registries', error)
    }
    return apps
  }
  getAppsFromAppsJson() {
    let apps = []
    try {
      const _apps = require('./apps.json')
      apps = [..._apps]
    } catch (error) {
      console.log('error: could not parse apps.json', error)
    }
    return apps
  }
  getAppsFromConfig() {
    let apps = []
    try {
      const _apps = UserConfig.getItem('apps', [])
      apps = [..._apps]
    } catch (error) {
      console.log('could not read user-defined apps', error)
    }
    return apps
  }
  // @deprecated
  getAvailableApps() {
    return this.getAppsFromAppsJson()
  }
  async getAllApps() {
    let apps = []
    const appsJson = await this.getAppsFromAppsJson()
    const appsConfig = await this.getAppsFromConfig()
    const appsRegistries = await this.getAppsFromRegistries()
    apps = [...appsJson, ...appsConfig, ...appsRegistries]
    return apps
  }
  async launch(app) {
    console.log('launch', app.name)

    if (app.id) {
      const win = WindowManager.getById(app.id)
      if (win) {
        win.show()
        return win.id
      }
    }

    if (app.name === 'grid-ui') {
      const { args } = app
      let appUrl = await getGridUiUrl()
      const { scope } = args
      const { client: clientName, component } = scope
      if (component === 'terminal') {
        appUrl = `file://${path.join(__dirname, '..', 'ui', 'terminal.html')}`
      }
      const clientDisplayName = 'Geth'
      let mainWindow = createRenderer(
        appUrl,
        {
          x: 400,
          y: 400,
          backgroundColor: component === 'terminal' ? '#1E1E1E' : '#ffffff'
        },
        {
          scope
        }
      )
      mainWindow.setMenu(null)
      /*
      mainWindow.webContents.openDevTools({
        mode: 'detach'
      })
      */
      mainWindow.setTitle('Ethereum Grid Terminal for ' + clientDisplayName)
      return mainWindow.id
    }

    let url = app.url || 'http://localhost:3000'
    const mainWindow = createRenderer(
      WindowManager.getMainUrl(),
      {},
      {
        url,
        isApp: true,
        app
      }
    )
  }
  hide(windowId) {
    return WindowManager.hide(windowId)
  }
}

const registerGlobalAppManager = () => {
  global.AppManager = new AppManager()
  return global.AppManager
}

module.exports.registerGlobalAppManager = registerGlobalAppManager

module.exports.AppManager = AppManager
