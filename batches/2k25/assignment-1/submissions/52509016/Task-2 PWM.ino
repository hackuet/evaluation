#define PWM_PERIOD_US 2000UL
#define LED_PIN 9

void pwm(uint8_t pin, uint8_t value) {
  unsigned long pos = micros() % PWM_PERIOD_US;
  unsigned long onTime = (unsigned long)value * PWM_PERIOD_US / 255;
  digitalWrite(pin, (pos < onTime) ? HIGH : LOW);
}

uint8_t brightness = 0;
int step = 1;
unsigned long lastUpdate = 0;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  if (millis() - lastUpdate >= 10) {
    lastUpdate = millis();
    brightness += step;
    if (brightness == 0 || brightness == 255) step = -step;
  }

  pwm(LED_PIN, brightness);
}
