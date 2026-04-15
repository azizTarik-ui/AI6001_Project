# AI6001_Chess_Realm
<!-- T
Instructions:

* Click the `Use this template` green button in the top-right of the repo
* Create a new *PRIVATE* repository from this template
* Add user `davechurchill` as a collaborator (Settings > Manage Access > Add People)
* Click the pencil icon in the top-right of this section to edit straight from the GitHub website
* Edit your `README.md` file to include your group info, and remove this instruction section
* Once your project has been submitted, you can change it to public
-->
Project Group Members:

* Ahammed Tarik Aziz (Student ID: 202483493, email: atarikaziz@mun.ca)
* Biplav Adhikari (Student ID: 202581517, email: biplava@mun.ca)



Project URL

* Web application URL: https://groupf.stu.researchatmun.ca



Project Videos:

* Project Presentation: https://www.youtube.com/watch?v=rQKUS4cwB5o
* Google Drive URL for the video: https://shorturl.at/SFMs4



Project Setup / Installation:

## Prerequisites

Make sure the following software is installed on your machine before running the project:

| Software | Version | Download |
| --- | --- | --- |
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop |
| Node.js | 18 LTS | https://nodejs.org |

## Getting the Project

Download or clone the project files to your computer.
Once extracted, your folder should look like this:

```text
AI6001_Project/
├── chess_realm/
│   ├── frontend/
│   └── backend/
├── Dockerfile
├── docker-compose.yml
└── .dockerignore
```

## Running the Project

1. Open Docker Desktop and wait until it says "Docker is running".
2. Open a terminal inside the project root folder (`AI6001_Project`, where `docker-compose.yml` is located).
	- Windows: Navigate to the folder in File Explorer, click the address bar, type cmd, and press Enter.
	- Mac: Open Terminal and drag the folder into it.
3. Run this command:

```bash
docker-compose up --build
```

Wait until you see output similar to:

```text
app_1   | Connected to MongoDB
app_1   | Server running at http://localhost:3000
```

4. Open your browser and go to:

http://localhost:3000

## Using the Application

- Click Register to create a new account.
- Click Login to sign in.
- Click any white piece to select it. Dots show legal moves.
- Click a dot to move. The AI responds automatically.
- The game ends when checkmate or stalemate is detected.
- Click View History to see all your previous records.
- Click Resign to end the game early.

## Stopping the Application

Press Ctrl + C in the terminal, then run:

```bash
docker-compose down
```

## Starting Again Next Time

```bash
docker-compose up
```

No rebuild is needed unless you changed the code.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, JavaScript, Canvas API |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| AI | Minimax with Alpha-Beta pruning |
| Containerisation | Docker, Docker Compose |

## Troubleshooting

- Port 3000 already in use: restart your computer and try again.
- Page does not load: make sure the terminal shows "Server running" before opening the browser.
- docker-compose not found: try `docker compose up --build` without the hyphen.
