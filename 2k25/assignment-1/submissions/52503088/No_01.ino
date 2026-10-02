int LED1= 13; //led1 pin
int LED2= 12; //led2 pin
int X= 1000;  // delay for first led
int Y= 3000;  //delay for 2nd led

void setup()
{
  pinMode(LED1, OUTPUT); // pin declear
  pinMode(LED2, OUTPUT);
}

void loop()
{
  digitalWrite(LED1, HIGH); //Blink LED1
  delay(500); 
  digitalWrite(LED1, LOW);
  delay(X);                 //wait Xs 
  digitalWrite(LED2, HIGH); //Bink LED2
  delay(500);
  digitalWrite(LED2, LOW);
  delay(Y);                 //wait Ys
}