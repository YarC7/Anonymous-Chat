# Anonymous Chat 123

This is a full-stack anonymous chat application that allows users to connect and chat with random strangers. It features gender-based matching preferences and AI-powered icebreakers to get conversations started.

The application is built with a modern tech stack and is fully containerized with Docker for easy development and deployment.

## Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, Express, Socket.io
- **Database**: PostgreSQL (with Knex.js for query building and migrations)
- **Cache**: Redis (for session management)
- **Authentication**: Google OAuth 2.0
- **AI**: Groq API for generating icebreakers
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions

## Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Docker](httpss://www.docker.com/get-started) and [Docker Compose](httpss://docs.docker.com/compose/install/)
- [Node.js](httpss://nodejs.org/) (v18 or later)
- [pnpm](httpss://pnpm.io/installation)

### Installation & Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/YarC7/Anonymous-Chat.git
    cd Anonymous-Chat
    ```

2.  **Set up environment variables:**

    Create a `.env` file in the root of the project by copying the example file:

    ```bash
    # For Windows (Command Prompt)
    copy .env.example .env

    # For Windows (PowerShell)
    Copy-Item .env.example .env

    # For macOS/Linux
    cp .env.example .env
    ```

    Open the new `.env` file and update the following variables, especially the Google OAuth credentials. The default database and Redis credentials are set up to work with the `docker-compose.yml` file.

    ```dotenv
    # Server Configuration
    PORT=8080
    NODE_ENV=development

    # Database Configuration (PostgreSQL)
    DB_HOST=localhost
    DB_PORT=5433 # Mapped to 5432 in the container to avoid local conflicts
    DB_NAME=anonymous_chat
    DB_USER=postgres
    DB_PASSWORD=postgres
    DB_SSL=false

    # Google OAuth Configuration
    GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=your_google_client_secret_here

    # Frontend Environment Variables (prefix with VITE_ for Vite)
    # Copy this value to match GOOGLE_CLIENT_ID
    VITE_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com

    # Session Configuration
    SESSION_SECRET=your_random_session_secret_here
    ```

    **Important:** The `VITE_GOOGLE_CLIENT_ID` is passed as a build argument to Docker, so you must have it set correctly in your `.env` file before building the container.

3.  **Install dependencies:**

    ```bash
    pnpm install
    ```

4.  **Run the application with Docker Compose:**

    This single command will build the application container, start the Postgres and Redis services, run database migrations automatically, and launch the application.

    ```bash
    docker-compose up --build
    ```

    The application will be available at [http://localhost:8080](http://localhost:8080).

### Development Scripts

While `docker-compose` is the recommended way to run the entire stack, you can also use the following scripts for specific tasks.

- `pnpm dev`: Starts the frontend and backend in development mode with hot-reloading. (Note: Requires separate local instances of Postgres and Redis).
- `pnpm build`: Builds the client and server for production.
- `pnpm test`: Runs the test suite.
- `pnpm typecheck`: Validates TypeScript types across the project.

## CI/CD

This project uses GitHub Actions for Continuous Integration and Continuous Deployment. The workflow is defined in `.github/workflows/ci-cd.yml` and includes the following jobs:

- **Test**: Runs the test suite against live database and Redis services within the CI environment.
- **Build and Push**: Builds the production Docker image and pushes it to GitHub Container Registry (GHCR).
