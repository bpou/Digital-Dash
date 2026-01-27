/*
  TURN SIGNAL FLASHER (ESP32)
  Pin map:
    LEFT_REQUEST   -> GPIO 32 (input, active HIGH)
    RIGHT_REQUEST  -> GPIO 33 (input, active HIGH)
    HAZARD_REQUEST -> GPIO 25 (input, active HIGH)
    LEFT_LAMP_OUT  -> GPIO 26 (output)
    RIGHT_LAMP_OUT -> GPIO 27 (output)

  MQTT topics:
    car/state/turn/mode   (retained)  "off" | "left" | "right" | "hazard"
    car/state/turn/left   (retained)  0|1
    car/state/turn/right  (retained)  0|1
    car/event/turn/click  (event)     {"side":"left"|"right"|"hazard","ts":<ms>}

  WiFi / MQTT config:
    - Update WIFI_SSID/WIFI_PASS below
    - MQTT broker: MQTT_HOST/MQTT_PORT (defaults to 192.168.1.50:1883)

  Bench wiring notes:
    - Inputs are assumed 3.3V logic (already conditioned)
    - Outputs drive external MOSFET/high-side drivers (do not drive 12V directly)
*/

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>

constexpr uint8_t PIN_LEFT_REQ = 32;
constexpr uint8_t PIN_RIGHT_REQ = 33;
constexpr uint8_t PIN_HAZARD_REQ = 25;
constexpr uint8_t PIN_LEFT_OUT = 26;
constexpr uint8_t PIN_RIGHT_OUT = 27;

constexpr unsigned long DEBOUNCE_MS = 20;
constexpr unsigned long FLASH_ON_MS = 330;
constexpr unsigned long FLASH_OFF_MS = 330;

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* MQTT_HOST = "192.168.1.50";
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

unsigned long phaseStartMs = 0;
bool phaseOn = false;
String currentMode = "off";

bool readDebounced(DebounceInput& input, uint8_t pin) {
  bool reading = digitalRead(pin) == HIGH;
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

void setupWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

void reconnectMqtt() {
  if (mqttClient.connected()) return;
  mqttClient.connect("turn_flasher");
}

void setup() {
  pinMode(PIN_LEFT_REQ, INPUT);
  pinMode(PIN_RIGHT_REQ, INPUT);
  pinMode(PIN_HAZARD_REQ, INPUT);
  pinMode(PIN_LEFT_OUT, OUTPUT);
  pinMode(PIN_RIGHT_OUT, OUTPUT);

  updateOutputs(false, false);

  Serial.begin(115200);
  setupWifi();
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);

  phaseStartMs = millis();
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    reconnectMqtt();
    mqttClient.loop();
  }

  bool leftRequested = readDebounced(leftReq, PIN_LEFT_REQ);
  bool rightRequested = readDebounced(rightReq, PIN_RIGHT_REQ);
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

  if (mqttClient.connected()) {
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
