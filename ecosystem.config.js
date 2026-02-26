module.exports = {
  apps: [
    {
      name: 'testmkt-backend',
      cwd: '/home/user1/Production/3_community/8_Tester/backend',
      script: '/home/user1/Production/3_community/8_Tester/backend/venv/bin/uvicorn',
      args: 'main:app --host 0.0.0.0 --port 5108',
      interpreter: 'none',
      env: {
        PYTHONPATH: '/home/user1/Production/3_community/8_Tester/backend',
      },
      watch: false,
      autorestart: true,
    },
    {
      name: 'testmkt-frontend',
      cwd: '/home/user1/Production/3_community/8_Tester/frontend',
      script: 'npx',
      args: 'serve -s dist -l 5008',
      interpreter: 'none',
      watch: false,
      autorestart: true,
    },
  ],
}
