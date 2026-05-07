let mode = "auto"; // auto | manual
let pumpStatus = "off"; // on | off

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

// ---------- SETTINGS ----------
const DRY_THRESHOLD = 700;

// ---------- CHART DATA ----------
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
  }

  // ---------- PUMP ----------
  if (topic === "irrigation/pump") {
    pumpStatus = msg;
    console.log("Pump:", pumpStatus);
  }

  // ---------- SOIL ----------
  if (topic === "irrigation/soil") {
    const soil = parseInt(msg);

    if (isNaN(soil)) return;

    // update value
    if (soilEl) {
      soilEl.innerText = soil;
    }

    // ---------- LED CONTROL ----------
    if (RCircle && YCircle && GCircle) {
      // remove active classes
      RCircle.classList.remove("on-red");
      YCircle.classList.remove("on-yellow");
      GCircle.classList.remove("on-green");

      // add correct LED
      if (soil > 700) {
        RCircle.classList.add("on-red");
      } else if (soil > 500) {
        YCircle.classList.add("on-yellow");
      } else {
        GCircle.classList.add("on-green");
      }
    }

    // ---------- UPDATE CHART DIRECTLY ----------
    if (soilChart) {
      const currentTime = new Date().toLocaleTimeString();

      chartData.labels.push(currentTime);
      chartData.datasets[0].data.push(soil);

      if (chartData.labels.length > 20) {
        chartData.labels.shift();
        chartData.datasets[0].data.shift();
      }

      if (mode === "manual") {
        return;
      } else {
        soilChart.update();
      }
    }
  }

  // ---------- TEMP ----------
  if (topic === "irrigation/temp") {
    if (tempEl) {
      tempEl.innerText = `${msg} °C`;
    }
  }

  // ---------- HUMIDITY ----------
  if (topic === "irrigation/humidity") {
    if (humEl) {
      humEl.innerText = `${msg} %`;
    }
  }
});

// ---------- SEND MQTT ----------
function send(topic, msg) {
  if (client.connected) {
    client.publish(topic, msg);
    console.log("Sent:", topic, msg);
  } else {
    console.log("MQTT Not Connected");
  }
}
