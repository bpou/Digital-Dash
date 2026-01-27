/*
  TURN SIGNAL FLASHER (ESP32) - FIXED

  Pin map:
    LEFT_REQUEST   -> GPIO 34 (input, active HIGH)  (input-only, no internal pulls)
    RIGHT_REQUEST  -> GPIO 35 (input, active HIGH)  (input-only, no internal pulls)
    HAZARD_REQUEST -> GPIO 39 (input, active HIGH)  (input-only, no internal pulls)
    LEFT_LAMP_OUT  -> GPIO 26 (output)
    RIGHT_LAMP_OUT -> GPIO 27 (output)

  MQTT topics:
    car/state/turn/mode   (retained)  "off" | "left" | "right" | "hazard"
    car/state/turn/left   (retained)  0|1
    car/state/turn/right  (retained)  0|1
    car/event/turn/click  (event)     {"side":"left"|"right"|"hazard","ts":<ms>}

  Notes:
    - GPIO 34/35/39 have NO internal pullups/pulldowns. You must use external pull resistors
      or a real 3.3V driven signal, otherwise readings may float.
*/

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>

// Input-only pins (no internal pullups): 34/35/36/39
constexpr uint8_t PIN_LEFT_REQ   = 34;
constexpr uint8_t PIN_RIGHT_REQ  = 35;
constexpr uint8_t PIN_HAZARD_REQ = 39;

// Outputs
constexpr uint8_t PIN_LEFT_OUT  = 26;
constexpr uint8_t PIN_RIGHT_OUT = 27;

constexpr unsigned long DEBOUNCE_MS  = 20;
constexpr unsigned long FLASH_ON_MS  = 330;
constexpr unsigned long FLASH_OFF_MS = 330;

// ✅ FIX: remove accidental leading space in SSID
const char* WIFI_SSID = "Prt 2.4";
const char* WIFI_PASS = "megahoppa";

// Your Pi broker IP on home WiFi
const char* MQTT_HOST = "192.168.50.92";
const uint16_t MQTT_PORT = 1883;

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

struct DebounceInput {
  bool stableState = false;
  bool lastReading = false;
  unsigned long lastChangeMs = 0;
};

DebounceInput leftReq;
DebounceInput rightReq;
DebounceInput hazardReq;

bool leftLamp = false;
bool rightLamp = false;
bool lastLeftLamp = false;
bool lastRightLamp = false;
bool publishedBootState = false;

unsigned long phaseStartMs = 0;
bool phaseOn = false;
String currentMode = "off";

unsigned long lastReportMs = 0;
unsigned long lastMqttAttemptMs = 0;

bool readDebounced(DebounceInput& input, uint8_t pin) {
  bool reading = (digitalRead(pin) == HIGH);
  if (reading != input.lastReading) {
    input.lastChangeMs = millis();
    input.lastReading = reading;
  }
  if (millis() - input.lastChangeMs > DEBOUNCE_MS) {
    input.stableState = input.lastReading;
  }
  return input.stableState;
}

void publishRetained(const char* topic, const String& payload) {
  mqttClient.publish(topic, payload.c_str(), true);
}

void publishClickEvent(const char* side) {
  String payload = String("{\"side\":\"") + side + "\",\"ts\":" + String(millis()) + "}";
  mqttClient.publish("car/event/turn/click", payload.c_str(), false);
}

void updateOutputs(bool leftOn, bool rightOn) {
  leftLamp = leftOn;
  rightLamp = rightOn;
  digitalWrite(PIN_LEFT_OUT, leftLamp ? HIGH : LOW);
  digitalWrite(PIN_RIGHT_OUT, rightLamp ? HIGH : LOW);
}

// ✅ FIX: proper WiFi connect loop + logging
bool setupWifi(unsigned long timeoutMs = 15000) {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);

  Serial.print("Starting WiFi (SSID='");
  Serial.print(WIFI_SSID);
  Serial.println("')...");

  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < timeoutMs) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  wl_status_t st = WiFi.status();
  Serial.print("WiFi status: ");
  Serial.println((int)st);

  if (st == WL_CONNECTED) {
    Serial.println("WiFi CONNECTED");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Gateway: ");
    Serial.println(WiFi.gatewayIP());
    return true;
  } else {
    Serial.println("WiFi FAILED (check 2.4GHz + SSID spelling + router security)");
    return false;
  }
}

