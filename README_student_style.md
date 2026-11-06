# Progetto Forza Quattro
## Esame di Programmazione Avanzata – A.A. 2025/2026

## 1. Introduzione

Questo progetto consiste nella realizzazione di un back-end per il gioco Forza Quattro.

Il sistema permette a un utente registrato di giocare contro un altro utente oppure contro il computer. Per utilizzare le funzioni riservate è necessario effettuare il login e usare il token JWT restituito dal server.

Ho realizzato il progetto usando TypeScript, Express, Sequelize e SQLite. L'obiettivo è gestire le partite, i turni, i crediti degli utenti e lo storico delle mosse.

## 2. Funzioni principali

Le funzioni che ho sviluppato sono:

- registrazione e login degli utenti;
- autenticazione tramite JWT con algoritmo RS256;
- creazione di partite tra due utenti oppure contro l'intelligenza artificiale;
- controllo delle mosse e dei turni;
- possibilità di abbandonare una partita;
- gestione del tempo massimo per una mossa;
- aggiornamento dei crediti dopo la creazione della partita e dopo ogni mossa;
- visualizzazione dello stato della partita;
- esportazione dello storico in formato JSON o PDF;
- classifica pubblica e statistiche degli utenti;
- ricarica dei crediti da parte dell'amministratore.

Un utente può partecipare a una sola partita attiva alla volta. Il sistema, invece, può gestire più partite contemporaneamente se coinvolgono utenti diversi.

## 3. Tecnologie utilizzate

Per sviluppare il progetto ho utilizzato:

- **Node.js** e **TypeScript** per l'ambiente di esecuzione e il linguaggio;
- **Express** per creare le API;
- **Sequelize** come ORM;
- **SQLite** come database;
- **connect4-ai** per la logica del gioco e le mosse del computer;
- **jsonwebtoken** per creare e verificare i token JWT;
- **bcryptjs** per salvare le password in forma cifrata tramite hash;
- **Zod** per controllare i dati ricevuti dalle richieste;
- **PDFKit** per generare lo storico in PDF;
- **Jest** per i test;
- **Docker Compose** per avviare il progetto.

## 4. Organizzazione del progetto

Il codice è diviso in cartelle in base alla funzione dei file.

- `src/routes`: contiene le rotte dell'API.
- `src/services`: contiene la logica delle operazioni, per esempio autenticazione, partite, storico e classifica.
- `src/models`: contiene i modelli Sequelize per utenti, partite e mosse.
- `src/middleware`: contiene i controlli di autenticazione, autorizzazione, validazione e gestione degli errori.
- `src/game`: contiene l'adapter utilizzato per interagire con la libreria del gioco.
- `src/exporters`: contiene le classi per esportare lo storico in JSON e PDF.
- `src/config`: contiene la configurazione del database e delle variabili d'ambiente.
- `src/utils`: contiene funzioni di supporto.
- `scripts`: contiene gli script per inizializzare gli utenti e generare le chiavi.
- `tests`: contiene i test automatici.
- `docs/uml`: contiene i diagrammi del progetto.
- `postman`: contiene la collection per provare le API.

Il database contiene tre entità principali: `User`, `Game` e `Move`. Un utente può partecipare a più partite nel tempo, mentre ogni partita può avere diverse mosse.

## 5. Diagrammi

Ho inserito i diagrammi nella cartella `docs/uml`.

Sono presenti:
- diagramma dei casi d'uso;
- diagramma delle sequenze per la creazione di una partita;
- diagramma delle sequenze per l'esecuzione di una mossa;
- diagramma delle sequenze per la scadenza del turno;
- diagramma delle sequenze per l'esportazione dello storico;
- diagramma del modello dei dati.

Per ogni diagramma sono disponibili il file sorgente Mermaid (`.mmd`) e, dove previsto, l'immagine PNG. I diagrammi possono essere aperti direttamente dalla cartella.

## 6. Scelte di progettazione e pattern

Durante lo sviluppo ho separato le rotte dalla logica delle operazioni, in modo che le rotte si occupino principalmente di ricevere le richieste e restituire le risposte.

Nel progetto sono presenti questi pattern:

**Adapter**

La classe `ConnectFourEngineAdapter` permette al resto dell'applicazione di utilizzare la libreria `connect4-ai` attraverso metodi definiti nel progetto. In questo modo il codice dei servizi non deve conoscere direttamente tutti i dettagli della libreria esterna.

**Strategy**

Le classi che si occupano dell'esportazione permettono di scegliere il formato dello storico. In base al parametro richiesto si utilizza l'esportatore JSON oppure quello PDF.

**Factory**

`ErrorFactory` viene utilizzata per creare gli errori applicativi con il relativo codice HTTP. In questo modo gli errori hanno una gestione uniforme.

**Singleton**

La configurazione del database usa una sola istanza condivisa di Sequelize.

**Middleware / Chain of Responsibility**

Le richieste passano attraverso vari middleware. Per esempio, prima di eseguire una funzione protetta il sistema controlla il token, i permessi e i dati ricevuti.

**Service Layer**

La logica principale è stata separata dalle rotte e inserita nei servizi. Questo rende più semplice mantenere e testare il codice.

## 7. Avvio del progetto con Docker

Per avviare il progetto con Docker sono necessari Docker Desktop e Docker Compose.

Dalla cartella principale del progetto:

1. Copiare il file `.env.example` e creare un file chiamato `.env`.
2. Controllare le variabili presenti in `.env` e modificare le password di esempio.
3. Aprire il terminale nella cartella del progetto.
4. Eseguire:

```bash
docker compose up --build
```

Il container prepara le chiavi JWT se non sono già disponibili, inizializza gli utenti di esempio e avvia il server.

L'API è disponibile all'indirizzo:

`http://localhost:3000`

