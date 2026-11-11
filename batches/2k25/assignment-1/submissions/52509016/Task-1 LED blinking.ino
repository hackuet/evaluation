#define LED1_PIN 8 // LED 1 connected to digital pin 8
#define LED2_PIN 9 // LED 2 connected to digital pin 9

// Change these values: blink intervals in seconds
const unsigned long X_SECONDS = 1; // LED 1 toggles every x seconds
const unsigned long Y_SECONDS = 3; // LED 2 toggles every y seconds

const unsigned long xInterval = X_SECONDS * 1000UL; // convert to ms
const unsigned long yInterval = Y_SECONDS * 1000UL;

unsigned long previousMillis1 = 0;
unsigned long previousMillis2 = 0;

int led1State = LOW;
int led2State = LOW;

void setup() {
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
}

void loop() {
  unsigned long currentMillis = millis();

  // LED 1: toggle every x seconds
  if (currentMillis - previousMillis1 >= xInterval) {
    previousMillis1 = currentMillis;
    led1State = (led1State == LOW) ? HIGH : LOW;
    digitalWrite(LED1_PIN, led1State);
  }

  // LED 2: toggle every y seconds
  if (currentMillis - previousMillis2 >= yInterval) {
    previousMillis2 = currentMillis;
    led2State = (led2State == LOW) ? HIGH : LOW;
    digitalWrite(LED2_PIN, led2State);
  }
}
