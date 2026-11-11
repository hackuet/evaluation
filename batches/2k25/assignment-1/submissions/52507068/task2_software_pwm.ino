const int led = 9;


const unsigned long pwm_period = 200000; //micro seconds

//the unnatural pwm_period has been set to observe better 
int brightness = 200;


void setup() {

  pinMode(led,OUTPUT);

}

void loop() {
  
  unsigned long elapsed = micros() % pwm_period;

  unsigned long ontime = (pwm_period * (unsigned long) brightness)/255; //0~255 
 //if  pwm_period is divided by brightness, then compilation takes a long long time

  //software pw,
  if(elapsed < ontime){
    digitalWrite(led, HIGH);
  }
  else{
    digitalWrite(led, LOW);
  }
}