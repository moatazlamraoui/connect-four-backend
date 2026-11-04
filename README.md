# Connect Four – Advanced Programming Exam Backend

REST API per l'esame di **Programmazione Avanzata A.A. 2025/2026**, realizzata con TypeScript, Express, Sequelize e SQLite. Il sistema gestisce partite Forza Quattro tra due utenti autenticati oppure tra un utente e l'elaboratore.

> Il repository contiene il codice sorgente, seed, test Jest, documentazione UML e una collection Postman. Prima della consegna Moodle occorre pubblicare questa cartella su un repository GitHub pubblico e inserire su Moodle l'URL e il commit esatto valutabile.

## 1. Obiettivo

Realizzare un backend che consenta di:

- registrare utenti e autenticarli tramite JWT firmati RS256;
- creare partite Human-vs-Human e Human-vs-AI;
- impedire a un utente di partecipare contemporaneamente a più di una partita attiva;
- validare le mosse, aggiornare la scacchiera e determinare vittoria, pareggio, abbandono o timeout;
- addebitare crediti frazionari secondo le tariffe indicate dal docente;
- esportare lo storico delle mosse in JSON o PDF e filtrarlo per date/periodo;
- fornire una classifica pubblica e le statistiche personali;
- consentire all'amministratore di impostare il nuovo saldo di un utente.

## 2. Tecnologie

| Tecnologia | Utilizzo |
|---|---|
| Node.js 20+ | Runtime |
| TypeScript | Linguaggio |
| Express | REST API e middleware |
| Sequelize 6 | ORM e relazioni |
| SQLite | RDBMS scelto |
| `connect4-ai` | Validazione delle colonne e mosse AI |
| `jsonwebtoken` | JWT RS256 |
| `bcryptjs` | Hash delle password |
| Zod | Validazione di body, params e query |
| PDFKit | Esportazione PDF |
| Jest + ts-jest | Test automatici |
| Docker Compose | Avvio riproducibile |

Per la logica Forza Quattro viene utilizzato il pacchetto `connect4-ai`, indicato tra le alternative nelle specifiche. La sua API documenta le classi `Connect4` e `Connect4AI`, il metodo `canPlay`, il metodo `play` e i livelli AI `easy`, `medium`, `hard`.

## 3. Installazione locale (Windows / PowerShell)

Prerequisiti: Node.js 20 o successivo e npm.

```powershell
# 1. Copiare .env.example in .env
Copy-Item .env.example .env

# 2. Installare le dipendenze
npm.cmd install

# 3. Generare una coppia di chiavi RSA per RS256 (se non esiste già)
npm.cmd run generate:keys:if-missing

# 4. Creare gli utenti iniziali
npm.cmd run seed

# 5. Avviare in sviluppo
npm.cmd run dev
```

Il server risponde su `http://localhost:3000`; health check: `GET http://localhost:3000/health`.

Per verificare la compilazione e i test:

```powershell
npm.cmd run build
npm.cmd test
```

### Utenti iniziali creati dal seed

| Ruolo | Email predefinita | Password predefinita |
|---|---|---|
| Admin | `admin@example.com` | `ChangeMe_Admin_2026!` |
| User | `alice@example.com` | `ChangeMe_User_2026!` |
| User | `bob@example.com` | `ChangeMe_User_2026!` |

Ogni utente del seed riceve `INITIAL_CREDITS` (10.00 per default). I valori possono essere modificati nel file `.env` **prima di eseguire il seed**. Le password di esempio devono essere sostituite prima di pubblicare o distribuire il progetto. Il seed non sovrascrive gli utenti già presenti.

La registrazione pubblica crea sempre un ruolo `user`; non è possibile assegnarsi il ruolo admin dal body HTTP.

## 4. Avvio con Docker Compose

Copiare `.env.example` in `.env` e modificare le password di seed. Quindi:

```powershell
docker compose up --build
```

Compose genera le chiavi RS256 nel file `.env` montato dal computer host se mancanti, esegue il seed e avvia il server. Il database viene conservato nel volume Docker `sqlite_data`; il file `.env` resta sul computer host ed è ignorato da Git. Per fermare:

```powershell
docker compose down
```

Per cancellare anche il database (operazione distruttiva):

```powershell
docker compose down -v
```

## 5. Crediti e regola di esaurimento

| Operazione | Addebito |
|---|---:|
| Creazione Human-vs-Human | 0.45 |
| Creazione Human-vs-AI | 0.75 |
| Ogni mossa effettuata da un utente | 0.05 |
| Ogni mossa effettuata dall'IA | 0.05 |

In Human-vs-Human ogni utente paga la propria mossa. In Human-vs-AI il costo della mossa dell'IA viene addebitato al saldo dell'utente che ha creato la partita. Il saldo è `DECIMAL(10,2)` e viene mantenuto nel database.

