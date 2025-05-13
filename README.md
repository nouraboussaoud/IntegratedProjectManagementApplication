# 🚀 FlowPi - AI-Driven Student Project Management Platform

## 🧠 Overview

**FlowPi** is an intelligent, full-stack project management platform developed as part of the Software Engineering coursework at **Esprit School of Engineering**.

Designed for academic institutions, FlowPi leverages:
- 🤖 AI-powered automation  
- 🧑‍🤝‍🧑 Real-time collaboration tools  
- ♿ Accessibility features  

The goal: enhance student learning and simplify project oversight for educators.

> 🛠️ Built with modern technologies: **React.js**, **Node.js**, and **MongoDB**

---

## ✨ Features

- **AI-Powered Project Matching**: Recommends projects based on student skills and interests
- **Automated Team Formation**: Forms optimal teams using compatibility analysis
- **Live Progress Tracking**: Interactive dashboards using WebSockets
- **Git Integration**: Analyzes contributions via Git logs
- **AI-Driven Evaluation**: Uses NLP for code quality assessment & feedback
- **Accessibility First**: Screen reader support & audio notifications
- **Smart Quiz Generator**: Creates quizzes from codebases

---

## ⚙️ Tech Stack

### 🔹 Frontend

- **React.js** – Component-based UI
- **CSS3** – Custom styling
- **Axios** – API communication
- **React Router** – Navigation
- **Lucide React** – Accessible icons
- **React Toastify** – Notifications

### 🔹 Backend

- **Node.js** – Runtime environment
- **Express.js** – API routing
- **MongoDB** – NoSQL database
- **JWT** – Authentication
- **Ollama** – Local AI integration
- **TensorFlow.js** – Machine learning models
- **bcrypt** – Password hashing

### 🔹 DevOps & Tools

- **Docker** – Containerization
- **GitHub Actions** – CI/CD
- **SonarCloud** – Code quality
- **Jenkins** – Continuous integration

---

## 📁 Directory Structure

FlowPi/
├── client/ # React frontend
│ ├── public/ # Static assets
│ ├── src/ # Source files
│ │ ├── components/ # Reusable UI elements
│ │ ├── context/ # React context
│ │ ├── pages/ # App pages
│ │ ├── styles/ # CSS
│ │ └── App.js # App entry point
├── server/ # Node/Express backend
│ ├── config/ # Config files
│ ├── controllers/ # Route handlers
│ ├── models/ # DB schemas
│ ├── routes/ # API endpoints
│ └── server.js # Backend entry
├── docker-compose.yml # Docker config
├── .env.example # Env template
├── .gitignore # Git ignores
├── README.md # Project docs
└── package.json # Dependencies

---

## 🛠️ Getting Started

### ✅ Prerequisites

- Node.js (v22+)
- MongoDB (local/cloud)
- Docker (optional)
- Git

### 📦 Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/FlowPi.git
cd FlowPi

# Backend setup
cd server
npm install

# Frontend setup
cd ../client
npm install
⚙️ Environment Variables
Copy .env.example to .env in both server/ and client/ folders:
# server/.env
MONGO_URI=mongodb://localhost:27017/flowpi
JWT_SECRET=your_jwt_secret
PORT=5000

# client/.env
REACT_APP_API_URL=http://localhost:5000/api
Ensure MongoDB is running locally or via MongoDB Atlas.

▶️ Run Locally
🔧 Start Development Servers

# Start backend
cd server
npm run dev

# Start frontend
cd ../client
npm start
🐳 Docker Deployment
# Make sure Docker is installed
cd FlowPi
docker-compose up --build
Access:

Frontend: http://localhost:3000

API: http://localhost:5000/api
To stop containers:
docker-compose down
🔖 GitHub Topics
react • node-js • mongodb • artificial-intelligence
web-development • project-management • esprit-school
🙏 Acknowledgments
This project was developed under the guidance of the Software Engineering faculty at Esprit School of Engineering.

Special thanks to:

Professors and mentors

Fellow classmates and reviewers
🤝 Contributing
Contributions are welcome!

# Steps to contribute
1. Fork the repo
2. git checkout -b feature/your-feature
3. git commit -m "Add your feature"
4. git push origin feature/your-feature
5. Open a Pull Request
📬 Contact
📧 Email: flowpi@esprit.tn
🐛 Issues: Open one on GitHub


