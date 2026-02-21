# File Uploader

A full-stack file uploading application with authentication and encryption support.

## Features

- **User Authentication**: Secure login and user management with Firebase
- **File Encryption**: Built-in cryptographic support for secure file handling
- **Key Management**: Secure key generation and management utilities
- **Responsive UI**: Modern Vue.js frontend with TypeScript
- **REST API**: Express.js backend with authentication middleware
- **Docker Support**: Easy deployment with Docker and Docker Compose
- **Nginx Reverse Proxy**: Production-ready web server configuration

## Project Structure

```
├── client/                 # Vue.js frontend application
│   ├── src/
│   │   ├── components/    # Vue components (FileUploader, etc.)
│   │   ├── views/         # Page views (Login, Dashboard)
│   │   ├── router/        # Vue Router configuration
│   │   ├── services/      # Client services (Crypto utilities)
│   │   └── utils/         # Helper utilities (Key management)
│   └── vite.config.ts     # Vite bundler configuration
│
├── server/                # Express.js backend application
│   └── src/
│       ├── controllers/   # Route handlers
│       ├── models/        # Data models
│       ├── routes/        # API route definitions
│       ├── middleware/    # Custom middleware (auth)
│       ├── config/        # Configuration (Firebase)
│       ├── utils/         # Helper utilities
│       └── server.ts      # Server entry point
│
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile             # Docker container definition
├── nginx.conf             # Nginx web server configuration
├── package.json           # Node.js dependencies
└── tsconfig.json          # TypeScript configuration
```

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Docker and Docker Compose (for containerized deployment)
- Firebase credentials (for authentication)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd file-uploader
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Create a `.env` file in the server directory with Firebase credentials
   - Configure client-side API endpoints if needed

4. **Set up Firebase**
   - Add your Firebase configuration to `server/src/config/firebase.ts`

## Development

### Run the full stack locally

```bash
npm run dev
```

### Run client only
```bash
cd client
npm run dev
```

### Run server only
```bash
cd server
npm run dev
```

### Build for production
```bash
npm run build
```

## Docker Deployment

### Build and run with Docker Compose
```bash
docker-compose up --build
```

The application will be available at `http://localhost` (via Nginx proxy)

### Services
- **Frontend**: Vue.js app served by Nginx
- **Backend**: Express.js API server
- **Nginx**: Reverse proxy on port 80

## Technology Stack

### Frontend
- **Vue.js 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Next generation frontend tooling
- **Vue Router** - Client-side routing

### Backend
- **Express.js** - Minimalist web framework
- **Node.js** - JavaScript runtime
- **Firebase** - Authentication and backend services
- **TypeScript** - Type-safe JavaScript

### DevOps
- **Docker** - Container platform
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Web server and reverse proxy

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

## Security Features

- **Encryption**: Client-side file encryption using CryptoService
- **Authentication**: Firebase-based user authentication
- **Key Management**: Secure key generation and storage
- **Middleware**: Authentication middleware on protected routes

## Contributing

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Commit your changes (`git commit -m 'Add AmazingFeature'`)
3. Push to the branch (`git push origin feature/AmazingFeature`)
4. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions, please open an issue on the repository.
