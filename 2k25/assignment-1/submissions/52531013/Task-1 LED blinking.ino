const int ledpin1=8;
const int ledpin2=9;

unsigned long X=2000;
unsigned long Y=5000;

unsigned long previoustime1 =0;
unsigned long previoustime2 =0;

bool ledstate1=LOW;
bool ledstate2=LOW;

void setup(){
  pinMode(ledpin1,OUTPUT);
  pinMode(ledpin2,OUTPUT);
}

void loop(){
  unsigned long int current_time = millis();

 //LED1 blink in X sec interval;;
  if(current_time-previoustime1>=X){
      ledstate1 = !ledstate1;
      digitalWrite(ledpin1,ledstate1);
      previoustime1=current_time;
  }

//LED2 blink in Y sec interval
  if(current_time-previoustime2>=Y){
    ledstate2 = !ledstate2;
    digitalWrite(ledpin2,ledstate2);
    previoustime2 = current_time;
  }
}
