# Privacy-Preserving Health Analytics
## Federated Learning for Disease Outbreak Prediction

A college lab project demonstrating federated learning concepts using OpenAI API.

## Quick Start

### Step 1 — Backend Setup

```bash
cd backend
pip install -r requirements.txt
# Add your OpenAI API key to .env
echo "OPENAI_API_KEY=sk-your-key-here" > .env
python app.py
```
Server runs at `http://localhost:5000`

### Step 2 — Frontend Setup

```bash
cd frontend
npm install
npm start
```
App runs at `http://localhost:3000`

## Usage Flow

1. Open `http://localhost:3000`
2. On the **Dashboard**, click **"Train Local Model"** for each hospital (A, B, C)
3. Click **"Run Federated Aggregation"**
4. Click **"Generate AI Prediction"**
5. Go to **Outbreak Map** to see regional risk visualization
6. Go to **AI Report** and click **"Generate Outbreak Report"**

## Architecture

```
/backend
  app.py           - Flask REST API
  federated.py     - FedAvg algorithm implementation
  encryption.py    - Paillier Homomorphic Encryption
  data/            - Synthetic hospital JSON data
/frontend/src
  App.jsx          - Main app with navigation
  components/
    Dashboard.jsx      - Main control panel
    HospitalNode.jsx   - Per-hospital training card
    OutbreakMap.jsx    - SVG India risk map
    ReportPanel.jsx    - AI markdown report viewer
```

## Privacy Flow

1. Each hospital trains a local model (data stays on-node)
2. Local weights encrypted using Paillier HE
3. Only encrypted weights sent to server
4. Server aggregates WITHOUT seeing raw data
5. Aggregated model used for outbreak prediction
6. AI (GPT-4o-mini) generates a surveillance report