Per controllare che il server sia attivo si può usare:

`GET http://localhost:3000/health`

Per fermare i container:

```bash
docker compose down
```

Il database viene conservato nel volume Docker. Il comando `docker compose down -v` elimina anche il volume e quindi i dati salvati; va usato solo quando si vuole ricominciare da zero.

## 8. Avvio in locale

In alternativa è possibile avviare il progetto senza Docker. Sono necessari Node.js 20 o una versione successiva e npm.

Dalla cartella principale eseguire:

```bash
npm install
```

Creare il file `.env` partendo da `.env.example`, poi generare le chiavi e inizializzare il database:

```bash
npm run generate:keys
npm run seed
```

Per avviare il server in modalità sviluppo:

```bash
npm run dev
```

Per compilare ed eseguire il progetto:

```bash
npm run build
npm start
```

Altri comandi utili:

```bash
npm test
npm run typecheck
```

## 9. Utenti iniziali

Lo script di seed crea tre utenti per provare il sistema: un amministratore e due utenti normali.

Le email e le password sono configurate tramite le variabili `SEED_*` nel file `.env`. Le password non devono essere inserite nel repository in un progetto utilizzato realmente. Nel database vengono salvati gli hash delle password e non le password in chiaro.

Per aggiornare le password degli utenti di seed già presenti dopo aver modificato `.env`, è disponibile:

```bash
npm run seed:passwords
```

La registrazione pubblica crea un utente con ruolo normale. Il ruolo di amministratore viene assegnato tramite il seed.

## 10. Crediti

Il sistema applica i seguenti costi:

| Operazione | Costo |
|---|---:|
| Creazione di una partita tra due utenti | 0.45 |
| Creazione di una partita contro il computer | 0.75 |
| Ogni mossa | 0.05 |

Nelle partite contro il computer viene addebitato all'utente anche il costo della mossa effettuata dall'intelligenza artificiale.

Per creare una partita l'utente deve avere credito sufficiente. Durante una partita già iniziata il saldo può diventare negativo e la partita può continuare, come indicato nelle specifiche.

Le richieste che richiedono un saldo positivo restituiscono `401 Unauthorized` quando il credito è esaurito. Le operazioni necessarie per terminare una partita già in corso rappresentano l'eccezione.

L'amministratore può aggiornare il credito di un utente usando la rotta dedicata.

## 11. Autenticazione e sicurezza

Il login restituisce un token JWT firmato con RS256. Il token deve essere inviato nelle richieste protette nell'header:

```http
Authorization: Bearer <token>
```

Le chiavi sono configurate tramite il file `.env`. Questo file non deve essere caricato su GitHub. Anche le chiavi private, il database e le altre informazioni riservate devono restare fuori dal repository.

Le password vengono salvate usando bcrypt.

## 12. Rotte principali

Le rotte principali del progetto sono:

| Metodo | Percorso | Funzione |
|---|---|---|
| `GET` | `/health` | Controllo del server |
| `POST` | `/api/auth/register` | Registrazione |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Dati dell'utente autenticato |
| `POST` | `/api/games` | Creazione di una partita |
| `GET` | `/api/games` | Elenco delle partite dell'utente |
| `GET` | `/api/games/:id` | Stato della partita |
| `POST` | `/api/games/:id/moves` | Esecuzione di una mossa |
| `POST` | `/api/games/:id/abandon` | Abbandono della partita |
| `GET` | `/api/games/:id/history` | Storico JSON o PDF |
| `GET` | `/api/leaderboard` | Classifica pubblica |
| `GET` | `/api/stats/me` | Statistiche personali |
| `PUT` | `/api/admin/credits` | Modifica del credito da parte dell'admin |

Le richieste vengono controllate prima di essere elaborate. Per esempio, il sistema verifica che il token sia valido, che l'utente abbia i permessi necessari e che i dati inviati rispettino gli schemi di validazione.

## 13. Gestione del tempo

Quando viene impostato un tempo massimo per la mossa, il sistema salva la scadenza del turno nel database. Dopo ogni mossa la scadenza viene aggiornata.

Se il giocatore non esegue la mossa entro il tempo previsto, la partita termina e vince l'avversario. È anche possibile creare una partita senza limite di tempo.

## 14. Test

Per verificare il progetto ho utilizzato Jest.

I test controllano:
- autenticazione e autorizzazione tramite middleware;
- accesso alle partite;
- validazione dei dati;
- regole principali del Forza Quattro;
- calcolo dei crediti;
- filtri temporali dello storico;
- esportazione JSON e PDF;
- calcolo delle statistiche.

Per eseguire i test:

```bash
npm test
```

Per controllare i tipi TypeScript:

```bash
npm run typecheck
```

Durante la verifica locale del progetto, la compilazione TypeScript è terminata senza errori e tutti gli 8 test suite (37 test) sono risultati superati.

## 15. Prova delle API con Postman

Nella cartella `postman` si trova il file:

`Connect-Four-Exam.postman_collection.json`

Per provare le API:

1. Aprire Postman.
2. Importare la collection.
3. Controllare che `baseUrl` sia `http://localhost:3000`.
4. Eseguire il login per ottenere il token.
5. Usare le richieste della collection per creare partite, effettuare mosse e controllare lo stato.
6. Provare anche lo storico, la classifica e le funzioni dell'amministratore.

La collection contiene esempi per le principali operazioni del progetto.

## 16. Note finali

Il progetto è stato sviluppato per le specifiche dell'esame di Programmazione Avanzata. SQLite è stato scelto per mantenere semplice l'installazione e l'esecuzione in ambiente didattico.

Per un utilizzo in produzione sarebbe opportuno aggiungere ulteriori controlli, per esempio rate limiting, HTTPS, backup regolari e migrazioni del database.

