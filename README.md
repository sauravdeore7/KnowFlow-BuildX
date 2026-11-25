# KnowFlow – AI-Powered Project Knowledge Management

Never lose the knowledge behind the work.

KnowFlow is an AI-powered Project Knowledge Management and Intelligent Handover Platform that helps teams capture, organize, and preserve important project knowledge.

It transforms scattered project activities, employee work journals, documents, meeting notes, and decisions into structured, searchable knowledge. This helps organizations maintain project continuity, simplify employee transitions, and prevent critical knowledge from being lost when team members leave.

## Problem Statement

When a team member leaves a project, important information about their work, decisions, responsibilities, dependencies, and unresolved tasks can be lost. This creates knowledge gaps, delays, and difficulties for the remaining team.

KnowFlow addresses this challenge by creating a centralized platform that captures project knowledge and generates structured, reviewable handover information.

## Key Features

### 1. Manager Workspace
- Manage multiple projects and team members.
- Monitor project activities and progress.
- Access project documents and knowledge.
- Review and approve employee handover reports.
- View project reports and analytics.

### 2. Employee Workspace
- Maintain daily work journals.
- Record completed tasks, decisions, blockers, and dependencies.
- Document pending work and next steps.
- Access authorized project information.
- Track personal work contributions.

### 3. AI-Powered Knowledge Extraction
- Extract important information from project journals and documents.
- Identify decisions, responsibilities, risks, dependencies, and unresolved questions.
- Organize scattered project information into structured knowledge.
- Support source-linked knowledge retrieval.

### 4. Intelligent Handover
- Generate structured handover reports.
- Preserve important project decisions and responsibilities.
- Identify pending tasks and unresolved issues.
- Support employee confirmation and manager approval.

### 5. Reports and Analytics
- Manager reports and project analytics.
- Employee contribution analytics.
- Project activity tracking.

### 6. Document Management
- Organize and access project-related documents.
- Maintain project knowledge in a centralized workspace.

## Technology Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- React Flow

### Backend
- Python
- FastAPI

### Database and Services
- PostgreSQL
- Supabase Authentication
- Supabase Storage
- pgvector

### AI Integration
- Large Language Models (LLMs)
- Embeddings
- Retrieval-Augmented Generation (RAG)

### Development Tools
- Git and GitHub
- Visual Studio Code

## System Architecture

KnowFlow uses a frontend-backend architecture.

- Frontend: Provides separate interfaces for managers and employees.
- Backend: Handles APIs, application logic, knowledge processing, and handover workflows.
- Database: Stores project information, journals, documents, and structured knowledge.
- AI Layer: Supports knowledge extraction and retrieval from authorized project information.
- Authentication and Storage: Supabase provides authentication and document storage services.

## Live Deployment

Frontend: https://knowflow-six.vercel.app

Backend: https://knowflow-backend-qkfl.onrender.com

## Getting Started

### Prerequisites

- Node.js and npm
- Python 3
- Git
- Supabase project credentials

### 1. Clone the Repository


git clone https://github.com/sauravdeore7/KnowFlow-BuildX.git
cd KnowFlow-BuildX


### 2. Frontend Setup


cd frontend
npm install
npm run dev


Configure the required frontend environment variables before running the application.

### 3. Backend Setup

Open a separate terminal:


cd backend
pip install -r requirements.txt


Configure the required backend environment variables in your local environment before starting the server.

### 4. Environment Configuration

Keep sensitive credentials in environment files and never commit them to GitHub.

## Project Vision

KnowFlow aims to make project knowledge independent of individual employees by ensuring that important decisions, responsibilities, workflows, and experiences remain accessible to authorized team members.

By combining AI-powered knowledge extraction with structured handover workflows, KnowFlow helps teams preserve institutional knowledge and maintain continuity.

**KnowFlow – Never lose the knowledge behind the work.**