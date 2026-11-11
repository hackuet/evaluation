const int led1 = 12;
const int led2 = 10;



void setup() {
  pinMode(led1, OUTPUT);
  pinMode(led2, OUTPUT);

}

void loop() {
  
  analogWrite(led1, 64);
  analogWrite(led2, 255);

}