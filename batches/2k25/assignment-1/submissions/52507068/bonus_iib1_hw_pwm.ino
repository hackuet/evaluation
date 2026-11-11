struct pwmled{
  int pin;
  int brightness;
  int direction;

};

pwmled leds[]= {
  {9,0,1},
  {10,0,1}
};

const int ledcount = sizeof(leds) / sizeof(leds[0]);
const unsigned long pwm_period = 2000UL; //microseconds, 2000 mcs = 500Hz

unsigned long previous_animation = 0;
const unsigned long animation_interval = 10;



void setup(){

  for(int i =0; i < ledcount; i++){
    pinMode(leds[i].pin, OUTPUT);
  }

}

void loop(){
  unsigned long elapsed = micros() % pwm_period;
  unsigned long currenttime = millis();

  


  if (currenttime - previous_animation >= animation_interval){
    previous_animation = currenttime;
    
    for(int i=0; i < ledcount; i++){

    if(leds[i].brightness >= 255){

      leds[i].brightness = 255;
      leds[i].direction = -1;
      
      
    }

    if (leds[i].brightness <= 0){
      leds[i].brightness = 0;
      leds[i].direction = 1;
    }

  if(leds[i].direction == 1){
    
    leds[i].brightness++;
    //digitalWrite(leds[i].pin, HIGH);

  }
  else{
    leds[i].brightness--;
    //digitalWrite(leds[i].pin, LOW);
  }

    //update direction and brightness for every led
  }
  
}
  for(int i=0; i < ledcount; i++)
  {
    int brightness = constrain(leds[i].brightness,0,255);

    unsigned long ontime = (pwm_period * (unsigned long) brightness) / 255UL;

    if(elapsed < ontime){
      digitalWrite(leds[i].pin,HIGH);
    }

    else{
      digitalWrite(leds[i].pin,LOW);
    }

  }


}