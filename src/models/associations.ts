import { User } from './User';
import { Game } from './Game';
import { Move } from './Move';

User.hasMany(Game, { as: 'createdGames', foreignKey: 'player1Id' });
User.hasMany(Game, { as: 'opponentGames', foreignKey: 'player2Id' });
User.hasMany(Game, { as: 'wonGames', foreignKey: 'winnerId' });
Game.belongsTo(User, { as: 'player1', foreignKey: 'player1Id' });
Game.belongsTo(User, { as: 'player2', foreignKey: 'player2Id' });
Game.belongsTo(User, { as: 'winner', foreignKey: 'winnerId' });
Game.hasMany(Move, { as: 'moves', foreignKey: 'gameId', onDelete: 'CASCADE' });
Move.belongsTo(Game, { as: 'game', foreignKey: 'gameId' });
Move.belongsTo(User, { as: 'player', foreignKey: 'playerId' });
User.hasMany(Move, { as: 'moves', foreignKey: 'playerId' });
