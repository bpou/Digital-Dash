#include <Arduino.h>
#include <driver/twai.h>

// ESP32 CAN (TWAI) pins
constexpr gpio_num_t CAN_TX = GPIO_NUM_21; // CANTX
constexpr gpio_num_t CAN_RX = GPIO_NUM_22; // CANRX

// Trial bitrates (auto-cycling if no frames seen)
static const twai_timing_config_t kTimingTable[] = {
  TWAI_TIMING_CONFIG_500KBITS(),
  TWAI_TIMING_CONFIG_250KBITS(),
  TWAI_TIMING_CONFIG_125KBITS()
};
static const char* kTimingNames[] = {"500k", "250k", "125k"};
static const size_t kTimingCount = sizeof(kTimingTable) / sizeof(kTimingTable[0]);

// Test frame
constexpr uint32_t TEST_ID = 0x123;
constexpr uint32_t TEST_INTERVAL_MS = 500;
constexpr uint32_t LISTEN_ONLY_WINDOW_MS = 5000;
constexpr uint32_t RATE_SCAN_INTERVAL_MS = 15000;

size_t timingIndex = 0;
uint32_t lastTxMs = 0;
uint32_t lastRxMs = 0;
uint32_t lastRateSwitchMs = 0;
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
  lastRateSwitchMs = millis();
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

  Serial.println("ESP32 CAN comm test (TWAI)");
  Serial.println("Pins: TX=GPIO21 RX=GPIO22");
  Serial.println("Start in listen-only, then transmit test frames");

  installAndStart(kTimingTable[timingIndex]);
}

void loop() {
  // Receive
  twai_message_t rxMsg;
  if (twai_receive(&rxMsg, pdMS_TO_TICKS(10)) == ESP_OK) {
    lastRxMs = millis();
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

  uint32_t now = millis();

  // Switch from listen-only to normal mode after window
  if (listenOnly && (now - listenStartMs >= LISTEN_ONLY_WINDOW_MS)) {
    twai_stop();
    twai_driver_uninstall();

    twai_general_config_t g_config = TWAI_GENERAL_CONFIG_DEFAULT(CAN_TX, CAN_RX, TWAI_MODE_NORMAL);
    twai_timing_config_t t_config = kTimingTable[timingIndex];
    twai_filter_config_t f_config = TWAI_FILTER_CONFIG_ACCEPT_ALL();

    if (twai_driver_install(&g_config, &t_config, &f_config) == ESP_OK && twai_start() == ESP_OK) {
      listenOnly = false;
      Serial.print("SWITCHED to NORMAL @ ");
      Serial.println(kTimingNames[timingIndex]);
    } else {
      Serial.println("Failed to switch to NORMAL, retrying");
      twai_driver_uninstall();
      installAndStart(kTimingTable[timingIndex]);
    }
  }

  // Transmit test frame in normal mode
  if (!listenOnly && (now - lastTxMs >= TEST_INTERVAL_MS)) {
    lastTxMs = now;
    twai_message_t txMsg = {};
    txMsg.identifier = TEST_ID;
    txMsg.data_length_code = 8;
    txMsg.data[0] = 0xCA;
    txMsg.data[1] = 0xC0;
    txMsg.data[2] = (uint8_t)(now & 0xFF);
    txMsg.data[3] = (uint8_t)((now >> 8) & 0xFF);
    txMsg.data[4] = (uint8_t)((now >> 16) & 0xFF);
    txMsg.data[5] = (uint8_t)((now >> 24) & 0xFF);
    txMsg.data[6] = 0x55;
    txMsg.data[7] = 0xAA;

    if (twai_transmit(&txMsg, pdMS_TO_TICKS(10)) == ESP_OK) {
      Serial.println("TX OK");
    } else {
      Serial.println("TX FAIL");
    }
  }

  // If no RX for a while, cycle bitrate
  if (now - lastRateSwitchMs >= RATE_SCAN_INTERVAL_MS) {
    lastRateSwitchMs = now;
    size_t nextIndex = (timingIndex + 1) % kTimingCount;
    Serial.print("No RX, trying bitrate ");
    Serial.println(kTimingNames[nextIndex]);
    switchToTiming(nextIndex);
  }
}
