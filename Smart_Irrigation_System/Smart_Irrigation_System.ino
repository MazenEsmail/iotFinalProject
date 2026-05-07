#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// ---------- WIFI ----------
const char* ssid = "Mazen";
const char* password = "00000000";

// ---------- MQTT ----------
const char* mqtt_server = "broker.hivemq.com";

WiFiClient espClient;
PubSubClient client(espClient);

// ---------- PINS ----------
#define SOIL_SENSOR A0
#define RELAY_PIN D1

#define DHTPIN D2
#define DHTTYPE DHT11

#define GREEN_LED D5

#define YELLOW_LED D6
#define RED_LED D7

DHT dht(DHTPIN, DHTTYPE);

// ---------- STATES ----------
String mode = "AUTO";
String pumpState = "OFF";

// ---------- WIFI ----------
void setup_wifi() {
  WiFi.begin(ssid, password);

  Serial.print("Connecting");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected!");
}

// ---------- MQTT CALLBACK ----------
void callback(char* topic, byte* payload, unsigned int length) {

  String msg = "";

  for (int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }

  Serial.print("Msg: ");
  Serial.println(msg);

  if (String(topic) == "irrigation/mode") {
    mode = msg;
  }

  if (String(topic) == "irrigation/pump") {
    pumpState = msg;
  }
}

// ---------- RECONNECT ----------
void reconnect() {
  while (!client.connected()) {
    Serial.print("MQTT connecting...");

    if (client.connect("ESP8266_Irrigation")) {
      Serial.println("connected");

      client.subscribe("irrigation/mode");
      client.subscribe("irrigation/pump");

    } else {
      Serial.print("failed ");
      Serial.println(client.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(9600);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // OFF

  pinMode(GREEN_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);

  dht.begin();

  setup_wifi();

  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void loop() {

  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  int soil = analogRead(SOIL_SENSOR);
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  Serial.println("------");
  Serial.print("Mode: "); Serial.println(mode);
  Serial.print("Soil: "); Serial.println(soil);

  // ---------- AUTO MODE ----------
  if (mode == "AUTO") {

    if (soil > 700) {
      // DRY
      Serial.println("Status: DRY");

      digitalWrite(RELAY_PIN, HIGH); // ON
      delay(2000);
      digitalWrite(RELAY_PIN,LOW);

      digitalWrite(RED_LED, HIGH);
      digitalWrite(YELLOW_LED, LOW);
      digitalWrite(GREEN_LED, LOW);
    }

    else if (soil > 500) {
      // MEDIUM
      Serial.println("Status: MEDIUM");

      digitalWrite(RELAY_PIN, LOW); // OFF

      digitalWrite(RED_LED, LOW);
      digitalWrite(YELLOW_LED, HIGH);
      digitalWrite(GREEN_LED, LOW);
    }

    else {
      // VERY WET
      Serial.println("Status: VERY WET");

      digitalWrite(RELAY_PIN, LOW); // OFF

      digitalWrite(RED_LED, LOW);
      digitalWrite(YELLOW_LED, LOW);
      digitalWrite(GREEN_LED, HIGH);
    }
  }

  // ---------- MANUAL MODE ----------
  else {
    digitalWrite(RED_LED, LOW);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(GREEN_LED, LOW);
    if (pumpState == "ON") {
      digitalWrite(RELAY_PIN, HIGH);
      delay(2000);
      digitalWrite(RELAY_PIN,LOW);
    } else {
      digitalWrite(RELAY_PIN, LOW);
    }
  }

  // ---------- SEND DATA ----------
  client.publish("irrigation/soil", String(soil).c_str());
  client.publish("irrigation/temp", String(temp).c_str());
  client.publish("irrigation/humidity", String(hum).c_str());

  delay(2000);
}