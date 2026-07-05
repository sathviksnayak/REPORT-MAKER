# REPORT-MAKER

An AI-powered report generation tool that automates the creation and formatting of academic reports from user-provided content.

## Features

- Upload Word (.docx) documents
- AI-assisted content generation and rewriting
- Preserves document structure and formatting
- Generates downloadable report documents
- Backend API built with Node.js and Express
- Frontend built with React

## Tech Stack

### Frontend
- React
- Vite

### Backend
- Node.js
- Express.js

### Libraries
- Mammoth
- Docx
- OpenAI API
- Other document processing utilities

## Project Structure

```
REPORT-MAKER/
│
├── backend/
│   ├── services/
│   ├── uploads/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
└── README.md
```

## Installation

### Clone the repository

```bash
git clone https://github.com/sathviksnayak/REPORT-MAKER.git
cd REPORT-MAKER
```

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Create a `.env` file inside the `backend` directory.

Example:

```env
OPENAI_API_KEY=your_api_key
PORT=5000
```

> Do **not** commit your `.env` file.

## Current Functionality

- Document upload
- AI content generation
- Section processing
- Report generation
- Document formatting pipeline

## Future Improvements

- User authentication
- Report templates
- PDF export
- Version history
- Cloud storage integration

## License

This project is intended for educational and personal use.