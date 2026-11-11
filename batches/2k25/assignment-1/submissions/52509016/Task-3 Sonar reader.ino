const uint8_t TRIG = 3;
const uint8_t ECHO = 2;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  digitalWrite(TRIG, LOW);
}

void loop() {
  // send trigger pulse
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  // Measure echo duration
  unsigned long duration = pulseIn(ECHO, HIGH, 30000);

  if (duration > 0) {
    float cm = duration * 0.0343 / 2.0;
    Serial.print("Distance: ");
    Serial.print(cm);
    Serial.println(" cm");
    digitalWrite(LED_BUILTIN, cm < 20 ? HIGH : LOW);
  } else {
    Serial.println("No echo received");
  }
  delay(100);
}
