const int led1 = 8;
const int led2 = 9;

unsigned long int previousled = 0;
unsigned long int previousled500 = 0;
unsigned long int previousled2000 = 0;

const unsigned long led_interval = 1000;
const unsigned long interval_500 = 500;
const unsigned long interval_2000 = 2000;

void setup(){

  pinMode(led1, OUTPUT);

  Serial.begin(9600);

}

void loop(){
  unsigned long currenttime = millis();

  //led
  if(currenttime - previousled >= led_interval){

    previousled = currenttime;

    digitalWrite(led1, !digitalRead(led1));
    digitalWrite(led2, !digitalRead(led2));


  }

  //led_500
  if(currenttime - previousled500 >= interval_500){
    previousled500 = currenttime;

    Serial.println("Task 2 is running");

  }

  if(currenttime - previousled2000 >= interval_2000){

    previousled2000 = currenttime;

    Serial.println("Task 3 is running");
 
  }
}