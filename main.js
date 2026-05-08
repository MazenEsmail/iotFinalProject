import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getDatabase,
  ref,
  update,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// ---------- SYSTEM STATE ----------
let mode = "auto"; // auto | manual
let pumpStatus = "off"; // on | off

let currentTemp = null;
let currentHum = null;
let currentSoil = null;

// ---------- CHART DELAY VARIABLES ----------
let latestSoilValue = null;
let latestSoilTime = null;

// ---------- MQTT ----------
const client = mqtt.connect("wss://broker.hivemq.com:8884/mqtt");

// ---------- HTML ELEMENTS ----------
const soilEl = document.getElementById("soil");
const tempEl = document.getElementById("temp");
const humEl = document.getElementById("hum");

// ---------- LEDs ----------
const RCircle = document.getElementById("led-red");
const YCircle = document.getElementById("led-yellow");
const GCircle = document.getElementById("led-green");

// ---------- CHART ----------
const chartCanvas = document.getElementById("soilChart");

let soilChart = null;

const chartData = {
  labels: [],
  datasets: [
    {
      label: "Soil Moisture",
      data: [],
      borderColor: "#00ffcc",
      backgroundColor: "rgba(0,255,204,0.2)",
      borderWidth: 3,
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
  ],
};

// ---------- CREATE CHART ----------
if (chartCanvas) {
  const ctx = chartCanvas.getContext("2d");

  soilChart = new Chart(ctx, {
    type: "line",

    data: chartData,

    options: {
      responsive: true,
      maintainAspectRatio: false,

      scales: {
        y: {
          min: 0,
          max: 1200,

          ticks: {
            color: "white",
            font: {
              size: 14,
            },
          },

          grid: {
            color: "rgba(255,255,255,0.1)",
          },
        },

        x: {
          ticks: {
            color: "white",
            font: {
              size: 12,
            },
          },

          grid: {
            color: "rgba(255,255,255,0.05)",
          },
        },
      },

      plugins: {
        legend: {
          labels: {
            color: "white",
            font: {
              size: 15,
            },
          },
        },
      },
    },
  });
}

// ---------- MQTT CONNECT ----------
client.on("connect", () => {
  console.log("MQTT Connected");

  client.subscribe("irrigation/soil");
  client.subscribe("irrigation/temp");
  client.subscribe("irrigation/humidity");
  client.subscribe("irrigation/mode");
  client.subscribe("irrigation/pump");
});

// ---------- MQTT RECEIVE ----------
client.on("message", (topic, message) => {
  const msg = message.toString().trim().toLowerCase();

  // ---------- MODE ----------
  if (topic === "irrigation/mode") {
    mode = msg;

    console.log("Mode:", mode);

    updateFirebase();
  }

  // ---------- PUMP ----------
  if (topic === "irrigation/pump") {
    pumpStatus = msg;

    console.log("Pump:", pumpStatus);

    updateFirebase();
  }

  // ---------- SOIL ----------
  if (topic === "irrigation/soil") {
    const soil = parseInt(msg);

    if (isNaN(soil)) return;

    currentSoil = soil;

    // ---------- UPDATE TEXT ----------
    if (soilEl) {
      soilEl.innerText = soil;
    }

    // ---------- SAVE FOR CHART ----------
    latestSoilValue = soil;
    latestSoilTime = new Date().toLocaleTimeString();

    // ---------- LED CONTROL ----------
    if (RCircle && YCircle && GCircle) {

      RCircle.classList.remove("on-red");
      YCircle.classList.remove("on-yellow");
      GCircle.classList.remove("on-green");

      if (soil > 700) {
        RCircle.classList.add("on-red");

      } else if (soil > 500) {
        YCircle.classList.add("on-yellow");

      } else {
        GCircle.classList.add("on-green");
      }
    }

    updateFirebase();
  }

  // ---------- TEMPERATURE ----------
  if (topic === "irrigation/temp") {
    currentTemp = parseFloat(msg);

    if (tempEl) {
      tempEl.innerText = `${msg} °C`;
    }

    updateFirebase();
  }

  // ---------- HUMIDITY ----------
  if (topic === "irrigation/humidity") {
    currentHum = parseFloat(msg);

    if (humEl) {
      humEl.innerText = `${msg} %`;
    }

    updateFirebase();
  }
});

// ---------- CHART UPDATE EVERY 10 SECONDS ----------
setInterval(() => {

  if (!soilChart) return;

  if (mode === "manual") return;

  if (latestSoilValue === null) return;

  chartData.labels.push(latestSoilTime);
  chartData.datasets[0].data.push(latestSoilValue);

  // keep only last 20 points
  if (chartData.labels.length > 20) {
    chartData.labels.shift();
    chartData.datasets[0].data.shift();
  }

  soilChart.update();

}, 10000);

// ---------- SEND MQTT ----------
function send(topic, msg) {

  if (client.connected) {

    client.publish(topic, msg);

    console.log("Sent:", topic, msg);

  } else {

    console.log("MQTT Not Connected");
  }
}

// ---------- FIREBASE ----------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "iot-lab-7fd31.firebaseapp.com",
  databaseURL: "https://iot-lab-7fd31-default-rtdb.firebaseio.com",
  projectId: "iot-lab-7fd31",
  storageBucket: "iot-lab-7fd31.appspot.com",
  messagingSenderId: "41748807930",
  appId: "1:41748807930:web:e005453616461e7a494943",
};

const app = initializeApp(firebaseConfig);

const db = getDatabase(app);

const sensorRef = ref(db, "sensorData");

// ---------- UPDATE FIREBASE ----------
function updateFirebase() {

  update(sensorRef, {
    soil: Number(currentSoil),
    temp: Number(currentTemp),
    humidity: Number(currentHum),
    mode: mode,
    pump: pumpStatus,
    timestamp: Date.now(),
  });
}

// ---------- GLOBAL ----------
window.send = send;