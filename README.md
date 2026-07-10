# REPORT MAKER

An AI-powered web application that rewrites academic reports by automatically changing the report topic while preserving the original Microsoft Word (.docx) document structure and formatting.

## Features

- Upload Microsoft Word (.docx) reports
- AI-powered section-wise content rewriting
- Automatically detects report sections
- Option to skip cover/certificate pages
- Preserves document formatting and layout
- Downloads the rewritten report as a `.docx`
- React frontend with Express backend

---

## Tech Stack

### Frontend
- React
- Vite
- CSS

### Backend
- Node.js
- Express.js
- Multer

### AI
- Groq API (LLM)

### Document Processing
- @xmldom/xmldom
- adm-zip

---

## Project Structure

```
REPORT-MAKER/
│
├── backend/
│   ├── services/
│   ├── uploads/
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
└── README.md
```

---

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
npm start
```

---

## Environment Variables

Create a `.env` file inside the `backend` directory.

```env
GROQ_API_KEY=your_api_key
PORT=5000
```

---

## How It Works

1. Upload a `.docx` report.
2. Enter the new report topic.
3. (Optional) Indicate if the document contains a cover/certificate page.
4. The backend:
   - Parses the document XML
   - Detects report sections
   - Sends each section to the LLM for rewriting
   - Replaces only the paragraph text while preserving formatting
   - Generates a new `.docx`
5. Download the rewritten report.

---

## Current Functionality

- Upload Word documents
- Automatic section detection
- AI-based report rewriting
- Formatting preservation
- DOCX regeneration
- Download rewritten report

---

## Planned Features

- User authentication (JWT + MongoDB)
- Report history
- Multiple rewrite modes
- Heading rewriting
- PDF export
- Cloud deployment
- Report templates

---

## License

This project is intended for educational and personal use.