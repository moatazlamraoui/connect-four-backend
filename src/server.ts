import './config/env'; // must stay the first import: loads .env before anything reads process.env
import './models/associations';
import { app } from './app';
import { initializeDatabase } from './config/database';
import { GameService } from './services/GameService';

const port = Number(process.env.PORT || 3000);

async function start(): Promise<void> {
  await initializeDatabase();
  const timeoutWatcher = setInterval(() => {
    void GameService.settleAllExpiredGames().catch((error) => console.error('Timeout watcher error:', error));
  }, 1000);
  timeoutWatcher.unref();

  app.listen(port, () => {
    console.log(`Connect Four API is listening at http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start the application:', error);
  process.exit(1);
});
