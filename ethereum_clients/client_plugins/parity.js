const HOME = require('os').homedir()
let BASE
switch (process.platform) {
  case 'win32': {
    BASE = `${process.env.USERPROFILE}/AppData/Roaming/Parity/Ethereum`
    break
  }
  case 'linux': {
    BASE = '~/.local/share/io.parity.ethereum'
    break
  }
  case 'darwin': {
    // WARNING don't just use ~/Library/.. here
    BASE = `${HOME}/Library/Application Support/io.parity.ethereum`
    break
  }
  default: {
  }
}

const IPC_PATH = `${BASE}/jsonrpc.ipc`

module.exports = {
  type: 'client',
  order: 2,
  displayName: 'Parity',
  name: 'parity',
  // repository: 'https://github.com/paritytech/parity-ethereum'
  repository: 'https://github.com/PhilippLgh/EthCapetownWorkshop',
  prefix: `${process.platform}`, // filter github assets
  binaryName: process.platform === 'win32' ? 'parity.exe' : 'parity',
  settings: {
    network: {
      label: 'Network',
      default: 'mainnet',
      options: [
        { value: 'mainnet', label: 'Main', flag: '--chain main' },
        {
          value: 'ropsten',
          label: 'Ropsten (testnet)',
          flag: '--chain ropsten'
        },
        { value: 'kovan', label: 'Kovan (testnet)', flag: '--chain kovan' },
        { value: 'classic', label: 'Ethereum Classic', flag: '--chain classic' }
      ]
    },
    syncMode: {
      label: 'Sync Mode',
      default: 'warp',
      options: [
        { value: 'warp', label: 'Warp', flag: '--warp' },
        { value: 'light', label: 'Light', flag: '--light' },
        { value: 'nowarp', label: 'Full', flag: '--no-warp' }
      ]
    },
    ipcPath: {
      label: 'IPC Path',
      default: IPC_PATH,
      flag: '--ipc-path %s'
    }
  },
  resolveIpc: logs => IPC_PATH,
}
