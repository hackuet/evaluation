#include <Servo.h>

Servo myservo;

int angle = 0;
int direction = 1;

unsigned long previous_step = 0;
const unsigned long step_interval = 15;


void setup() {
  myservo.attach(9);


}

void loop() {
  
  unsigned long currenttime = millis();

  if(currenttime - previous_step >= step_interval){
    previous_step = currenttime;

    angle += direction;

    if(angle >= 180){
      angle = 180;
      direction = -1;

    }

    if(angle <= 0){
      angle = 0;
      direction = 1;

    }

    myservo.write(angle);


  }

}