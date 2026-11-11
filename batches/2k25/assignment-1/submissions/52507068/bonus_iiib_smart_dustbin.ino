#include <Servo.h>

//for HC-SR04 Ultrasonic pins
const byte trig_pin = 7;
const byte echo_pin = 2;



//For servo signal pins
const byte servo_pin = 9;


//For dustbin settings
const float open_distance_in_cm = 20.0;
const unsigned long close_lid_for_delay_in_ms = 5000;


Servo lidServo;


bool lid_open = false;
unsigned long last_detection_time = 0;
unsigned long last_measurement_time = 0;


void setup() {

  Serial.begin(9600);

  pinMode(trig_pin, OUTPUT);
  pinMode(echo_pin,INPUT);

  digitalWrite(trig_pin, LOW);

  lidServo.attach(servo_pin);
  lidServo.write(0);

  Serial.println("Smart Dustbin is Now Ready to Use!");
  //println for creating a newline after the output
}

void loop() {
  unsigned long now = millis();


//For measuring distance every 100 mili seconds
  if(now - last_measurement_time >= 1000){

    last_measurement_time = now;

    //Now, send the ultrasonic triggered pulse
    digitalWrite(trig_pin, LOW);
    delayMicroseconds(2);

    digitalWrite(trig_pin, HIGH);
    delayMicroseconds(10);

    digitalWrite(trig_pin, LOW);


    //Reading the echo pulse
    unsigned long duration = pulseIn(echo_pin, HIGH, 30000UL);

    if(duration > 0){
      float distance_cm = duration / 58.0;

      Serial.print("Distance: ");
      Serial.print(distance_cm,1);
      Serial.println(" (cm)");



      //Opening lid when any object is near to the dustbin
      if(distance_cm <= open_distance_in_cm){
        
        last_detection_time = now;

        if(!lid_open){
          lidServo.write(90);
          lid_open = true;
          Serial.println("Lid Open Now!");

        }
      
      }

    }
  }

  //Close lid after the object goes beyond 20 cm

  if(lid_open && now - last_detection_time >= close_lid_for_delay_in_ms){
    lidServo.write(0);
    lid_open = false;
    Serial.println("Lid Closed!");
  }

}