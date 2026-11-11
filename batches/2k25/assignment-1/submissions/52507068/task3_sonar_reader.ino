const byte trig_pin = 7;
const byte echo_pin = 2;

volatile unsigned long echostart = 0;
volatile unsigned long echoDuration = 0;
volatile bool measurementReady = false;

void echo_changed(){

  if(digitalRead(echo_pin)==HIGH){
    echostart = micros();
  }
  

  else{
    echoDuration = micros() - echostart;
    measurementReady = true;
  }
}



void setup() {
  Serial.begin(9600);


  pinMode(trig_pin, OUTPUT);
  pinMode(echo_pin, INPUT);

  digitalWrite(trig_pin,LOW);

  attachInterrupt(
    digitalPinToInterrupt(echo_pin),
    echo_changed,
    CHANGE
  );
}

void loop() {
  
  static unsigned long previoustrigger = 0;
  unsigned long now = millis();

  if(now - previoustrigger >=100){

    previoustrigger = now;

    digitalWrite(trig_pin, LOW);
    delayMicroseconds(2);

    digitalWrite(trig_pin, HIGH);
    delayMicroseconds(10);

    digitalWrite(trig_pin, LOW);


  }

  if(measurementReady){
    noInterrupts();

    unsigned long duration = echoDuration;
    measurementReady = false;

    interrupts();

    static unsigned long lastprint = 0;

    if(duration > 0 && millis() - lastprint >= 500){

      lastprint = millis();

      float distance =duration /58.0;

      Serial.print("Echo: ");
      Serial.print(duration);
      Serial.print(" microsecend | Distance: ");

      Serial.print(distance, 1);
      Serial.println(" cm");



    }
  }

}