**Interpretazione dell'eccezione nelle specifiche:** la richiesta dice sia che le richieste di un utente senza crediti devono restituire `401`, sia che una partita già iniziata può continuare anche quando il saldo scende sotto zero. Per rendere coerenti i due punti, le operazioni generali protette (ad esempio statistiche, lista partite e storico) richiedono saldo positivo; le rotte di stato, mossa e abbandono della partita attiva non applicano il blocco, così i partecipanti possono terminarla. Le nuove partite richiedono comunque credito sufficiente per il costo iniziale.

## 6. JWT e sicurezza

- Algoritmo: `RS256`.
- Il payload applicativo contiene solo `sub` (id utente) e `role`; `iat` ed `exp` sono i metadati standard del token.
- La chiave privata (`JWT_PRIVATE_KEY`) e quella pubblica (`JWT_PUBLIC_KEY`) sono memorizzate direttamente in `.env` e caricate dall'applicazione.
- Il file `.env` è ignorato da Git: non pubblicarlo mai e non condividerlo.
- Le password sono salvate con bcrypt hash, mai in chiaro.
- Il ruolo admin viene creato solo tramite seed/provisioning, non mediante registrazione pubblica.

Generazione chiavi (le due chiavi PEM vengono scritte come valori con newline escaped dentro `.env`):

```powershell
npm.cmd run generate:keys
```

In ambiente di produzione utilizzare chiavi e password segrete, HTTPS, rate limiting, backup e migrazioni DB.

## 7. API REST

Tutti gli endpoint protetti richiedono:

```http
Authorization: Bearer <JWT>
Content-Type: application/json
```

| Metodo | Endpoint | Autenticazione | Descrizione |
|---|---|---|---|
| GET | `/health` | Pubblica | Health check |
| POST | `/api/auth/register` | Pubblica | Registrazione user |
| POST | `/api/auth/login` | Pubblica | Login e rilascio JWT |
| GET | `/api/auth/me` | JWT + saldo positivo | Utente autenticato |
| POST | `/api/games` | JWT + saldo positivo | Crea una partita |
| GET | `/api/games` | JWT + saldo positivo | Elenco partite dell'utente |
| GET | `/api/games/:id` | JWT partecipante | Stato della partita |
| POST | `/api/games/:id/moves` | JWT partecipante | Effettua una mossa |
| POST | `/api/games/:id/abandon` | JWT partecipante | Abbandona la partita |
| GET | `/api/games/:id/history` | JWT + saldo positivo | Storico JSON o PDF |
| GET | `/api/leaderboard?order=desc` | Pubblica | Classifica JSON |
| GET | `/api/stats/me` | JWT + saldo positivo | Statistiche personali |
| PUT | `/api/admin/credits` | JWT admin | Imposta il nuovo saldo tramite email |

### Registrazione

`POST /api/auth/register`

```json
{
  "username": "carlo",
  "email": "carlo@example.com",
  "password": "StrongPass123!"
}
```

### Login

`POST /api/auth/login`

```json
{
  "email": "alice@example.com",
  "password": "ChangeMe_User_2026!"
}
```

Risposta: `{ "token": "...", "user": { "id": 2, "username": "alice", "email": "alice@example.com", "role": "user", "credits": 10 } }`.

### Creazione partita Human-vs-AI

`POST /api/games`

```json
{
  "mode": "HUMAN_VS_AI",
  "turnTimeSeconds": 30,
  "aiDifficulty": "medium"
}
```

### Creazione partita Human-vs-Human

L'avversario deve essere già registrato. La partita parte subito e viene associata all'account identificato dall'email.

```json
{
  "mode": "HUMAN_VS_HUMAN",
  "opponentEmail": "bob@example.com",
  "turnTimeSeconds": null
}
```

`turnTimeSeconds: null` o omesso significa nessun limite temporale. Se impostato, deve essere un intero fra 5 e 3600 secondi.

### Mossa

`POST /api/games/1/moves`

```json
{ "column": 3 }
```

Le colonne vanno da `0` a `6`. In Human-vs-AI, dopo una mossa umana valida il server chiama automaticamente il motore AI e registra anche la mossa dell'elaboratore.

### Stato partita

`GET /api/games/1` restituisce partecipanti, matrice 6x7, simbolo e nome del giocatore di turno, stato, vincitore, deadline, secondi residui, saldo e storico delle mosse.

### Abbandono

`POST /api/games/1/abandon`. L'avversario viene dichiarato vincitore per abbandono. In Human-vs-AI il vincitore può essere `Computer` (`winnerId` nullo, `winnerSymbol` `Y`).

