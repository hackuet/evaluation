const int LED1=8;
const int LED2=9;

unsigned long previousled1=0;
unsigned long previousled2=0;

const unsigned long intervalled1=100, intervalled2=500;

bool ledstate1=0, ledstate2=0;



void setup() {

  pinMode(LED1,OUTPUT);
  pinMode(LED2,OUTPUT);


}

void loop() {
  unsigned long currentTime=millis();

  //for led1
  if(currentTime-previousled1 >= intervalled1){

    previousled1 = currentTime;

    ledstate1=!ledstate1;

    digitalWrite(LED1,ledstate1);
   }


   //for led2
   if(currentTime-previousled2 >=intervalled2){

    previousled2=currentTime;
    ledstate2=!ledstate2;
    digitalWrite(LED2,ledstate2);
   
   }

}