// ✅ FIX: MQTT reconnect with return code + backoff + prints
void reconnectMqtt() {
  if (mqttClient.connected()) return;

  // backoff: try at most every 2 seconds
  if (millis() - lastMqttAttemptMs < 2000) return;
  lastMqttAttemptMs = millis();

  Serial.print("MQTT connecting to ");
  Serial.print(MQTT_HOST);
  Serial.print(":");
  Serial.print(MQTT_PORT);
  Serial.print(" ... ");

  // unique client id helps if you flash multiple times
  String clientId = String("turn_flasher_") + String((uint32_t)ESP.getEfuseMac(), HEX);

  bool ok = mqttClient.connect(clientId.c_str());
  if (ok) {
    Serial.println("OK");
    publishedBootState = false; // force republish after reconnect
  } else {
    Serial.print("FAIL rc=");
    Serial.println(mqttClient.state());
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(PIN_LEFT_REQ, INPUT);
  pinMode(PIN_RIGHT_REQ, INPUT);
  pinMode(PIN_HAZARD_REQ, INPUT);

  pinMode(PIN_LEFT_OUT, OUTPUT);
  pinMode(PIN_RIGHT_OUT, OUTPUT);

  updateOutputs(false, false);

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);

  // ✅ Connect WiFi (blocking for a short time)
  setupWifi();

  phaseStartMs = millis();
}

void loop() {
  // Keep WiFi alive; if it drops, try reconnect
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastWifiRetryMs = 0;
    if (millis() - lastWifiRetryMs > 3000) {
      lastWifiRetryMs = millis();
      setupWifi(8000);
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    reconnectMqtt();
    mqttClient.loop();
  }

  bool leftRequested   = readDebounced(leftReq, PIN_LEFT_REQ);
  bool rightRequested  = readDebounced(rightReq, PIN_RIGHT_REQ);
  bool hazardRequested = readDebounced(hazardReq, PIN_HAZARD_REQ);

  String nextMode = "off";
  if (hazardRequested || (leftRequested && rightRequested)) {
    nextMode = "hazard";
  } else if (leftRequested) {
    nextMode = "left";
  } else if (rightRequested) {
    nextMode = "right";
  }

  if (nextMode != currentMode) {
    currentMode = nextMode;
    phaseOn = false;
    phaseStartMs = millis();
    publishedBootState = false;

    if (mqttClient.connected()) {
      publishRetained("car/state/turn/mode", currentMode);
    }
  }

  unsigned long phaseElapsed = millis() - phaseStartMs;
  unsigned long phaseDuration = phaseOn ? FLASH_ON_MS : FLASH_OFF_MS;
  if (phaseElapsed >= phaseDuration) {
    phaseOn = !phaseOn;
    phaseStartMs = millis();
  }

  bool leftOn = false;
  bool rightOn = false;

  if (currentMode == "left") {
    leftOn = phaseOn;
  } else if (currentMode == "right") {
    rightOn = phaseOn;
  } else if (currentMode == "hazard") {
    leftOn = phaseOn;
    rightOn = phaseOn;
  }

  updateOutputs(leftOn, rightOn);

  // serial debug every 200ms
  if (millis() - lastReportMs >= 200) {
    lastReportMs = millis();
    Serial.print("MODE:");
    Serial.print(currentMode);
    Serial.print(" | IN L:");
    Serial.print(leftRequested ? "HIGH" : "LOW");
    Serial.print(" R:");
    Serial.print(rightRequested ? "HIGH" : "LOW");
    Serial.print(" H:");
    Serial.print(hazardRequested ? "HIGH" : "LOW");
    Serial.print(" | RAW L:");
    Serial.print(digitalRead(PIN_LEFT_REQ));
    Serial.print(" R:");
    Serial.print(digitalRead(PIN_RIGHT_REQ));
    Serial.print(" H:");
    Serial.print(digitalRead(PIN_HAZARD_REQ));
    Serial.print(" | MQTT:");
    Serial.println(mqttClient.connected() ? "UP" : "DOWN");
  }

  if (mqttClient.connected()) {
    if (!publishedBootState) {
      publishRetained("car/state/turn/mode", currentMode);
      publishRetained("car/state/turn/left", leftLamp ? "1" : "0");
      publishRetained("car/state/turn/right", rightLamp ? "1" : "0");
      publishedBootState = true;
    }

    if (leftLamp != lastLeftLamp) {
      publishRetained("car/state/turn/left", leftLamp ? "1" : "0");
      if (!lastLeftLamp && leftLamp) {
        publishClickEvent(currentMode == "hazard" ? "hazard" : "left");
      }
      lastLeftLamp = leftLamp;
    }

    if (rightLamp != lastRightLamp) {
      publishRetained("car/state/turn/right", rightLamp ? "1" : "0");
      if (!lastRightLamp && rightLamp) {
        publishClickEvent(currentMode == "hazard" ? "hazard" : "right");
      }
      lastRightLamp = rightLamp;
    }
  }
}
