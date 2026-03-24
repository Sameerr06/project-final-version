# 🚀 code 144p Quiz Platform

![React](https://img.shields.io/badge/React-18-blue.svg?style=for-the-badge&logo=react)
![Django](https://img.shields.io/badge/Django-4.2-darkgreen.svg?style=for-the-badge&logo=django)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Ready-blue.svg?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Supported-2496ED.svg?style=for-the-badge&logo=docker)

A full-stack, two-round competitive coding quiz application built originally for the **VAHGFINIX'26** event. Students register, attempt a timed MCQ round, and top performers automatically advance to a code debugging round — all running within a secure, proctored browser environment.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Docker Installation](#running-with-docker-compose)
  - [Local Installation](#running-locally-without-docker)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [License](#-license)

---

## 🎯 Overview

**code 144p** is a robust and highly-customizable competitive quiz platform tailored explicitly for college-level coding events and hackathons. It automates testing, evaluation, and progression.

- **Round 1:** Timed multiple-choice questions (MCQ) fortified with anti-cheating mechanisms.
- **Round 2:** High-stakes code debugging questions available only to qualified students (e.g., top 50%).
- **Live Leaderboard:** Real-time ranking based on Round 1, Round 2, and aggregate scores.
- **Integrated Compiler:** Browser-based code editor and compiler execution environment for Python, Java, and C.
- **Admin Dashboard:** Fully equipped management portal to handle questions, track users, and monitor exams.

---

## ✨ Key Features

### 👨‍🎓 Student Flow
1. **Welcome Dashboard** ➔ **Registration** ➔ **Instructions** ➔ **Round 1 (MCQ)** ➔ **Results** ➔ *(if qualified)* ➔ **Round 2 (Debugging)** ➔ **Thank You**

### 🛡️ Secure Round 1 (MCQ)
- Questions are randomized per student to prevent collaboration.
- Individual per-question countdown timers (e.g., 2 minutes).
- **Proctoring Suite:**
  - Enforced fullscreen mode with warnings.
  - Tab switch & window blur detection (auto-submits after 3 strikes).
  - Copy/paste and right-click functions disabled.
  - Dedicated keyboard shortcut blocking.

### 💻 Round 2 (Code Debugging)
- Unlocked exclusively for students scoring past the qualification threshold.
- Embedded IDE environment for modifying and testing buggy code.
- Automatic email dispatching with final detailed results upon completion.

### ⚙️ Online Compiler & Execution Engine
- Safely executes user code directly on the server.
- Supports **Python 3**, **Java**, and **C (gcc)**.
- Input size limits (10 KB) & timeouts (10s) prevent infinite loops.
- Python sandbox securely filters dangerous imports (`os`, `sys`, `subprocess`).

---

## 🛠️ Tech Stack

| Component | Technologies Used |
|---|---|
| **Frontend** | React 18, React Router v6, Vite, Vanilla CSS |
| **Backend** | Django 4.2, Django REST Framework (DRF) |
| **Database** | PostgreSQL (Production), SQLite (Local Dev) |
| **Server** | Gunicorn + WhiteNoise |
| **Containerization** | Docker, Docker Compose |
| **Hosting Deployment** | Render (Full Stack), Vercel (Frontend Alternative) |

---

## 📂 Project Structure

```text
project-v2-main/
├── backend/
│   ├── quiz_api/               # Core Django app logic & APIs
│   │   ├── models.py           # DB Schemas: Student, Question, Answer
│   │   ├── views.py            # API logic and online compiler engine
│   │   └── serializers.py      # DRF JSON transformers
│   ├── quiz_backend/           # Django project configuration (settings.py)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── Procfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # React routing architecture
│   │   └── pages/              # UI Components (Quiz, Leaderboard, etc.)
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vite.config.js
├── docker-compose.yml          # Unified container orchestration
└── render.yaml                 # Render auto-deployment manifest
```

---

## 🚀 Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose **OR**
- Python 3.10+, Node.js 18+, and PostgreSQL (for local manual builds).

### Running with Docker Compose
The fastest way to get everything running is via Docker.

```bash
# 1. Clone the repository
git clone https://github.com/YourRepo/code144p.git
cd code144p

# 2. Configure environments
cp .env.example .env

# 3. Spin up the containers
docker-compose up --build
```
- **Frontend Dashboard:** `http://localhost`
- **Backend API API:** `http://localhost:8000`
- **Django Superadmin:** `http://localhost:8000/admin` *(Default: admin / admin123)*

To stop the service and clear database volumes:
```bash
docker-compose down -v
```

### Running Locally (Without Docker)

**1. Backend Initialization:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

**2. Frontend Initialization:**
```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Environment Variables

Ensure these are properly set in your respective `.env` files for production.

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string URL |
| `DJANGO_SECRET_KEY` | 50-character random cryptic string |
| `DEBUG` | `True` for Dev, `False` for Production |
| `ALLOWED_HOSTS` | Comma-separated list (e.g., `api.example.com`) |
| `EMAIL_HOST_USER` | Gmail address for sending result emails |
| `EMAIL_HOST_PASSWORD` | App-specific password for the Gmail account |

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_API_URL` | FQDN to your backend server |

---

## 📡 API Reference

### Student Management
- `POST /api/student/` - Register new participant
- `DELETE /api/delete-student/<id>/` - Remove participant

### Quiz Operations
- `GET /api/questions/?round=X` - Retrieve active questions
- `POST /api/submit-answer/` - Lodge an answer/code snippet
- `POST /api/complete-round1/` - Finalize round & calculate qualification
- `GET /api/check-qualification/<id>/` - Verify R2 eligibility
- `POST /api/start-round2/` - Initiate final stage
- `POST /api/complete-round2/` - Finalize quiz & dispatch email

### Admin Control
- `GET /api/admin/questions/` - List full question repository
- `POST /api/admin/questions/create/` - Insert new questions
- `DELETE /api/admin/questions/delete/<id>/` - Remove question
- `GET /api/leaderboard/` - Comprehensive rankings page
- `POST /api/login/` - Token auth for staff

### Code Execution
- `POST /api/compile/` - Run arbitrary code *(Requires auth & validation)*

---

## ☁️ Deployment

This repository is optimized for **Render** via the included `render.yaml`.
1. Fork & Clone into your GitHub account.
2. Link your repository directly into Render.
3. Render will auto-provision the **Backend API**, **PostgreSQL Database**, and serve the **React Frontend** over CDN.

You may alternatively deploy the database to **Supabase** or **AWS RDS**, and host the frontend on **Vercel** utilizing the `vercel.json` config.

---

## ⚖️ License

Built for **code 144p'26**. All rights reserved. 