### Storico JSON o PDF

```http
GET /api/games/1/history?format=json
GET /api/games/1/history?format=pdf
GET /api/games/1/history?format=json&period=7d
GET /api/games/1/history?format=json&from=2026-01-01T00:00:00Z&to=2026-12-31T23:59:59Z
```

Sono supportati `period=24h|7d|30d` oppure `from` e `to` in formato ISO-8601. Non è consentito usare period insieme a from/to.

### Classifica pubblica

`GET /api/leaderboard?order=desc` oppure `order=asc`. Il punteggio è `wins + winsByAbandonment`. Ogni riga contiene statistiche separate `human` e `ai`, ciascuna con `played`, `wins`, `winsByAbandonment`, `losses`, `lossesByAbandonment`, `draws`.

### Ricarica Admin

`PUT /api/admin/credits`

```json
{
  "email": "alice@example.com",
  "newCredits": 25.50
}
```

L'endpoint imposta il saldo al nuovo valore fornito, invece di sommarlo al precedente.

## 8. Timeout

Quando `turnTimeSeconds` è diverso da null, `deadlineAt` viene impostato all'inizio del turno e aggiornato dopo ogni mossa. Un job del server controlla le partite scadute ogni secondo. Se il tempo termina, la partita passa a `TIMEOUT` e vince l'altro partecipante. La deadline è salvata nel DB: la scadenza può essere recuperata anche dopo il riavvio del processo.

## 9. Progettazione, UML e Design Patterns

I diagrammi sono disponibili in `docs/uml/` in formato PlantUML:

- `use-case.puml`: casi d'uso;
- `sequence-create-game.puml`: sequenza creazione partita;
- `sequence-move.puml`: sequenza esecuzione mossa;
- `sequence-timeout.puml`: scadenza automatica turno.

Pattern adottati:

1. **Adapter Pattern** (`ConnectFourEngineAdapter`): isola le API della libreria esterna `connect4-ai` e offre al resto dell'applicazione metodi stabili per verificare le colonne e ottenere la mossa IA. In questo modo il motore potrebbe essere sostituito senza modificare le route o il servizio.
2. **Service Layer** (`AuthService`, `GameService`, `HistoryService`, `LeaderboardService`): separa la logica di business dalle route HTTP, rende il codice più testabile e riduce la duplicazione.
3. **Chain of Responsibility / Middleware Pipeline**: Express concatena autenticazione JWT, controllo ruolo, controllo crediti e validazione Zod prima del controller. Ogni middleware può interrompere la richiesta o passarla al successivo.

### Modello dati

- `User`: username, email, password hash, role, credits.
- `Game`: partecipanti, modalità, board, turno, risultato, timer, difficoltà IA.
- `Move`: singola mossa, simbolo, colonna, partecipante, indicatore AI e timestamp.

Le associazioni Sequelize sono definite in `src/models/associations.ts`.

## 10. Validazione ed error handling

Gli schemi Zod validano body, parametri e query. Gli errori vengono passati agli strati middleware centrali (`notFoundHandler`, `errorHandler`) e restituiti in JSON con codice HTTP appropriato. Esempi:

- `400`: input non valido;
- `401`: JWT mancante/non valido/scaduto o saldo non positivo su endpoint non legati a una partita attiva;
- `403`: utente non partecipante, turno errato o ruolo insufficiente;
- `404`: partita/utente inesistente;
- `409`: partita già attiva per uno dei giocatori o colonna piena;
- `402`: credito insufficiente alla creazione della partita.

## 11. Test Jest

Eseguire `npm test`. I test includono:

- middleware `authenticate`: token mancante e JWT RS256 valido;
- middleware `requireAdmin`: rifiuto di utente non admin;
- middleware `requirePositiveCredits`: rifiuto saldo zero con HTTP 401;
- funzioni delle regole di gioco: vittoria orizzontale/verticale, colonne invalide/piene e board piena.

## 12. Test manuale Postman

Importare `postman/Connect-Four-Exam.postman_collection.json` in Postman. La collection contiene richieste per health, registrazione, login, creazione partita, mossa, stato, storico JSON/PDF, abbandono, classifica, statistiche e ricarica Admin. Dopo il login, il test script salva automaticamente il JWT nelle variabili della collection.

## 13. GitHub e consegna Moodle

```powershell
git init
git add .
git commit -m "Complete Connect Four exam backend"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-public-repository>.git
git push -u origin main
git rev-parse HEAD
```

Inserire su Moodle:

- URL del repository GitHub pubblico;
- commit SHA esatto ottenuto da `git rev-parse HEAD`;
- data dell'esame.

Non committare `.env`, il database SQLite, `node_modules` o token JWT. Il file `.env` contiene la chiave privata RS256.
