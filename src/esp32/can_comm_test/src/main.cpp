#include <Arduino.h>
#include <driver/twai.h>

// ESP32 CAN (TWAI) pins
constexpr gpio_num_t CAN_TX = GPIO_NUM_26; // CANTX
constexpr gpio_num_t CAN_RX = GPIO_NUM_27; // CANRX

// LED output (use GPIO2 / onboard LED on most dev boards)
constexpr uint8_t PIN_LIGHT_OUT = 2;

// CAN IDs
constexpr uint32_t TEST_ID = 0x123;
constexpr uint32_t LIGHT_ID = 0x321; // 1 byte payload: 01=on, 00=off

// Fixed bitrate for this test (500 kbps)
static const twai_timing_config_t kTimingTable[] = {TWAI_TIMING_CONFIG_500KBITS()};
static const char* kTimingNames[] = {"500k"};
static const size_t kTimingCount = sizeof(kTimingTable) / sizeof(kTimingTable[0]);

// Test frame
size_t timingIndex = 0;
uint32_t lastRxMs = 0;
uint32_t listenStartMs = 0;
bool listenOnly = true;

bool installAndStart(const twai_timing_config_t& timing) {
  twai_general_config_t g_config = TWAI_GENERAL_CONFIG_DEFAULT(CAN_TX, CAN_RX, TWAI_MODE_LISTEN_ONLY);
  twai_timing_config_t t_config = timing;
  twai_filter_config_t f_config = TWAI_FILTER_CONFIG_ACCEPT_ALL();

  if (twai_driver_install(&g_config, &t_config, &f_config) != ESP_OK) {
    Serial.println("TWAI install failed");
    return false;
  }
  if (twai_start() != ESP_OK) {
    Serial.println("TWAI start failed");
    twai_driver_uninstall();
    return false;
  }

  listenOnly = true;
  listenStartMs = millis();
  lastRxMs = 0;
  Serial.print("TWAI started in LISTEN_ONLY @ ");
  Serial.println(kTimingNames[timingIndex]);
  return true;
}

void stopTwai() {
  twai_stop();
  twai_driver_uninstall();
}

void switchToTiming(size_t newIndex) {
  stopTwai();
  timingIndex = newIndex;
  installAndStart(kTimingTable[timingIndex]);
}

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(PIN_LIGHT_OUT, OUTPUT);
  digitalWrite(PIN_LIGHT_OUT, LOW);

  Serial.println("ESP32 CAN comm test (TWAI)");
  Serial.println("Pins: TX=GPIO21 RX=GPIO22");
  Serial.println("Light: GPIO2 (ON when CAN 0x321 payload 01)");
  Serial.println("Listen-only CAN RX (no transmit)");

  installAndStart(kTimingTable[timingIndex]);
}

void loop() {
  // Receive
  twai_message_t rxMsg;
  if (twai_receive(&rxMsg, pdMS_TO_TICKS(10)) == ESP_OK) {
    lastRxMs = millis();
    if (rxMsg.identifier == LIGHT_ID && rxMsg.data_length_code >= 1) {
      const bool lightOn = rxMsg.data[0] == 0x01;
      digitalWrite(PIN_LIGHT_OUT, lightOn ? HIGH : LOW);
    }

    Serial.print("RX ID=0x");
    Serial.print(rxMsg.identifier, HEX);
    Serial.print(" DLC=");
    Serial.print(rxMsg.data_length_code);
    Serial.print(" DATA=");
    for (int i = 0; i < rxMsg.data_length_code; ++i) {
      if (rxMsg.data[i] < 16) Serial.print("0");
      Serial.print(rxMsg.data[i], HEX);
      Serial.print(" ");
    }
    Serial.println();
  }

}
