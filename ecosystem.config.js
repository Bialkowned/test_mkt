const path = require('path')
// GENERATED from the canonical manifest - do not hand-edit.
//   source: ~/pm2-configs/pm2-community.json
//   host:   Prod01 (192.168.1.225), user pjb
//   regenerated: 20260826-213428
//
// The canonical manifest is derived from the live pm2 definition by
// ~/pm2-configs/migrate_to_225.py, and is what Boris and
// `pm2 restart <ecosystem> --only <name>` both read. Change the manifest,
// then regenerate - editing this file alone will just drift again.

module.exports = {
  apps: [
    {
      name: 'testmkt-backend',
      cwd: path.join(__dirname, './backend'),
      script: path.join(__dirname, './backend/venv/bin/python'),
      interpreter: 'none',
      args: '-m uvicorn main:app --host 127.0.0.1 --port 5108',
      env: {
        NODE_ENV: 'production',
        PORT: '5108'
      },
      autorestart: true,
      max_memory_restart: '500M',
    },
    {
      name: 'testmkt-frontend',
      cwd: path.join(__dirname, './frontend'),
      script: '/usr/bin/npx',
      interpreter: '/usr/bin/node',
      args: 'serve -s dist -l tcp://127.0.0.1:5008',
      env: {
        NODE_ENV: 'production',
        PORT: '5008'
      },
      autorestart: true,
      max_memory_restart: '300M',
    },
  ],
};
